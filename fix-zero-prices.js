// One-off repair for closingPrice: 0 entries created by the bug fixed in
// mmc-update.js (a no-trade day was defaulting to $0 instead of carrying
// forward the last real price). Run once: node fix-zero-prices.js
//
// For each history file, walks each ticker's entries in date order and
// replaces a 0 with the nearest known real (non-zero) price — preferring
// the most recent PRIOR price (carry-forward, matches how a no-trade day
// actually behaves), falling back to the nearest FUTURE price only for a
// ticker's very first entries, where there's no prior price yet.
// Then applies the same fix to today's snapshot in vfex-data.json /
// zse-data.json, using each ticker's own (now-repaired) history.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function repairHistoryFile(fileName) {
  const filePath = path.join(__dirname, fileName);
  const history = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const byTicker = new Map();
  for (const entry of history) {
    if (!byTicker.has(entry.ticker)) byTicker.set(entry.ticker, []);
    byTicker.get(entry.ticker).push(entry);
  }

  let repaired = 0;
  let unrepairable = 0;

  for (const entries of byTicker.values()) {
    entries.sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < entries.length; i += 1) {
      if (entries[i].closingPrice !== 0) continue;

      let replacement = null;
      for (let j = i - 1; j >= 0; j -= 1) {
        if (entries[j].closingPrice !== 0) { replacement = entries[j].closingPrice; break; }
      }
      if (replacement === null) {
        for (let j = i + 1; j < entries.length; j += 1) {
          if (entries[j].closingPrice !== 0) { replacement = entries[j].closingPrice; break; }
        }
      }

      if (replacement === null) {
        unrepairable += 1; // every recorded entry for this ticker is 0 — nothing to carry from
        continue;
      }
      entries[i].closingPrice = replacement;
      repaired += 1;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(history, null, 2) + '\n');
  console.log(`${fileName}: repaired ${repaired} zero-price entries${unrepairable ? `, ${unrepairable} left unrepairable (ticker has no non-zero price on record)` : ''}.`);

  return byTicker;
}

function repairDataFile(fileName, historyByTicker) {
  const filePath = path.join(__dirname, fileName);
  const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  let repaired = 0;
  for (const record of records) {
    if (record.closingPrice !== 0) continue;
    const tickerHistory = historyByTicker.get(record.ticker);
    if (!tickerHistory) continue;
    const lastValid = [...tickerHistory].reverse().find((e) => e.closingPrice !== 0);
    if (lastValid) {
      record.closingPrice = lastValid.closingPrice;
      repaired += 1;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(records, null, 2) + '\n');
  console.log(`${fileName}: repaired ${repaired} zero-price snapshot entries.`);
}

const vfexHistoryByTicker = repairHistoryFile('vfex-history.json');
const zseHistoryByTicker = repairHistoryFile('zse-history.json');
repairDataFile('vfex-data.json', vfexHistoryByTicker);
repairDataFile('zse-data.json', zseHistoryByTicker);
