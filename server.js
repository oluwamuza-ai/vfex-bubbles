import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const app = express();

// Security headers (X-Content-Type-Options, X-Frame-Options, etc.). CSP is
// customized (not just helmet's defaults) to allow the Umami analytics
// script and its pageview beacon — helmet's default script-src/connect-src
// are both 'self' only, which would silently block Umami with no visible
// error beyond the browser console. The script itself is served from
// cloud.umami.is, but it reports pageviews to a DIFFERENT subdomain,
// gateway.umami.is — confirmed by actually loading the page and watching
// the network tab; connect-src needs both.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'script-src': ["'self'", 'https://cloud.umami.is'],
        'connect-src': ["'self'", 'https://cloud.umami.is', 'https://gateway.umami.is'],
      },
    },
  })
);

// Restrict cross-origin requests to your actual frontend, not "anyone".
// Set FRONTEND_URL in your hosting platform's environment variables once
// you know your real deployed URL. Falls back to localhost for local dev.
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin }));

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limit for the data endpoints — generous, since these are just
// reading local JSON files (cheap), but still worth capping against
// abuse/scraping.
const dataLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// ETFs and REITs (from both exchanges) live in a separate 'funds' market —
// a different instrument type from operating-company equities, so mixing
// them into VFEX/ZSE would be misleading in a %-change or market-cap sort.
function dataFileFor(market) {
  if (market === 'zse') return 'zse-data.json';
  if (market === 'funds') return 'funds-data.json';
  return 'vfex-data.json';
}
function historyFileFor(market) {
  if (market === 'zse') return 'zse-history.json';
  if (market === 'funds') return 'funds-history.json';
  return 'vfex-history.json';
}

app.get('/api/signals', dataLimiter, async (req, res) => {
  try {
    const market = String(req.query.market || 'vfex').toLowerCase();
    const range = String(req.query.range || 'daily').toLowerCase();
    const raw = await readFile(path.join(__dirname, dataFileFor(market)), 'utf8');
    const records = JSON.parse(raw);

    // "Daily" is just today's snapshot as-is — the change field already
    // reflects one day's move, straight from the source PDF.
    if (range === 'daily') {
      return res.json(records);
    }

    // For "week"/"month", recompute `change` from real recorded history
    // instead of the daily figure. Uses TRADING-day offsets, not calendar
    // days — 5 trading days ≈ 1 week, 21 ≈ 1 month — since calendar-day
    // math would land on weekends/holidays with no data. Falls back to
    // the daily change (flagged) for any company without enough history
    // yet, e.g. anything newly added.
    const historyFile = historyFileFor(market);
    const historyRaw = await readFile(path.join(__dirname, historyFile), 'utf8');
    const history = JSON.parse(historyRaw);

    const byTicker = {};
    for (const entry of history) {
      if (!byTicker[entry.ticker]) byTicker[entry.ticker] = [];
      byTicker[entry.ticker].push(entry);
    }
    for (const ticker in byTicker) {
      byTicker[ticker].sort((a, b) => a.date.localeCompare(b.date));
    }

    const tradingDaysBack = range === 'month' ? 21 : 5;

    const withRangeChange = records.map((record) => {
      const tickerHistory = byTicker[record.ticker];
      if (!tickerHistory || tickerHistory.length < 2) {
        return { ...record, rangeChangeAvailable: false };
      }

      const compareIndex = Math.max(0, tickerHistory.length - 1 - tradingDaysBack);
      const comparePrice = tickerHistory[compareIndex].closingPrice;
      const currentPrice = record.closingPrice;

      if (!comparePrice) {
        return { ...record, rangeChangeAvailable: false };
      }

      const change = ((currentPrice - comparePrice) / comparePrice) * 100;
      return {
        ...record,
        change: Number(change.toFixed(2)),
        rangeChangeAvailable: true,
        rangeCompareDate: tickerHistory[compareIndex].date,
      };
    });

    res.json(withRangeChange);
  } catch (error) {
    console.error('Error reading signal data:', error);
    res.status(500).json({ error: 'Unable to load market data.' });
  }
});

// Returns price history for one ticker, for the requested range.
// NOTE: VFEX only publishes one closing price per day (no intraday data),
// so "week"/"month"/"all" mean "last 7 daily closes" / "last 30 daily
// closes" / "everything recorded" — there's no meaningful finer-grained
// "day" option, since a single day only ever has one data point.
// "1W"/"1M"/"1Y" filter by actual CALENDAR days back from today, not by
// counting the last N recorded entries — since real gaps exist in the
// history (skipped update days, anomalous PDFs), entry-count-based
// slicing could silently span more or less than the labeled period. Date
// filtering is honest regardless of gaps. If you have less than a year of
// history yet, "1Y" simply shows everything you have — that's expected,
// not a bug.
app.get('/api/history', dataLimiter, async (req, res) => {
  try {
    const ticker = String(req.query.ticker || '').toUpperCase().slice(0, 20);
    const range = String(req.query.range || 'month').toLowerCase();
    const market = String(req.query.market || 'vfex').toLowerCase();

    if (!ticker) {
      return res.status(400).json({ error: 'ticker query param is required' });
    }

    const raw = await readFile(path.join(__dirname, historyFileFor(market)), 'utf8');
    const history = JSON.parse(raw);

    const tickerHistory = history
      .filter((entry) => entry.ticker.toUpperCase() === ticker)
      .sort((a, b) => a.date.localeCompare(b.date));

    const rangeDays = { week: 7, month: 30, year: 365 }[range] ?? 30;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - rangeDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const trimmed = tickerHistory.filter((entry) => entry.date >= cutoffStr);

    res.json(trimmed);
  } catch (error) {
    console.error('Error reading price history:', error);
    res.status(500).json({ error: 'Unable to load price history.' });
  }
});

// Serve the built React frontend. Run "npm run build" first (see
// package.json) — this expects client/dist to exist.
const clientDist = path.join(__dirname, 'client', 'dist');
app.use(express.static(clientDist));

// SPA fallback: any GET request that isn't an API route or a real static
// file gets index.html, so the React app's own routing/state takes over.
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});