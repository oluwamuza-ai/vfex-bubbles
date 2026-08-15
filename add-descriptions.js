import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// HOW TO USE THIS SCRIPT
// ---------------------------------------------------------------------------
// One-time (or occasional) merge: adds a "description" field to every record
// in vfex-data.json and zse-data.json, matched by company NAME (not ticker,
// since we've seen auto-guessed tickers drift — name is the stable key here).
//
// Run:   node add-descriptions.js
//
// Safe to re-run any time you update descriptions.json — it overwrites the
// description field but leaves everything else in your data files untouched.
// ---------------------------------------------------------------------------

const DESCRIPTIONS_FILE = path.join(__dirname, 'descriptions.json');
const DATA_FILES = ['vfex-data.json', 'zse-data.json'];

function main() {
  if (!fs.existsSync(DESCRIPTIONS_FILE)) {
    console.error('Could not find descriptions.json in this folder.');
    process.exitCode = 1;
    return;
  }

  const descriptions = JSON.parse(fs.readFileSync(DESCRIPTIONS_FILE, 'utf8'));

  for (const fileName of DATA_FILES) {
    const filePath = path.join(__dirname, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping ${fileName} — not found in this folder.`);
      continue;
    }

    const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let matched = 0;
    const unmatched = [];

    const updated = records.map((record) => {
      const key = record.name.toLowerCase();
      const description = descriptions[key];
      if (description) {
        matched += 1;
        return { ...record, description };
      }
      unmatched.push(record.name);
      return record;
    });

    fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n');
    console.log(`${fileName}: added descriptions to ${matched}/${records.length} companies.`);
    if (unmatched.length > 0) {
      console.log(`  No description found for: ${unmatched.join(', ')}`);
    }
  }
}

main();
