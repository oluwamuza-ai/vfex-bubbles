import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// HOW TO USE THIS SCRIPT
// ---------------------------------------------------------------------------
// 1. Download today's PDF from MMC Capital and save it in this same folder
//    as "today-pricesheet.pdf" (replacing yesterday's).
// 2. Run:   node mmc-update.js
//
// It reads the PDF directly — no copy-pasting needed — and updates BOTH:
//   - vfex-data.json / vfex-history.json   (the VFEX US$m section)
//   - zse-data.json  / zse-history.json    (the main ZSE equities section)
//
// This source gives REAL market caps (reported by MMC), not the old
// price-based placeholder — so records from this script are marked
// estimated: false.
//
// CURRENCY NOTE: the ZSE section's prices are labelled "(Cents)" in the
// source PDF — these are almost certainly local-currency (ZWG) cents, NOT
// USD. This script stores them exactly as printed, unconverted. The app's
// "$" price prefix will be misleading for ZSE until this is resolved —
// worth confirming the correct currency/scaling with MMC or your own
// knowledge of the ZSE before trusting displayed ZSE prices.
// ---------------------------------------------------------------------------

const PDF_FILE = path.join(__dirname, process.argv[2] || 'today-pricesheet.pdf');

const VFEX_DATA_FILE = path.join(__dirname, 'vfex-data.json');
const VFEX_HISTORY_FILE = path.join(__dirname, 'vfex-history.json');
const ZSE_DATA_FILE = path.join(__dirname, 'zse-data.json');
const ZSE_HISTORY_FILE = path.join(__dirname, 'zse-history.json');

// Section start/end markers as they appear verbatim in the PDF text.
const SECTION_MARKERS = {
  zseStart: 'Market Cap ($m)',       // last line of the (wrapped) ZSE header — equities start right after
  zseEnd: 'Exchange Traded Funds (ETFs)',
  vfexStart: 'VFEX US$m',
  vfexEnd: 'Exchange traded funds (ETFS) VFEX',
};

function isNumericToken(token) {
  return /^-$|^-?[\d,]+(\.\d+)?%?$/.test(token);
}

function parseNumber(token) {
  if (token === '-' || token === undefined) return null;
  return Number.parseFloat(token.replace(/,/g, '').replace('%', ''));
}

// Parses one company row. Column count varies (8 down to 5 tokens) because
// the source PDF fully OMITS the Absolute Change / Percentage Change cells
// (not even a "-") when a counter didn't trade — see the long comment block
// in the project notes. This walks the row from the right, since Market Cap
// is always the last token and is the most reliable anchor.
function parseCompanyRow(line) {
  const tokens = line.trim().split(/\s+/);

  const values = [];
  let splitIndex = tokens.length;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (isNumericToken(tokens[i])) {
      values.unshift(tokens[i]);
      splitIndex = i;
    } else {
      break;
    }
  }

  const name = tokens.slice(0, splitIndex).join(' ').trim();
  if (!name || values.length < 5) return null; // not a real company row (e.g. a totals line)

  const marketCapM = parseNumber(values[values.length - 1]);
  const withoutCap = values.slice(0, -1);

  const opening = parseNumber(withoutCap[0]);
  const lastTraded = parseNumber(withoutCap[1]);
  // withoutCap[2] = VWAP, withoutCap[3] = Volume — not currently used downstream
  // withoutCap[4] = Value traded — not currently used downstream

  const trailing = withoutCap.slice(5); // 0, 1, or 2 entries: [AbsChange?, PctChange?]
  let absChange = null;
  let pctChange = null;
  if (trailing.length === 2) {
    absChange = parseNumber(trailing[0]);
    pctChange = parseNumber(trailing[1]);
  } else if (trailing.length === 1) {
    if (trailing[0].includes('%')) pctChange = parseNumber(trailing[0]);
    else absChange = parseNumber(trailing[0]);
  }

  // null (not 0) when a counter simply didn't trade that day — both
  // "Opening" and "Last Traded" print as "-" in the PDF for a no-trade day,
  // and a stock's price doesn't become $0 just because it didn't trade.
  // buildRecords carries forward the last known real price for these.
  const closingPrice = lastTraded ?? opening ?? null;
  let change = pctChange;
  if (change === null && absChange !== null && opening) {
    change = Number(((absChange / opening) * 100).toFixed(2));
  }
  if (change === null) change = 0;

  if (marketCapM === null || (closingPrice !== null && Number.isNaN(closingPrice))) return null;

  return {
    name,
    closingPrice,
    change,
    marketCap: Math.round(marketCapM * 1_000_000), // "$m" -> raw dollar figure
  };
}

function extractSection(lines, startMarker, endMarker) {
  const records = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!inSection) {
      if (line === startMarker || line.endsWith(startMarker)) inSection = true;
      continue;
    }

    if (line === endMarker || line.startsWith(endMarker)) break;
    if (line.toUpperCase().startsWith('TOTAL')) continue;

    const parsed = parseCompanyRow(line);
    if (parsed) records.push(parsed);
    else console.warn(`  Skipped unparseable row: "${line}"`);
  }

  return records;
}

function titleCase(name) {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugTicker(name, suffix) {
  const firstWord = name.split(/\s+/)[0] || 'UNKNOWN';
  return `${firstWord.toUpperCase().slice(0, 5)}.${suffix}`;
}

// MMC's own source PDFs aren't perfectly consistent — the same company can
// appear as "... Holdings Limited" in one day's PDF and "... Holdings Ltd"
// in another (confirmed in testing). An exact-string name match would
// treat those as two different companies, silently dropping the ticker
// and logoUrl you'd already set up. Stripping common corporate-suffix
// words and punctuation down to a compact core key makes matching robust
// to this — same approach used in batch-import-history.js.
function normalizeNameKey(name) {
  return name
    .toLowerCase()
    .replace(/\bdepository receipts\b/g, '')
    .replace(/\b(limited|ltd|plc|holdings|corporation|corp|company|co|vx|zdrs|zimbabwe)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Preserves ticker + logoUrl + last known price from the existing data
// file, matched by a normalized company name, so re-running this daily
// never makes you re-map tickers or re-source logos for companies you've
// already set up — and so a no-trade day can carry forward a real price
// instead of falling back to a fabricated $0.
function loadExistingLookup(dataFile) {
  if (!fs.existsSync(dataFile)) return {};
  try {
    const existing = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const lookup = {};
    for (const record of existing) {
      const key = normalizeNameKey(record.name);
      lookup[key] = { ticker: record.ticker, logoUrl: record.logoUrl, closingPrice: record.closingPrice };
    }
    return lookup;
  } catch (error) {
    console.warn(`Could not read existing ${path.basename(dataFile)} for ticker/logo lookup.`, error.message);
    return {};
  }
}

function buildRecords(parsedRows, dataFile, tickerSuffix) {
  const lookup = loadExistingLookup(dataFile);
  const unmatched = [];
  const usedTickers = new Set(
    Object.values(lookup).map((entry) => entry.ticker).filter(Boolean)
  );

  const records = parsedRows.map((row) => {
    const existing = lookup[normalizeNameKey(row.name)];

    let ticker = existing?.ticker;
    if (!ticker) {
      let candidate = slugTicker(row.name, tickerSuffix);
      // Guard against two different companies guessing the same ticker
      // (e.g. "Zimbabwe Newspapers" and "Zimbabwe Stock Exchange Holdings"
      // would otherwise both become ZIMBA.ZW) by appending digits until
      // it's unique.
      let attempt = 2;
      while (usedTickers.has(candidate)) {
        candidate = `${slugTicker(row.name, tickerSuffix).replace(`.${tickerSuffix}`, '')}${attempt}.${tickerSuffix}`;
        attempt += 1;
      }
      ticker = candidate;
      unmatched.push(`${row.name} -> guessed ${ticker}`);
    }
    usedTickers.add(ticker);

    // ZSE prices are reported in ZWG CENTS in the source PDF (confirmed
    // against africanfinancials.com and cross-checked against two other
    // independent live-price sources — our stored raw cents values were
    // ~100x too high). VFEX is already in whole USD, no conversion needed.
    // Market cap is NOT touched here — MMC's "$m" column is already in
    // proper millions, not cents, for both markets.
    const isZse = tickerSuffix === 'ZW';
    // row.closingPrice is null when the counter didn't trade today (both
    // Opening and Last Traded were "-" in the PDF) — carry forward the
    // last known real price instead of showing a fabricated $0. existing's
    // closingPrice is already in final display units (previously
    // converted), so it's used as-is, unlike row.closingPrice which still
    // needs the cents conversion below.
    const closingPrice = row.closingPrice !== null
      ? (isZse ? Number((row.closingPrice / 100).toFixed(4)) : row.closingPrice)
      : (existing?.closingPrice ?? 0);

    return {
      ticker,
      name: titleCase(row.name),
      change: row.change,
      closingPrice,
      marketCap: row.marketCap,
      currency: isZse ? 'ZWG' : 'USD',
      estimated: false, // real reported market cap from MMC, not our old placeholder
      ...(existing?.logoUrl ? { logoUrl: existing.logoUrl } : {}),
    };
  });

  return { records, unmatched };
}

function appendHistory(historyFile, records) {
  const today = new Date().toISOString().slice(0, 10);

  let history = [];
  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch (error) {
      console.warn(`Could not parse existing ${path.basename(historyFile)} — starting fresh.`, error.message);
      history = [];
    }
  }

  const withoutToday = history.filter((entry) => entry.date !== today);
  const todayEntries = records.map((record) => ({
    ticker: record.ticker,
    date: today,
    closingPrice: record.closingPrice,
    marketCap: record.marketCap,
    change: record.change,
  }));

  fs.writeFileSync(historyFile, JSON.stringify([...withoutToday, ...todayEntries], null, 2) + '\n');
  return todayEntries.length;
}

async function main() {
  if (!fs.existsSync(PDF_FILE)) {
    console.error(`Could not find ${path.basename(PDF_FILE)} in this folder. Save today's MMC PDF here first (see instructions at the top of this script).`);
    process.exitCode = 1;
    return;
  }

  const buffer = fs.readFileSync(PDF_FILE);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  const lines = text.split('\n');

  const zseRows = extractSection(lines, SECTION_MARKERS.zseStart, SECTION_MARKERS.zseEnd);
  const vfexRows = extractSection(lines, SECTION_MARKERS.vfexStart, SECTION_MARKERS.vfexEnd);

  console.log(`Parsed ${zseRows.length} ZSE companies and ${vfexRows.length} VFEX companies from ${path.basename(PDF_FILE)}.`);

  const { records: zseRecords, unmatched: zseUnmatched } = buildRecords(zseRows, ZSE_DATA_FILE, 'ZW');
  const { records: vfexRecords, unmatched: vfexUnmatched } = buildRecords(vfexRows, VFEX_DATA_FILE, 'VX');

  fs.writeFileSync(ZSE_DATA_FILE, JSON.stringify(zseRecords, null, 2) + '\n');
  fs.writeFileSync(VFEX_DATA_FILE, JSON.stringify(vfexRecords, null, 2) + '\n');

  const zseHistoryCount = appendHistory(ZSE_HISTORY_FILE, zseRecords);
  const vfexHistoryCount = appendHistory(VFEX_HISTORY_FILE, vfexRecords);

  console.log(`\nZSE: wrote ${zseRecords.length} companies, recorded ${zseHistoryCount} history points.`);
  console.log(`VFEX: wrote ${vfexRecords.length} companies, recorded ${vfexHistoryCount} history points.`);

  if (zseUnmatched.length > 0) {
    console.log(`\nNew/unmatched ZSE tickers (guessed — verify these):\n  ${zseUnmatched.join('\n  ')}`);
  }
  if (vfexUnmatched.length > 0) {
    console.log(`\nNew/unmatched VFEX tickers (guessed — verify these):\n  ${vfexUnmatched.join('\n  ')}`);
  }
}

main().catch((error) => {
  console.error('mmc-update failed:', error);
  process.exitCode = 1;
});