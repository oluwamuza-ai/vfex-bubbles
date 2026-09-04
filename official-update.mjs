// ---------------------------------------------------------------------------
// PRIMARY daily data source: the official ZSE/VFEX exchange operator (ZSE
// Holdings) runs a public, unauthenticated JSON API behind their own
// homepage widget at zse.co.zw — found by inspecting their Next.js bundles
// for fetch URLs, not documented anywhere. It covers both exchanges, is
// same-day (no posting lag the way MMC's PDF has), and includes outstanding
// share counts, so market cap can be computed directly instead of trusting
// a PDF column. mmc-update.js / daily-update.mjs (the MMC PDF pipeline)
// still runs as a backup: if this script fails outright — the API changes
// shape, goes down, whatever — the MMC flow's own "only overwrite if newer
// than what's stored" self-healing check means it naturally fills the gap
// on whatever day this didn't run successfully.
//
// To run it manually:  node official-update.mjs
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API_BASE = 'https://ds88jcmqc11je.cloudfront.net/api/fetch';
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

const VFEX_DATA_FILE = path.join(__dirname, 'vfex-data.json');
const VFEX_HISTORY_FILE = path.join(__dirname, 'vfex-history.json');
const ZSE_DATA_FILE = path.join(__dirname, 'zse-data.json');
const ZSE_HISTORY_FILE = path.join(__dirname, 'zse-history.json');
const FUNDS_DATA_FILE = path.join(__dirname, 'funds-data.json');
const FUNDS_HISTORY_FILE = path.join(__dirname, 'funds-history.json');

// Sanity floors — same purpose as daily-update.mjs's: refuse to let a
// malformed/near-empty response (API changed shape, partial outage) get
// committed and deployed.
const MIN_VFEX_RECORDS = 8;
const MIN_ZSE_RECORDS = 15;

function normalizeNameKey(name) {
  return name
    .toLowerCase()
    .replace(/\bdepository receipts\b/g, '')
    .replace(/\b(limited|ltd|plc|holdings|corporation|corp|company|co|vx|zdrs|zimbabwe|fund)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function titleCase(name) {
  return name.toLowerCase().replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function slugTicker(name, suffix) {
  const firstWord = name.split(/\s+/)[0] || 'UNKNOWN';
  return `${firstWord.toUpperCase().slice(0, 5)}.${suffix}`;
}

function classifyFund(name) {
  const upper = name.toUpperCase();
  // "EXCHANGE TRADED" alone (not the full "...FUND") because at least one
  // fund's name comes back truncated from this API, dropping the trailing
  // "FUND" — confirmed on DATVEST's ETF. "ETF"/"REIT" as standalone words
  // catches funds MMC's PDF spelled out in full but this API abbreviates
  // (e.g. "Morgan & Co Multi-Sector ETF Trust").
  if (upper.includes('EXCHANGE TRADED') || /\bETF\b/.test(upper)) return 'ETF';
  if (upper.includes('REAL ESTATE INVESTMENT TRUST') || /\bREIT\b/.test(upper)) return 'REIT';
  return null;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: BROWSER_HEADERS });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const body = await res.json();
  if (body.status !== 'success' || !Array.isArray(body.data)) {
    throw new Error(`${url} -> unexpected response shape: ${JSON.stringify(body).slice(0, 200)}`);
  }
  return body.data;
}

// The price-sheet endpoint's own statsDate is [YYYY, M, D] (M 1-indexed) —
// unambiguous, no timezone math needed. The market-cap endpoint instead
// gives an epoch-ms midnight-UTC timestamp that's actually midnight
// Africa/Harare (UTC+2), so it reads one calendar day early until shifted.
function priceSheetDate(row) {
  const [y, m, d] = row.statsDate;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// One merged name -> record index across all three existing data files,
// rather than three separate per-file lookups. A fund like "Revitus
// Property Opportunities" doesn't spell out "REIT" anywhere in its own
// name — classifyFund()'s text heuristic alone would (and did, before this
// existed) misfile it as a plain ZSE equity. Checking what we already
// filed it as last time takes priority; the text heuristic is only a
// fallback for names we've genuinely never seen before.
function loadNameIndex() {
  const index = {};
  const sources = [
    { file: ZSE_DATA_FILE, isFund: false },
    { file: VFEX_DATA_FILE, isFund: false },
    { file: FUNDS_DATA_FILE, isFund: true },
  ];
  for (const { file, isFund } of sources) {
    if (!fs.existsSync(file)) continue;
    try {
      const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
      for (const record of existing) {
        index[normalizeNameKey(record.name)] = {
          ticker: record.ticker,
          logoUrl: record.logoUrl,
          description: record.description,
          marketCap: record.marketCap,
          isFund,
          instrumentType: record.instrumentType,
        };
      }
    } catch (error) {
      console.warn(`Could not read existing ${path.basename(file)} for ticker/logo lookup.`, error.message);
    }
  }
  return index;
}

// Builds the unified record set for one exchange: joins price-sheet rows
// (the live, actively-traded universe) against market-cap rows (which
// carry the official ticker symbol + outstanding shares, but include
// suspended/delisted names with no current price — hence the join is
// FROM price-sheet, not the other way around: no live price means nothing
// to display today regardless of what the mcap endpoint still remembers).
function buildExchangeRecords(priceSheetRows, mcapRows, { isZse, marketLabel, nameIndex }) {
  const mcapByKey = new Map(mcapRows.map((r) => [normalizeNameKey(r.companyName), r]));
  const usedTickers = new Set();
  for (const entry of Object.values(nameIndex)) if (entry.ticker) usedTickers.add(entry.ticker);

  const equities = [];
  const funds = [];
  const unmatched = [];

  for (const row of priceSheetRows) {
    const key = normalizeNameKey(row.name);
    const existing = nameIndex[key];
    // Trust how we already filed this name over guessing from text again;
    // classifyFund() only decides for names we've never recorded before.
    const fundType = existing ? (existing.isFund ? (existing.instrumentType || 'ETF') : null) : classifyFund(row.name);
    const tickerSuffix = fundType || (isZse ? 'ZW' : 'VX');
    const mcapMatch = mcapByKey.get(key);

    let ticker = existing?.ticker || mcapMatch?.symbol;
    if (!ticker) {
      let candidate = slugTicker(row.name, tickerSuffix);
      let attempt = 2;
      while (usedTickers.has(candidate)) {
        candidate = `${slugTicker(row.name, tickerSuffix).replace(`.${tickerSuffix}`, '')}${attempt}.${tickerSuffix}`;
        attempt += 1;
      }
      ticker = candidate;
      unmatched.push(`${row.name} -> guessed ${ticker}`);
    }
    usedTickers.add(ticker);

    // ZSE prices are quoted in ZWG cents; VFEX is already whole USD. The
    // API itself carries forward the prior close on no-trade days (turnover
    // and tradesCount both 0), so unlike the old PDF pipeline there's no
    // separate "did it actually trade" fallback needed here — closePrice
    // is never a fabricated zero.
    const closingPrice = isZse ? Number((row.closePrice / 100).toFixed(6)) : row.closePrice;

    const marketCap = mcapMatch?.marketCapitalisation ?? existing?.marketCap ?? 0;

    const record = {
      ticker,
      name: titleCase(row.name),
      change: Number((row.percentageChange || 0).toFixed(2)),
      closingPrice,
      marketCap,
      currency: isZse ? 'ZWG' : 'USD',
      estimated: !mcapMatch, // no fresh authoritative cap this cycle
      volume: row.turnover ?? null, // shares traded — null (not 0) when the API doesn't say, so a real zero-volume day isn't confused with "unknown"
      ...(fundType ? { instrumentType: fundType, market: marketLabel } : {}),
      ...(existing?.logoUrl ? { logoUrl: existing.logoUrl } : {}),
      ...(existing?.description ? { description: existing.description } : {}),
    };

    (fundType ? funds : equities).push({ record, date: priceSheetDate(row) });
  }

  return { equities, funds, unmatched };
}

function appendHistory(historyFile, entries) {
  // entries: [{ record, date }]. Groups by date since a single run can, in
  // principle, contain more than one distinct statsDate across rows (it
  // hasn't in testing, but nothing guarantees same-day uniformity from an
  // API not under our control) — each date's existing entries are replaced
  // wholesale, same idempotent-per-date pattern mmc-update.js already uses.
  let history = [];
  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch (error) {
      console.warn(`Could not parse existing ${path.basename(historyFile)} — starting fresh.`, error.message);
      history = [];
    }
  }

  const datesTouched = new Set(entries.map((e) => e.date));
  const kept = history.filter((entry) => !datesTouched.has(entry.date));
  const fresh = entries.map(({ record, date }) => ({
    ticker: record.ticker,
    date,
    closingPrice: record.closingPrice,
    marketCap: record.marketCap,
    change: record.change,
    ...(record.volume != null ? { volume: record.volume } : {}),
  }));

  fs.writeFileSync(historyFile, JSON.stringify([...kept, ...fresh], null, 2) + '\n');
  return fresh.length;
}

async function main() {
  const [zsePriceSheet, vfexPriceSheet, zseMcap, vfexMcap] = await Promise.all([
    fetchJson(`${API_BASE}/price-sheet?exchange=ZSE`),
    fetchJson(`${API_BASE}/price-sheet?exchange=VFEX`),
    fetchJson(`${API_BASE}/market-capitalisation?exchange=ZSE`),
    fetchJson(`${API_BASE}/market-capitalisation?exchange=VFEX`),
  ]);

  const nameIndex = loadNameIndex();

  const zse = buildExchangeRecords(zsePriceSheet, zseMcap, { isZse: true, marketLabel: 'ZSE', nameIndex });
  const vfex = buildExchangeRecords(vfexPriceSheet, vfexMcap, { isZse: false, marketLabel: 'VFEX', nameIndex });

  const zseRecords = zse.equities.map((e) => e.record);
  const vfexRecords = vfex.equities.map((e) => e.record);
  const fundsRecords = [...zse.funds, ...vfex.funds].map((e) => e.record);

  console.log(`Parsed ${zseRecords.length} ZSE companies and ${vfexRecords.length} VFEX companies from the official exchange API.`);
  console.log(`Parsed ${fundsRecords.length} ETFs/REITs across both exchanges.`);

  if (vfexRecords.length < MIN_VFEX_RECORDS || zseRecords.length < MIN_ZSE_RECORDS) {
    throw new Error(
      `Parsed record counts look too low to trust (VFEX ${vfexRecords.length}, ZSE ${zseRecords.length}) — ` +
      `refusing to commit. The exchange API may have changed shape.`
    );
  }

  fs.writeFileSync(ZSE_DATA_FILE, JSON.stringify(zseRecords, null, 2) + '\n');
  fs.writeFileSync(VFEX_DATA_FILE, JSON.stringify(vfexRecords, null, 2) + '\n');
  fs.writeFileSync(FUNDS_DATA_FILE, JSON.stringify(fundsRecords, null, 2) + '\n');

  const zseHistoryCount = appendHistory(ZSE_HISTORY_FILE, zse.equities);
  const vfexHistoryCount = appendHistory(VFEX_HISTORY_FILE, vfex.equities);
  const fundsHistoryCount = appendHistory(FUNDS_HISTORY_FILE, [...zse.funds, ...vfex.funds]);

  console.log(`\nZSE: wrote ${zseRecords.length} companies, recorded ${zseHistoryCount} history points.`);
  console.log(`VFEX: wrote ${vfexRecords.length} companies, recorded ${vfexHistoryCount} history points.`);
  console.log(`Funds: wrote ${fundsRecords.length} ETFs/REITs, recorded ${fundsHistoryCount} history points.`);

  if (zse.unmatched.length > 0) console.log(`\nNew/unmatched ZSE tickers:\n  ${zse.unmatched.join('\n  ')}`);
  if (vfex.unmatched.length > 0) console.log(`\nNew/unmatched VFEX tickers:\n  ${vfex.unmatched.join('\n  ')}`);
}

main().catch((error) => {
  console.error('official-update failed:', error.message);
  process.exitCode = 1;
});
