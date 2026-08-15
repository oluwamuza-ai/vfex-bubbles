import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// HOW TO USE THIS SCRIPT
// ---------------------------------------------------------------------------
// One-time fix: corrects tickers in vfex-data.json and zse-data.json that
// were auto-guessed by mmc-update.js, matched by company NAME (stable, even
// though the ticker itself was wrong).
//
// Run:   node fix-tickers.js
//
// IMPORTANT: your history files (vfex-history.json / zse-history.json)
// still have OLD entries recorded under the old guessed tickers — those
// won't retroactively rename themselves, so a company's price history
// chart may show a small gap/reset around the date you run this. Given
// this project's history is only a few weeks deep at most, that's a small,
// one-time cost worth it for having correct tickers going forward.
// ---------------------------------------------------------------------------

const CORRECTIONS_FILE = path.join(__dirname, 'ticker-corrections.json');
const DATA_FILES = ['vfex-data.json', 'zse-data.json'];

function main() {
  if (!fs.existsSync(CORRECTIONS_FILE)) {
    console.error('Could not find ticker-corrections.json in this folder.');
    process.exitCode = 1;
    return;
  }

  const corrections = JSON.parse(fs.readFileSync(CORRECTIONS_FILE, 'utf8'));

  for (const fileName of DATA_FILES) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping ${fileName} — not found in this folder.`);
      continue;
    }

    const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let fixed = 0;

    const updated = records.map((record) => {
      const key = record.name.toLowerCase();
      const correctTicker = corrections[key];
      if (correctTicker && correctTicker !== record.ticker) {
        console.log(`${fileName}: ${record.name}: ${record.ticker} -> ${correctTicker}`);
        fixed += 1;
        return { ...record, ticker: correctTicker };
      }
      return record;
    });

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
    console.log(`${fileName}: corrected ${fixed} ticker(s).\n`);
  }
}

main();
