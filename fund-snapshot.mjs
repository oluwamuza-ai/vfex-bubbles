// Daily NAV snapshot for the virtual paper-trading fund. Deterministic and
// cheap by design — marks current holdings to today's close and records one
// row per market per day, regardless of whether any trade happened. Runs
// automatically in the price-update pipeline so the performance chart has a
// continuous series even on days the trading agent (separate, LLM-driven —
// see the "VFEX Virtual Fund — Daily Trading Agent" cloud routine) makes no
// changes, fails to run, or hasn't run yet today.
//
// This script never trades. It used to also run a rules-based momentum
// rebalance here; that's been replaced by the daily agent, which edits
// virtual-fund.json's holdings/cash/transactions directly and re-snapshots
// itself after trading. This script only fills in the gaps.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MARKETS = {
  VFEX: { dataFile: 'vfex-data.json' },
  ZSE: { dataFile: 'zse-data.json' },
};

function loadJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(path.join(__dirname, file), JSON.stringify(value, null, 2) + '\n');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const fund = loadJson('virtual-fund.json', null);
  let historyLog = loadJson('virtual-fund-history.json', []);
  if (!fund) {
    console.error('fund-snapshot: missing virtual-fund.json — skipping.');
    return;
  }

  const todayStr = today();

  for (const marketKey of Object.keys(MARKETS)) {
    const fundState = fund.funds[marketKey];
    if (!fundState) continue;
    if (!fundState.startDate) fundState.startDate = todayStr;

    const data = loadJson(MARKETS[marketKey].dataFile, []);
    const priceByTicker = new Map(data.map((r) => [r.ticker, r.closingPrice]));
    const holdingsValue = fundState.holdings.reduce(
      (sum, h) => sum + h.shares * (priceByTicker.get(h.ticker) ?? h.avgCost),
      0
    );
    const totalValue = fundState.cash + holdingsValue;

    // Idempotent on re-run: replace today's snapshot for this market rather
    // than appending a duplicate.
    historyLog = historyLog.filter((e) => !(e.market === marketKey && e.date === todayStr));
    historyLog.push({
      date: todayStr,
      market: marketKey,
      value: Number(totalValue.toFixed(2)),
      cash: Number(fundState.cash.toFixed(2)),
      holdingsValue: Number(holdingsValue.toFixed(2)),
    });
  }

  historyLog.sort((a, b) => a.date.localeCompare(b.date));
  writeJson('virtual-fund.json', fund);
  writeJson('virtual-fund-history.json', historyLog);
  console.log('fund-snapshot: NAV recorded for', todayStr);
}

main();
