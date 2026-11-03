// Virtual paper-trading fund — no real money, no brokerage, no execution
// risk. Two separate cash pools (VFEX/USD, ZSE/ZWG) that never convert into
// each other, since there's no real FX rate connecting paper balances.
// Strategy: liquidity-screened momentum, rebalanced on a trading-day cadence
// (not a hardcoded weekday) so holidays don't skip or double up a rebalance.
// A monthly LLM strategic review (separate routine) may adjust the bounded
// knobs in fund-config.json, but never trades directly — this script is the
// only thing that ever touches cash/holdings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MARKETS = {
  VFEX: { dataFile: 'vfex-data.json', historyFile: 'vfex-history.json' },
  ZSE: { dataFile: 'zse-data.json', historyFile: 'zse-history.json' },
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

// Ranks tradeable candidates for one market by recent momentum, after a
// liquidity screen (must have actually traded on most recent days — a stock
// that hasn't moved in weeks is untradeable in practice, not a real signal).
function rankCandidates(marketKey, config) {
  const { dataFile, historyFile } = MARKETS[marketKey];
  const data = loadJson(dataFile, []);
  const history = loadJson(historyFile, []);

  const byTicker = {};
  for (const entry of history) {
    (byTicker[entry.ticker] ||= []).push(entry);
  }
  for (const ticker in byTicker) {
    byTicker[ticker].sort((a, b) => a.date.localeCompare(b.date));
  }

  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - config.lookbackDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const candidates = [];
  for (const record of data) {
    if (config.excludedTickers.includes(record.ticker)) continue;

    const series = byTicker[record.ticker] || [];
    const recent = series.filter((e) => e.date >= cutoffStr);
    if (recent.length < 2) continue; // not enough history to judge momentum yet

    const activeDays = recent.filter((e) => e.change !== 0).length;
    const activePct = activeDays / recent.length;
    if (activePct < config.minActivePct) continue; // liquidity screen

    const startPrice = recent[0].closingPrice;
    const endPrice = record.closingPrice;
    if (!startPrice || !endPrice) continue;

    const momentum = ((endPrice - startPrice) / startPrice) * 100;
    candidates.push({ ticker: record.ticker, name: record.name, price: record.closingPrice, momentum, activePct });
  }

  candidates.sort((a, b) => b.momentum - a.momentum);
  return candidates;
}

// Rebalances one market's fund toward its top momentum candidates,
// equal-weighted with a per-position cap, simulating a fee on each leg.
// Only ever holds names with positive momentum — if nothing qualifies, the
// fund simply sits in cash rather than being forced into a weak basket.
function rebalanceMarket(marketKey, fundState, config) {
  const candidates = rankCandidates(marketKey, config);
  const target = candidates.slice(0, config.targetPositions).filter((c) => c.momentum > 0);
  const targetTickers = new Set(target.map((c) => c.ticker));

  const priceByTicker = new Map(candidates.map((c) => [c.ticker, c.price]));
  const data = loadJson(MARKETS[marketKey].dataFile, []);
  for (const r of data) {
    if (!priceByTicker.has(r.ticker)) priceByTicker.set(r.ticker, r.closingPrice);
  }

  const trades = [];

  // Sell anything that fell out of the target list.
  for (const holding of [...fundState.holdings]) {
    if (!targetTickers.has(holding.ticker)) {
      const price = priceByTicker.get(holding.ticker) ?? holding.avgCost;
      const proceeds = holding.shares * price;
      const fee = proceeds * config.feePct;
      fundState.cash += proceeds - fee;
      trades.push({ action: 'sell', ticker: holding.ticker, shares: holding.shares, price, fee, reason: 'dropped out of momentum/liquidity screen' });
      fundState.holdings = fundState.holdings.filter((h) => h.ticker !== holding.ticker);
    }
  }

  const holdingsValue = fundState.holdings.reduce((sum, h) => sum + h.shares * (priceByTicker.get(h.ticker) ?? h.avgCost), 0);
  const totalValue = fundState.cash + holdingsValue;
  const maxPerPosition = totalValue * config.maxPositionPct;
  const equalTarget = target.length > 0 ? Math.min(totalValue / target.length, maxPerPosition) : 0;

  // Top up (or open) each target position toward the equal-weight target.
  // Trimming an overweight survivor is skipped on purpose — equal-weight
  // drift between rebalances is acceptable and keeps this simple.
  for (const candidate of target) {
    const price = priceByTicker.get(candidate.ticker);
    if (!price) continue;

    const existing = fundState.holdings.find((h) => h.ticker === candidate.ticker);
    const currentValue = existing ? existing.shares * price : 0;
    const delta = equalTarget - currentValue;
    if (delta <= 0 || fundState.cash <= 1) continue;

    const spend = Math.min(delta, fundState.cash / (1 + config.feePct));
    const fee = spend * config.feePct;
    const shares = spend / price;
    if (shares <= 0) continue;

    fundState.cash -= spend + fee;
    if (existing) {
      existing.avgCost = (existing.avgCost * existing.shares + spend) / (existing.shares + shares);
      existing.shares += shares;
    } else {
      fundState.holdings.push({ ticker: candidate.ticker, name: candidate.name, shares, avgCost: price });
    }
    trades.push({
      action: 'buy',
      ticker: candidate.ticker,
      shares,
      price,
      fee,
      reason: `momentum ${candidate.momentum.toFixed(1)}%, active ${(candidate.activePct * 100).toFixed(0)}%`,
    });
  }

  return trades;
}

function main() {
  const config = loadJson('fund-config.json', null);
  const fund = loadJson('virtual-fund.json', null);
  let historyLog = loadJson('virtual-fund-history.json', []);
  if (!config || !fund) {
    console.error('fund-rebalance: missing fund-config.json or virtual-fund.json — skipping.');
    return;
  }

  const todayStr = today();

  for (const marketKey of Object.keys(MARKETS)) {
    const fundState = fund.funds[marketKey];
    if (!fundState.startDate) fundState.startDate = todayStr;

    const history = loadJson(MARKETS[marketKey].historyFile, []);
    const tradingDays = [...new Set(history.map((e) => e.date))].sort();
    const daysSinceLast = fundState.lastRebalanceDate
      ? tradingDays.filter((d) => d > fundState.lastRebalanceDate).length
      : Infinity;

    if (daysSinceLast >= config.rebalanceEveryTradingDays) {
      const trades = rebalanceMarket(marketKey, fundState, config);
      if (trades.length > 0) {
        fund.transactions.push(...trades.map((t) => ({ ...t, date: todayStr, market: marketKey })));
        console.log(`${marketKey}: ${trades.length} trade(s) this rebalance.`);
      } else {
        console.log(`${marketKey}: rebalance due, no qualifying trades (nothing met the momentum/liquidity screen).`);
      }
      fundState.lastRebalanceDate = todayStr;
    }

    // Always snapshot NAV, even on a no-rebalance day, so the performance
    // chart has a continuous daily series.
    const data = loadJson(MARKETS[marketKey].dataFile, []);
    const priceByTicker = new Map(data.map((r) => [r.ticker, r.closingPrice]));
    const holdingsValue = fundState.holdings.reduce((sum, h) => sum + h.shares * (priceByTicker.get(h.ticker) ?? h.avgCost), 0);
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
  console.log('fund-rebalance: fund state updated.');
}

main();
