// One-off repair for a batch-import-era bug: a cluster of ZSE history
// entries (mostly 2026-08-06/08, a smaller cluster 2026-01-06) got written
// with prices ~100x too high — a PDF-text-extraction artifact from
// whatever historical PDF files batch-import-history.js processed at some
// point (confirmed: that script's own cents-conversion math is correct,
// same as mmc-update.js's; this isn't a missing-conversion bug). These
// then got silently propagated forward by fix-zero-prices.js's
// carry-forward logic on subsequent no-trade days for at least one ticker
// (ZECO), so its ENTIRE history is dominated by the wrong value except for
// today's freshly re-parsed entry — a same-ticker median would get fooled
// by that. Anchoring to TODAY's live snapshot (already verified correct
// against a real PDF) instead of each ticker's own history median is what
// makes this robust to that case.
//
// Run once: node fix-scale-outliers.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RATIO_HIGH = 20;   // flag if an entry is >20x today's live price
const RATIO_LOW = 0.05;  // flag if an entry is <5% of today's live price

function repairHistoryFile(historyFileName, dataFileName) {
  const historyPath = path.join(__dirname, historyFileName);
  const dataPath = path.join(__dirname, dataFileName);

  const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const livePriceByTicker = new Map(data.map((r) => [r.ticker, r.closingPrice]));

  const byTicker = new Map();
  for (const entry of history) {
    if (!byTicker.has(entry.ticker)) byTicker.set(entry.ticker, []);
    byTicker.get(entry.ticker).push(entry);
  }

  let repaired = 0;
  let unrepairable = 0;
  const details = [];

  for (const [ticker, entries] of byTicker) {
    const livePrice = livePriceByTicker.get(ticker);
    if (!livePrice || livePrice <= 0) continue; // no anchor available — leave this ticker alone

    entries.sort((a, b) => a.date.localeCompare(b.date));

    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry.closingPrice <= 0) continue; // handled by fix-zero-prices.js separately
      const ratio = entry.closingPrice / livePrice;
      if (ratio <= RATIO_HIGH && ratio >= RATIO_LOW) continue;

      // Find the nearest chronological entry (either direction) for this
      // SAME ticker that is itself NOT an outlier vs. the live anchor —
      // carry that forward/backward, matching fix-zero-prices.js's approach.
      let replacement = null;
      for (let j = i - 1; j >= 0; j -= 1) {
        const r = entries[j].closingPrice / livePrice;
        if (entries[j].closingPrice > 0 && r <= RATIO_HIGH && r >= RATIO_LOW) { replacement = entries[j].closingPrice; break; }
      }
      if (replacement === null) {
        for (let j = i + 1; j < entries.length; j += 1) {
          const r = entries[j].closingPrice / livePrice;
          if (entries[j].closingPrice > 0 && r <= RATIO_HIGH && r >= RATIO_LOW) { replacement = entries[j].closingPrice; break; }
        }
      }
      // Last resort: the outlier is consistently ~100x too high/low
      // (matches the confirmed bug pattern) — correct it directly rather
      // than leave a known-bad value in place.
      if (replacement === null) {
        if (ratio > RATIO_HIGH) replacement = Number((entry.closingPrice / 100).toFixed(6));
        else replacement = Number((entry.closingPrice * 100).toFixed(6));
      }

      details.push({ ticker, date: entry.date, from: entry.closingPrice, to: replacement });
      entry.closingPrice = replacement;
      repaired += 1;
    }
  }

  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');
  console.log(`${historyFileName}: repaired ${repaired} scale-outlier entries${unrepairable ? `, ${unrepairable} unrepairable` : ''}.`);
  for (const d of details) console.log(`  ${d.ticker} ${d.date}: ${d.from} -> ${d.to}`);
}

repairHistoryFile('zse-history.json', 'zse-data.json');
repairHistoryFile('vfex-history.json', 'vfex-data.json');
