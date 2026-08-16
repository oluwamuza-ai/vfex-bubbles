import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// HOW TO USE THIS SCRIPT
// ---------------------------------------------------------------------------
// One-time (or occasional) backfill: processes an entire FOLDER of past
// daily PDFs at once, instead of one day via mmc-update.js.
//
// 1. Put all your historical PDFs in one folder (subfolders are fine — it
//    searches recursively). Filenames must contain a date in DD-MM-YYYY
//    format somewhere, e.g. "Daily Price Sheet 05-08-2026.pdf" — this is
//    the same naming pattern MMC already uses.
// 2. Run:   node batch-import-history.js "./price sheets"
//    (or just `node batch-import-history.js` if your folder is named
//    exactly "price sheets" in this same directory)
//
// It will:
//   - Parse every PDF, extract its date from the filename
//   - Sort everything chronologically
//   - Append EVERY day's data to vfex-history.json / zse-history.json
//   - Overwrite vfex-data.json / zse-data.json with only the MOST RECENT
//     day found (that's your "current snapshot" — same as mmc-update.js)
//   - Reuse your EXISTING vfex-data.json/zse-data.json as the ticker/logo
//     lookup for the whole batch, so tickers stay consistent throughout
//     (not re-guessed differently for each historical day)
//
// Duplicate-dated files (e.g. "... (1).pdf", "... (2).pdf") are detected
// automatically — if two files for the same date have identical parsed
// content, the duplicate is silently skipped; if they differ, both are
// reported so you can check which one is correct.
// ---------------------------------------------------------------------------

const inputFolder = path.resolve(process.argv[2] || './price sheets');

const VFEX_DATA_FILE = path.join(__dirname, 'vfex-data.json');
const VFEX_HISTORY_FILE = path.join(__dirname, 'vfex-history.json');
const ZSE_DATA_FILE = path.join(__dirname, 'zse-data.json');
const ZSE_HISTORY_FILE = path.join(__dirname, 'zse-history.json');

const SECTION_MARKERS = {
  zseStart: 'Market Cap ($m)',
  zseEnd: 'Exchange Traded Funds (ETFs)',
  vfexStart: 'VFEX US$m',
  vfexEnd: 'Exchange traded funds (ETFS) VFEX',
};

function isNumericToken(token) {
  return /^-$|^nan$|^-?[\d,]+(\.\d+)?%?$/i.test(token);
}

function parseNumber(token) {
  if (token === '-' || token === undefined || /^nan$/i.test(token)) return null;
  return Number.parseFloat(token.replace(/,/g, '').replace('%', ''));
}

function parseCompanyRow(line) {
  // PDF text extraction occasionally glues a number directly onto the
  // preceding word with no space at all (e.g. "...LIMITED19,295.0000"),
  // seen while testing this importer on real files. This inserts a space
  // at every letter-immediately-followed-by-digit boundary, fixing that
  // without affecting legitimate cases like "Zimbabwe Newspapers (1980)"
  // (the digit there is already preceded by a space/parenthesis, not a
  // letter, so it's untouched).
  const cleanedLine = line.trim().replace(/([A-Za-z])(\d)/g, '$1 $2');
  const tokens = cleanedLine.split(/\s+/);

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
  if (!name || values.length < 5) return null;

  const marketCapM = parseNumber(values[values.length - 1]);
  const withoutCap = values.slice(0, -1);

  const opening = parseNumber(withoutCap[0]);
  const lastTraded = parseNumber(withoutCap[1]);

  const trailing = withoutCap.slice(5);
  let absChange = null;
  let pctChange = null;
  if (trailing.length === 2) {
    absChange = parseNumber(trailing[0]);
    pctChange = parseNumber(trailing[1]);
  } else if (trailing.length === 1) {
    if (trailing[0].includes('%')) pctChange = parseNumber(trailing[0]);
    else absChange = parseNumber(trailing[0]);
  }

  const closingPrice = lastTraded ?? opening ?? 0;
  let change = pctChange;
  if (change === null && absChange !== null && opening) {
    change = Number(((absChange / opening) * 100).toFixed(2));
  }
  if (change === null) change = 0;

  if (marketCapM === null || Number.isNaN(closingPrice)) return null;

  return {
    name,
    closingPrice,
    change,
    marketCap: Math.round(marketCapM * 1_000_000),
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
  }

  return records;
}

function titleCase(name) {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

// MMC's own source PDFs aren't perfectly consistent — the same company can
// appear as "... Holdings Limited" in one month's PDF and "... Holdings
// Ltd" in another (confirmed while testing this importer). An exact-string
// name match would treat those as two different companies and mint a
// fresh, wrong ticker for one of them. Stripping common corporate-suffix
// words and all punctuation down to a compact core key makes matching
// robust to this kind of real-world inconsistency.
function normalizeNameKey(name) {
  return name
    .toLowerCase()
    .replace(/\bdepository receipts\b/g, '')
    .replace(/\b(limited|ltd|plc|holdings|corporation|corp|company|co|vx|zdrs|zimbabwe)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Every normal day's PDF uses full legal company names ("Padenga Holdings
// Ltd", "African Sun Limited"). If a day's extracted rows mostly DON'T
// have one of these common suffixes, that's a strong sign the PDF uses a
// different layout than expected (this happened once in testing — a PDF
// with abbreviated names like "Padenga" and an extra unexpected column).
// Rather than guess at parsing a format we haven't verified, that day's
// section gets skipped with a warning instead of silently importing
// scrambled data.
const NAME_SUFFIX_PATTERN = /\b(LIMITED|HOLDINGS|CORPORATION|PLC|LTD)\b/i;

function sectionLooksValid(rows) {
  if (rows.length === 0) return true;
  const withSuffix = rows.filter((r) => NAME_SUFFIX_PATTERN.test(r.name)).length;
  return withSuffix / rows.length >= 0.5;
}

function slugTicker(name, suffix) {
  const firstWord = name.split(/\s+/)[0] || 'UNKNOWN';
  return `${firstWord.toUpperCase().slice(0, 5)}.${suffix}`;
}

function loadExistingLookup(dataFile) {
  if (!fs.existsSync(dataFile)) return {};
  try {
    const existing = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const lookup = {};
    for (const record of existing) {
      lookup[normalizeNameKey(record.name)] = { ticker: record.ticker, logoUrl: record.logoUrl };
    }
    return lookup;
  } catch {
    return {};
  }
}

function buildRecords(parsedRows, lookup, usedTickers, tickerSuffix) {
  return parsedRows.map((row) => {
    const key = normalizeNameKey(row.name);
    const existing = lookup[key];

    let ticker = existing?.ticker;
    if (!ticker) {
      let candidate = slugTicker(row.name, tickerSuffix);
      let attempt = 2;
      while (usedTickers.has(candidate)) {
        candidate = `${slugTicker(row.name, tickerSuffix).replace(`.${tickerSuffix}`, '')}${attempt}.${tickerSuffix}`;
        attempt += 1;
      }
      ticker = candidate;
      lookup[key] = { ticker, logoUrl: existing?.logoUrl };
    }
    usedTickers.add(ticker);

    // Same conversion as mmc-update.js: ZSE prices are in ZWG cents in the
    // source PDF, VFEX is already whole USD. Market cap needs no scaling
    // for either market — MMC's "$m" column is already proper millions.
    const isZse = tickerSuffix === 'ZW';
    const closingPrice = isZse ? Number((row.closingPrice / 100).toFixed(4)) : row.closingPrice;

    return {
      ticker,
      name: titleCase(row.name),
      change: row.change,
      closingPrice,
      marketCap: row.marketCap,
      currency: isZse ? 'ZWG' : 'USD',
      estimated: false,
      ...(existing?.logoUrl ? { logoUrl: existing.logoUrl } : {}),
    };
  });
}

// Finds every PDF under a folder, recursively, and extracts a DD-MM-YYYY
// date from each filename. Files whose date can't be parsed are skipped
// with a warning rather than silently dropped.
function findDatedPdfs(folder) {
  const results = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        const match = entry.name.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (!match) {
          console.warn(`Skipping (no date found in filename): ${entry.name}`);
          continue;
        }
        const [, dd, mm, yyyy] = match;
        const date = `${yyyy}-${mm}-${dd}`;
        results.push({ filePath: fullPath, fileName: entry.name, date });
      }
    }
  }

  walk(folder);
  return results;
}

async function extractText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: buffer });
  const { text } = await parser.getText();
  return text;
}

function appendHistoryBatch(historyFile, entriesByDate) {
  let history = [];
  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch {
      history = [];
    }
  }

  const datesBeingReplaced = new Set(Object.keys(entriesByDate));
  const kept = history.filter((entry) => !datesBeingReplaced.has(entry.date));

  const newEntries = [];
  for (const [date, records] of Object.entries(entriesByDate)) {
    for (const record of records) {
      newEntries.push({
        ticker: record.ticker,
        date,
        closingPrice: record.closingPrice,
        marketCap: record.marketCap,
        change: record.change,
      });
    }
  }

  fs.writeFileSync(historyFile, JSON.stringify([...kept, ...newEntries], null, 2) + '\n');
  return newEntries.length;
}

async function main() {
  if (!fs.existsSync(inputFolder)) {
    console.error(`Could not find folder: ${inputFolder}`);
    process.exitCode = 1;
    return;
  }

  const files = findDatedPdfs(inputFolder);
  console.log(`Found ${files.length} PDF(s) with parseable dates.\n`);

  // Group by date to catch duplicates (e.g. "... (1).pdf", "... (2).pdf")
  const byDate = {};
  for (const file of files) {
    if (!byDate[file.date]) byDate[file.date] = [];
    byDate[file.date].push(file);
  }

  const dates = Object.keys(byDate).sort();
  console.log(`Covering ${dates.length} unique trading day(s): ${dates[0]} to ${dates[dates.length - 1]}\n`);

  const vfexLookup = loadExistingLookup(VFEX_DATA_FILE);
  const zseLookup = loadExistingLookup(ZSE_DATA_FILE);
  const vfexUsedTickers = new Set(Object.values(vfexLookup).map((e) => e.ticker).filter(Boolean));
  const zseUsedTickers = new Set(Object.values(zseLookup).map((e) => e.ticker).filter(Boolean));

  const vfexByDate = {};
  const zseByDate = {};
  let lastDate = null;
  let lastVfexRecords = null;
  let lastZseRecords = null;

  for (const date of dates) {
    const candidates = byDate[date];
    let chosenFile = candidates[0];

    if (candidates.length > 1) {
      // Duplicate date across multiple files — parse all, compare.
      const texts = await Promise.all(candidates.map((c) => extractText(c.filePath)));
      const allSame = texts.every((t) => t === texts[0]);
      if (allSame) {
        console.log(`${date}: ${candidates.length} files, identical content — using "${chosenFile.fileName}", skipping duplicate(s).`);
      } else {
        console.warn(`${date}: ${candidates.length} files with DIFFERENT content — using the last one ("${candidates[candidates.length - 1].fileName}"). Files involved: ${candidates.map((c) => c.fileName).join(', ')}. Worth checking manually if this date looks off.`);
        chosenFile = candidates[candidates.length - 1];
      }
    }

    const text = await extractText(chosenFile.filePath);
    const lines = text.split('\n');

    const zseRows = extractSection(lines, SECTION_MARKERS.zseStart, SECTION_MARKERS.zseEnd);
    const vfexRows = extractSection(lines, SECTION_MARKERS.vfexStart, SECTION_MARKERS.vfexEnd);

    if (!sectionLooksValid(zseRows) || !sectionLooksValid(vfexRows)) {
      console.warn(`${date}: SKIPPED — "${chosenFile.fileName}" doesn't match the expected PDF format (company names look abbreviated or structure differs). Check this file manually.`);
      continue;
    }

    const zseRecords = buildRecords(zseRows, zseLookup, zseUsedTickers, 'ZW');
    const vfexRecords = buildRecords(vfexRows, vfexLookup, vfexUsedTickers, 'VX');

    zseByDate[date] = zseRecords;
    vfexByDate[date] = vfexRecords;

    lastDate = date;
    lastVfexRecords = vfexRecords;
    lastZseRecords = zseRecords;
  }

  const vfexCount = appendHistoryBatch(VFEX_HISTORY_FILE, vfexByDate);
  const zseCount = appendHistoryBatch(ZSE_HISTORY_FILE, zseByDate);

  console.log(`\nvfex-history.json: recorded ${vfexCount} price points across ${dates.length} days.`);
  console.log(`zse-history.json: recorded ${zseCount} price points across ${dates.length} days.`);

  if (lastVfexRecords && lastZseRecords) {
    fs.writeFileSync(VFEX_DATA_FILE, JSON.stringify(lastVfexRecords, null, 2) + '\n');
    fs.writeFileSync(ZSE_DATA_FILE, JSON.stringify(lastZseRecords, null, 2) + '\n');
    console.log(`\nvfex-data.json / zse-data.json updated to reflect the most recent date found: ${lastDate}.`);
  }
}

main().catch((error) => {
  console.error('batch-import-history failed:', error);
  process.exitCode = 1;
});