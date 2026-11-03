import { useEffect, useMemo, useState } from 'react';
import PriceChart from './PriceChart';

// Private paper-trading dashboard. Only ever mounted when a fund access key
// is present (see App.jsx) — every fetch here carries that key, and the
// server returns a plain 404 for anything without a matching
// FUND_ACCESS_KEY, so this component simply renders nothing useful without
// one rather than ever showing real data to the wrong caller.
const FUNDS = [
  { key: 'VFEX', label: 'VFEX Fund', currency: 'USD', color: '#4ade80' },
  { key: 'ZSE', label: 'ZSE Fund', currency: 'ZWG', color: '#60a5fa' },
];

function formatMoney(value, currency) {
  const prefix = currency === 'ZWG' ? 'ZWG ' : '$';
  return `${prefix}${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function FundPanel({ fundKey, label, currency, color, fundState, history }) {
  const holdings = fundState?.holdings ?? [];
  const cash = fundState?.cash ?? 0;
  const startingCash = fundState?.startingCash ?? 0;

  const points = useMemo(
    () =>
      history.map((entry) => ({
        label: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: entry.value,
      })),
    [history]
  );

  const latestValue = points.length > 0 ? points[points.length - 1].value : startingCash;
  const totalReturn = startingCash > 0 ? ((latestValue - startingCash) / startingCash) * 100 : null;

  return (
    <div style={{ border: '1px solid #2b2b2b', borderRadius: '14px', padding: '16px', background: '#171717' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>{label}</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700 }}>{formatMoney(latestValue, currency)}</span>
          {totalReturn != null && (
            <span style={{ fontSize: '13px', fontWeight: 600, color: totalReturn >= 0 ? '#4ade80' : '#f87171' }}>
              {totalReturn >= 0 ? '+' : ''}
              {totalReturn.toFixed(1)}% all-time
            </span>
          )}
        </div>
      </div>

      {points.length > 1 ? (
        <div style={{ marginTop: '12px' }}>
          <PriceChart points={points} color={color} currency={currency} />
        </div>
      ) : (
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#9a9a9a' }}>
          Not enough NAV history yet to chart — check back after a few daily runs.
        </div>
      )}

      <div style={{ marginTop: '14px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9a9a9a' }}>
        Cash: {formatMoney(cash, currency)}
      </div>

      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {holdings.length === 0 && <div style={{ fontSize: '12px', color: '#6b6b6b', padding: '6px 0' }}>No open positions.</div>}
        {holdings.map((holding) => (
          <div
            key={holding.ticker}
            style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #222' }}
          >
            <span>{holding.ticker}</span>
            <span style={{ color: '#9a9a9a' }}>
              {holding.shares.toFixed(2)} sh @ {formatMoney(holding.avgCost, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VirtualFund({ fundKey, onClose }) {
  const [fundData, setFundData] = useState(null);
  const [history, setHistory] = useState({ VFEX: [], ZSE: [] });
  const [error, setError] = useState(false);

  useEffect(() => {
    const key = encodeURIComponent(fundKey);
    Promise.all([
      fetch(`/api/fund?key=${key}`).then((res) => (res.ok ? res.json() : Promise.reject())),
      fetch(`/api/fund/history?key=${key}&market=VFEX`).then((res) => (res.ok ? res.json() : [])),
      fetch(`/api/fund/history?key=${key}&market=ZSE`).then((res) => (res.ok ? res.json() : [])),
    ])
      .then(([fund, vfexHistory, zseHistory]) => {
        setFundData(fund);
        setHistory({ VFEX: vfexHistory, ZSE: zseHistory });
      })
      .catch(() => setError(true));
  }, [fundKey]);

  const recentTransactions = useMemo(() => {
    if (!fundData) return [];
    return [...fundData.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  }, [fundData]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Virtual fund dashboard"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 6, 23, 0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '18px',
        zIndex: 30,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(960px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          borderRadius: '16px',
          background: '#121212',
          border: '1px solid #2b2b2b',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.42)',
          padding: '18px 20px 20px',
          color: '#f7f7f7',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '19px' }}>Virtual Fund</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: '1px solid #2b2b2b',
              background: '#171717',
              color: '#f7f7f7',
              borderRadius: '999px',
              width: '32px',
              height: '32px',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#f87171' }}>
            Couldn't load fund data — the access key may be wrong or expired.
          </div>
        )}

        {!error && !fundData && <div style={{ marginTop: '16px', fontSize: '13px', color: '#9a9a9a' }}>Loading…</div>}

        {fundData && (
          <>
            <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '14px' }}>
              {FUNDS.map((fund) => (
                <FundPanel
                  key={fund.key}
                  fundKey={fund.key}
                  label={fund.label}
                  currency={fund.currency}
                  color={fund.color}
                  fundState={fundData.funds[fund.key]}
                  history={history[fund.key]}
                />
              ))}
            </div>

            <div style={{ marginTop: '18px', borderTop: '1px solid #2b2b2b', paddingTop: '14px' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9a9a9a', marginBottom: '8px' }}>
                Recent Trades
              </div>
              {recentTransactions.length === 0 && <div style={{ fontSize: '12px', color: '#6b6b6b' }}>No trades yet.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {recentTransactions.map((tx, index) => (
                  <div
                    key={index}
                    style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px', padding: '6px 0', borderBottom: '1px solid #1c1c1c' }}
                  >
                    <span style={{ color: '#6b6b6b', flexShrink: 0 }}>{tx.date}</span>
                    <span style={{ flexShrink: 0, color: tx.action === 'buy' ? '#4ade80' : '#f87171', fontWeight: 600, textTransform: 'uppercase' }}>
                      {tx.action}
                    </span>
                    <span style={{ flexShrink: 0 }}>{tx.ticker}</span>
                    <span style={{ color: '#9a9a9a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
