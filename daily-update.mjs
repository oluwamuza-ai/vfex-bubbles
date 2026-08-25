// ---------------------------------------------------------------------------
// Fully automates what mmc-update.js used to require by hand: fetches
// MMC Capital's price sheet listing, downloads today's PDF if it's out yet,
// and runs it through the existing mmc-update.js parser. Intended to run
// on a schedule via .github/workflows/daily-pricesheet-update.yml, which
// then commits + pushes the resulting data files if anything changed.
//
// To run it manually:  node daily-update.mjs
// ---------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LIST_URL = 'https://www.mmccapitalzim.com/get_pricesheets.php';
const DOWNLOAD_URL = 'https://www.mmccapitalzim.com/download_pricesheet.php';
const PDF_PATH = path.join(__dirname, 'today-pricesheet.pdf');

const VFEX_DATA_FILE = path.join(__dirname, 'vfex-data.json');
const ZSE_DATA_FILE = path.join(__dirname, 'zse-data.json');
const VFEX_HISTORY_FILE = path.join(__dirname, 'vfex-history.json');

// Sanity floors, not exact expected counts — just enough to catch a
// catastrophic parse failure (MMC changes their PDF layout, section
// markers no longer match, etc.) before it gets auto-committed and
// deployed to the live site. Set comfortably below the current real
// counts (14 VFEX, 34 ZSE) so normal delistings/additions don't trip it.
const MIN_VFEX_RECORDS = 8;
const MIN_ZSE_RECORDS = 15;

// MMC's server returns 406 Not Acceptable to requests that don't look like
// a real browser (confirmed: plain curl with no headers gets rejected,
// the same request with these headers succeeds).
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  Referer: 'https://www.mmccapitalzim.com/pricesheets',
};

// Pulls the trading day out of MMC's own filename ("Daily Price Sheet
// 24-08-2026.pdf") rather than trusting the CI runner's clock. MMC posts
// each day's sheet sometime AFTER this workflow's scheduled run time, so a
// strict "is the newest file dated today" check was perpetually one day
// late: by the time we check, the newest file is always dated yesterday
// relative to whatever day the job happens to be running. Comparing
// against the latest date we already have on file (see latestStoredDate)
// is self-healing instead — it ingests whatever the newest sheet is, the
// moment it's newer than what we've stored, regardless of run timing.
function extractFileDate(name) {
  const match = name.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function latestStoredDate() {
  if (!fs.existsSync(VFEX_HISTORY_FILE)) return null;
  try {
    const history = JSON.parse(fs.readFileSync(VFEX_HISTORY_FILE, 'utf8'));
    const dates = history.map((entry) => entry.date).filter(Boolean).sort();
    return dates.length ? dates[dates.length - 1] : null;
  } catch {
    return null;
  }
}

function readRecordCount(file) {
  if (!fs.existsSync(file)) return 0;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

async function main() {
  const listRes = await fetch(LIST_URL, { headers: BROWSER_HEADERS });
  if (!listRes.ok) throw new Error(`Failed to list price sheets: HTTP ${listRes.status}`);
  const { files } = await listRes.json();
  if (!Array.isArray(files) || files.length === 0) throw new Error('Price sheet list came back empty.');

  // The API already returns files newest-first.
  const newest = files[0];
  const newestDate = extractFileDate(newest.name);
  if (!newestDate) throw new Error(`Could not find a DD-MM-YYYY date in "${newest.name}".`);

  const latestStored = latestStoredDate();
  if (latestStored && newestDate <= latestStored) {
    console.log(`Newest price sheet on MMC's site is "${newest.name}" (${newestDate}) — already have data through ${latestStored}. Nothing to do.`);
    return;
  }

  console.log(`Downloading new price sheet: ${newest.name} (${newestDate}; latest stored: ${latestStored ?? 'none'})`);
  const pdfRes = await fetch(`${DOWNLOAD_URL}?file=${encodeURIComponent(newest.name)}`, { headers: BROWSER_HEADERS });
  if (!pdfRes.ok) throw new Error(`Failed to download "${newest.name}": HTTP ${pdfRes.status}`);

  const buffer = Buffer.from(await pdfRes.arrayBuffer());
  if (buffer.length < 1000 || buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new Error(`Downloaded file doesn't look like a real PDF (${buffer.length} bytes).`);
  }
  fs.writeFileSync(PDF_PATH, buffer);

  console.log('Parsing it with mmc-update.js...');
  const result = spawnSync(process.execPath, ['mmc-update.js', path.basename(PDF_PATH), newestDate], { cwd: __dirname, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`mmc-update.js exited with code ${result.status}`);

  // Refuse to let a broken parse (MMC changed their PDF layout, a section
  // marker stopped matching, etc.) silently ship near-empty data to the
  // live site — fail loudly instead so the workflow run shows red and
  // nothing gets committed.
  const vfexCount = readRecordCount(VFEX_DATA_FILE);
  const zseCount = readRecordCount(ZSE_DATA_FILE);
  console.log(`Parsed ${vfexCount} VFEX and ${zseCount} ZSE records.`);
  if (vfexCount < MIN_VFEX_RECORDS || zseCount < MIN_ZSE_RECORDS) {
    throw new Error(
      `Parsed record counts look too low to trust (VFEX ${vfexCount}, ZSE ${zseCount}) — ` +
      `refusing to let this get committed. MMC's PDF layout may have changed; check mmc-update.js's section markers.`
    );
  }
}

main().catch((error) => {
  console.error('daily-update failed:', error.message);
  process.exitCode = 1;
});
