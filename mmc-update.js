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
// It reads the PDF directly — no copy-pasting needed — and updates:
//   - vfex-data.json  / vfex-history.json   (the VFEX US$m section)
//   - zse-data.json   / zse-history.json    (the main ZSE equities section)
//   - funds-data.json / funds-history.json  (ETFs + REITs from BOTH
//     exchanges, combined — a separate category from operating-company
//     equities since they're a different instrument type; each record is
//     tagged instrumentType: 'ETF'|'REIT' and market: 'ZSE'|'VFEX')
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
// Optional third arg (YYYY-MM-DD): the trading day this PDF actually covers,
// for callers (daily-update.mjs) that know it from the source filename.
// Manual runs without this arg fall back to the system date, which is only
// correct if you download+run same-day — see appendHistory below.
const DATE_OVERRIDE = process.argv[3] || null;

const VFEX_DATA_FILE = path.join(__dirname, 'vfex-data.json');
const VFEX_HISTORY_FILE = path.join(__dirname, 'vfex-history.json');
const ZSE_DATA_FILE = path.join(__dirname, 'zse-data.json');
const ZSE_HISTORY_FILE = path.join(__dirname, 'zse-history.json');
const FUNDS_DATA_FILE = path.join(__dirname, 'funds-data.json');
const FUNDS_HISTORY_FILE = path.join(__dirname, 'funds-history.json');

// Section start/end markers as they appear verbatim in the PDF text. Note
// the ZSE and VFEX ETF headings are inconsistently cased/worded in MMC's
// own PDF ("Exchange Traded Funds (ETFs)" vs "Exchange traded funds
// (ETFS) VFEX") — these are exact strings observed in real price sheets,
// not a typo here.
const SECTION_MARKERS = {
  zseStart: 'Market Cap ($m)',       // last line of the (wrapped) ZSE header — equities start right after
  zseEnd: 'Exchange Traded Funds (ETFs)',
  zseEtfEnd: 'Real Estate Investment Trust (REIT)',
  zseReitEnd: 'VFEX US$m',
  vfexStart: 'VFEX US$m',
  vfexEnd: 'Exchange traded funds (ETFS) VFEX',
  vfexEtfEnd: 'Real Estate Investment Trust (REIT) VFEX',
  vfexReitEnd: 'Indices',
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

  // At exactly 5 tokens the row shape is genuinely ambiguous: the "last
  // token = Market Cap" assumption below breaks for a row that dropped
  // Market Cap itself rather than the Change columns (confirmed against a
  // real PDF row: "... 0.112 0.11 0.111 22417 2,479.32" is actually
  // [Opening, LastTraded, VWAP, Volume, ValueTraded] with NO market cap at
  // all — treating 2,479.32 as "$m market cap" was 1000x too high). Flagged
  // so buildRecords can mark the record estimated rather than trust it.
  const lowConfidence = values.length === 5;

  const marketCapM = parseNumber(values[values.length - 1]);
  const withoutCap = values.slice(0, -1);

  const opening = parseNumber(withoutCap[0]);
  // MMC doesn't always print "-" for a no-trade day — some instruments
  // (confirmed on Nedbank's depository receipt) print a literal "0.0000"
  // Last Traded instead, which looks like a valid price to `??` (0 isn't
  // nullish). Volume Traded is the reliable signal either way: real
  // trading volume means LastTraded is a genuine price, zero volume means
  // it isn't, whatever digits happen to be printed there.
  const volume = parseNumber(withoutCap[3]);
  const lastTraded = volume ? parseNumber(withoutCap[1]) : null;
  // withoutCap[2] = VWAP — not currently used downstream
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
    lowConfidence,
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
      lookup[key] = { ticker: record.ticker, logoUrl: record.logoUrl, description: record.description, closingPrice: record.closingPrice, marketCap: record.marketCap };
    }
    return lookup;
  } catch (error) {
    console.warn(`Could not read existing ${path.basename(dataFile)} for ticker/logo lookup.`, error.message);
    return {};
  }
}

// isZse controls the ZWG-cents currency conversion below — decoupled from
// tickerSuffix (which is just cosmetic, e.g. 'ZW'/'VX'/'ETF'/'REIT') so
// funds sourced from the ZSE side of the PDF still get converted correctly
// even though their ticker suffix is 'ETF'/'REIT', not 'ZW'. extraFields
// gets merged into every record — used to tag funds with instrumentType/market.
function buildRecords(parsedRows, dataFile, tickerSuffix, { isZse, extraFields = {} } = {}) {
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
    // row.closingPrice is null when the counter didn't trade today (both
    // Opening and Last Traded were "-", or Volume was 0, in the PDF) —
    // carry forward the last known real price instead of showing a
    // fabricated $0. existing's closingPrice is already in final display
    // units (previously converted), so it's used as-is, unlike
    // row.closingPrice which still needs the cents conversion below.
    // 6 decimal places, not 4: a handful of ZSE penny stocks (confirmed on
    // Zeco) have a raw cents price small enough that /100 rounds to
    // exactly 0.0000 at 4dp despite being genuinely non-zero — losing that
    // distinction is worse than an ugly extra couple of trailing digits.
    const closingPrice = row.closingPrice !== null
      ? (isZse ? Number((row.closingPrice / 100).toFixed(6)) : row.closingPrice)
      : (existing?.closingPrice ?? 0);

    // row.lowConfidence means the source row had too few columns to be
    // sure "last token = Market Cap" was even correct (see parseCompanyRow)
    // — prefer carrying forward the last trustworthy market cap over a
    // possibly-wrong freshly-parsed one, and flag the record as estimated
    // either way so the UI shows reduced confidence.
    const marketCap = row.lowConfidence && existing?.marketCap != null ? existing.marketCap : row.marketCap;

    return {
      ticker,
      name: titleCase(row.name),
      change: row.change,
      closingPrice,
      marketCap,
      currency: isZse ? 'ZWG' : 'USD',
      estimated: Boolean(row.lowConfidence), // real reported market cap from MMC unless the source row was ambiguous
      ...extraFields,
      ...(existing?.logoUrl ? { logoUrl: existing.logoUrl } : {}),
      ...(existing?.description ? { description: existing.description } : {}),
    };
  });

  return { records, unmatched };
}

function appendHistory(historyFile, records) {
  // The PDF's actual trading day when known (see DATE_OVERRIDE above) —
  // NOT necessarily the day this script happens to run. Falling back to
  // "today" only makes sense for the manual same-day workflow.
  const today = DATE_OVERRIDE || new Date().toISOString().slice(0, 10);

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
  const zseEtfRows = extractSection(lines, SECTION_MARKERS.zseEnd, SECTION_MARKERS.zseEtfEnd);
  const zseReitRows = extractSection(lines, SECTION_MARKERS.zseEtfEnd, SECTION_MARKERS.zseReitEnd);
  const vfexEtfRows = extractSection(lines, SECTION_MARKERS.vfexEnd, SECTION_MARKERS.vfexEtfEnd);
  const vfexReitRows = extractSection(lines, SECTION_MARKERS.vfexEtfEnd, SECTION_MARKERS.vfexReitEnd);

  console.log(`Parsed ${zseRows.length} ZSE companies and ${vfexRows.length} VFEX companies from ${path.basename(PDF_FILE)}.`);
  console.log(`Parsed ${zseEtfRows.length} ZSE ETFs, ${zseReitRows.length} ZSE REITs, ${vfexEtfRows.length} VFEX ETFs, ${vfexReitRows.length} VFEX REITs.`);

  const { records: zseRecords, unmatched: zseUnmatched } = buildRecords(zseRows, ZSE_DATA_FILE, 'ZW', { isZse: true });
  const { records: vfexRecords, unmatched: vfexUnmatched } = buildRecords(vfexRows, VFEX_DATA_FILE, 'VX', { isZse: false });

  const { records: zseEtfRecords } = buildRecords(zseEtfRows, FUNDS_DATA_FILE, 'ETF', { isZse: true, extraFields: { instrumentType: 'ETF', market: 'ZSE' } });
  const { records: zseReitRecords } = buildRecords(zseReitRows, FUNDS_DATA_FILE, 'REIT', { isZse: true, extraFields: { instrumentType: 'REIT', market: 'ZSE' } });
  const { records: vfexEtfRecords } = buildRecords(vfexEtfRows, FUNDS_DATA_FILE, 'ETF', { isZse: false, extraFields: { instrumentType: 'ETF', market: 'VFEX' } });
  const { records: vfexReitRecords } = buildRecords(vfexReitRows, FUNDS_DATA_FILE, 'REIT', { isZse: false, extraFields: { instrumentType: 'REIT', market: 'VFEX' } });
  const fundsRecords = [...zseEtfRecords, ...zseReitRecords, ...vfexEtfRecords, ...vfexReitRecords];

  fs.writeFileSync(ZSE_DATA_FILE, JSON.stringify(zseRecords, null, 2) + '\n');
  fs.writeFileSync(VFEX_DATA_FILE, JSON.stringify(vfexRecords, null, 2) + '\n');
  fs.writeFileSync(FUNDS_DATA_FILE, JSON.stringify(fundsRecords, null, 2) + '\n');

  const zseHistoryCount = appendHistory(ZSE_HISTORY_FILE, zseRecords);
  const vfexHistoryCount = appendHistory(VFEX_HISTORY_FILE, vfexRecords);
  const fundsHistoryCount = appendHistory(FUNDS_HISTORY_FILE, fundsRecords);

  console.log(`\nZSE: wrote ${zseRecords.length} companies, recorded ${zseHistoryCount} history points.`);
  console.log(`VFEX: wrote ${vfexRecords.length} companies, recorded ${vfexHistoryCount} history points.`);
  console.log(`Funds: wrote ${fundsRecords.length} ETFs/REITs, recorded ${fundsHistoryCount} history points.`);

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