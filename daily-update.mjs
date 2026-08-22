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

// MMC Capital is in Harare (Africa/Harare — UTC+2 year-round, no DST).
// "Today" must be computed in THEIR local date, not the CI runner's UTC
// date, since the two can briefly disagree around midnight UTC.
function harareTodayDDMMYYYY() {
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = now.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
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
  const today = harareTodayDDMMYYYY();

  if (!newest.name.includes(today)) {
    console.log(`Newest price sheet on MMC's site is "${newest.name}" — not dated today (${today}) yet. Nothing to do.`);
    return;
  }

  console.log(`Downloading today's price sheet: ${newest.name}`);
  const pdfRes = await fetch(`${DOWNLOAD_URL}?file=${encodeURIComponent(newest.name)}`, { headers: BROWSER_HEADERS });
  if (!pdfRes.ok) throw new Error(`Failed to download "${newest.name}": HTTP ${pdfRes.status}`);

  const buffer = Buffer.from(await pdfRes.arrayBuffer());
  if (buffer.length < 1000 || buffer.subarray(0, 4).toString('latin1') !== '%PDF') {
    throw new Error(`Downloaded file doesn't look like a real PDF (${buffer.length} bytes).`);
  }
  fs.writeFileSync(PDF_PATH, buffer);

  console.log('Parsing it with mmc-update.js...');
  const result = spawnSync(process.execPath, ['mmc-update.js'], { cwd: __dirname, stdio: 'inherit' });
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
