// One-off (re-runnable) pipeline that standardizes every company logo used
// by the bubble chart: trims excess padding, fits (never stretches) the
// actual artwork into a consistent square canvas, and bakes in a white
// circular backing plate for logos too dark to read against the app's
// near-black bubble fill. Outputs land in client/public/logos/std/<TICKER>.png
// and both vfex-data.json/zse-data.json get repointed at them.
//
// Also fixes three logoUrl references that were pointing at files that
// don't actually exist (or only "exist" on a case-insensitive filesystem):
// CFI.ZW (case), DZL.ZW, DLTA.ZW, NMB.ZW (wrong filenames entirely).
//
// Run it again any time a new raw logo is dropped in — it's driven by the
// SOURCE_OVERRIDES map below plus whatever logoUrl each record already has.
//
//   node standardize-logos.mjs

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CANVAS = 200;
const CONTENT = 168;
const DARK_THRESHOLD = 90;

const OUT_DIR = path.join(__dirname, 'client', 'public', 'logos', 'std');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Corrects logoUrl references that don't match any real file (see header
// comment), and supplies a source for tickers that had no logo at all —
// downloaded from each company's own official site (or Wikipedia for Old
// Mutual, whose corporate site is JS-rendered with no static logo URL).
// Keyed by ticker; value is the REAL file to source from.
const SOURCE_OVERRIDES = {
  'CFI.ZW': 'client/public/logos/zse/cfi.png',
  'DZL.ZW': 'client/public/logos/zse/DZI.png',
  'DLTA.ZW': 'client/public/logos/zse/Delta-Logo1.png',
  'NMB.ZW': 'client/public/logos/zse/NMBZ.png',
  'OLD.VX': 'client/public/logos/raw/OLD_raw.png',       // oldmutual.com, via Wikipedia infobox
  'ARIS.ZW': 'client/public/logos/raw/ARIS_raw.webp',     // ariston.co.zw
  'HIPO.ZW': 'client/public/logos/raw/HIPO_raw.png',      // hippovalleyestates.co.zw
  'NPKZ.ZW': 'client/public/logos/raw/NPKZ_raw.png',      // nampak.com
  'PROL.ZW': 'client/public/logos/raw/PROL_raw.png',      // proplastics.co.zw
  'TURN.ZW': 'client/public/logos/raw/TURN_raw.png',      // turnall.co.zw
  'UNIF.ZW': 'client/public/logos/raw/UNIF_raw.png',      // unifreight.co.zw
  'WILD.ZW': 'client/public/logos/raw/WILD_raw.png',      // willdale.co.zw (brand mark, no wordmark found)
  'ZBFH.ZW': 'client/public/logos/raw/ZBFH_raw.png',      // zb.co.zw
};

async function standardize(inputPath) {
  let img = sharp(inputPath).ensureAlpha();

  try {
    img = sharp(await img.png().toBuffer()).trim({ threshold: 10 }).ensureAlpha();
  } catch {
    // trim() throws on a single uniform-color image — nothing to trim, fine as-is.
  }

  const contentBuffer = await img
    .resize(CONTENT, CONTENT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const { data, info } = await sharp(contentBuffer).raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = info.channels === 4 ? data[i + 3] : 255;
    if (alpha < 16) continue;
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    count += 1;
  }
  const avgBrightness = count > 0 ? sum / count : 255;
  const needsBacking = avgBrightness < DARK_THRESHOLD;

  const layers = [];
  if (needsBacking) {
    const circle = Buffer.from(
      `<svg width="${CANVAS}" height="${CANVAS}"><circle cx="${CANVAS / 2}" cy="${CANVAS / 2}" r="${CANVAS / 2}" fill="#ffffff"/></svg>`
    );
    layers.push({ input: circle, top: 0, left: 0 });
  }
  const offset = (CANVAS - CONTENT) / 2;
  layers.push({ input: contentBuffer, top: offset, left: offset });

  return sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toBuffer();
}

function resolveSourcePath(ticker, logoUrl) {
  if (SOURCE_OVERRIDES[ticker]) return path.join(__dirname, SOURCE_OVERRIDES[ticker]);
  if (!logoUrl) return null;
  return path.join(__dirname, 'client', 'public', logoUrl.replace(/^\//, ''));
}

async function processFile(dataFile) {
  const filePath = path.join(__dirname, dataFile);
  const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let changed = 0;
  let skipped = 0;

  for (const record of records) {
    const sourcePath = resolveSourcePath(record.ticker, record.logoUrl);
    if (!sourcePath) { skipped += 1; continue; }
    if (!fs.existsSync(sourcePath)) {
      console.warn(`  [${record.ticker}] source not found: ${sourcePath} — leaving logoUrl untouched`);
      skipped += 1;
      continue;
    }

    const shortTicker = record.ticker.replace(/\.(VX|ZW)$/i, '');
    const outFile = `${shortTicker}.png`;
    const outPath = path.join(OUT_DIR, outFile);

    try {
      const buffer = await standardize(sourcePath);
      fs.writeFileSync(outPath, buffer);
      record.logoUrl = `/logos/std/${outFile}`;
      changed += 1;
    } catch (error) {
      console.warn(`  [${record.ticker}] failed to standardize ${sourcePath}: ${error.message}`);
      skipped += 1;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(records, null, 2) + '\n');
  console.log(`${dataFile}: standardized ${changed} logos, skipped ${skipped} (no source / no logo yet).`);
}

await processFile('vfex-data.json');
await processFile('zse-data.json');
