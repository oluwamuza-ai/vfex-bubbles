import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import VFEXBubbles, { tickerFor, formatChange, formatMarketCap, colorForChange } from './VFEXBubbles';
import CompanyList from './CompanyList';
import PriceChart from './PriceChart';

// NOTE: VFEX only publishes one closing price per trading day (no intraday
// data), so there's no meaningful "days" granularity finer than a single
// daily close. These ranges reflect what's actually recordable: a week of
// daily closes, a month of daily closes, or everything collected so far.
const HISTORY_RANGES = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All' },
];

function App() {
  const [signals, setSignals] = useState(null);
  const [showList, setShowList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    setShowAbout(false);
  }, [selectedCompany]);
  const [historyRange, setHistoryRange] = useState('month');
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [market, setMarket] = useState('vfex');
  const [bubbleRange, setBubbleRange] = useState('daily');
  const [sizeBy, setSizeBy] = useState('change');
  const [lastUpdated, setLastUpdated] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    setSelectedCompany(null);
    fetch(`http://localhost:5000/api/signals?market=${market}&range=${bubbleRange}`)
      .then((res) => res.json())
      .then((data) => {
        setSignals(Array.isArray(data) ? data : []);
        const stamp = new Date().toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        setLastUpdated(stamp);
      })
      .catch(() => setSignals([]));
  }, [market, bubbleRange]);

  useEffect(() => {
    if (showList && listRef.current) {
      listRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showList]);

  const filteredSignals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!signals || !query) return signals || [];

    return signals.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const ticker = String(item.ticker || '').toLowerCase();
      return name.includes(query) || ticker.includes(query);
    });
  }, [signals, searchQuery]);

  // Fetch real recorded price history whenever a company is selected or the
  // range toggle changes. Replaces the old fake sine-wave generator.
  useEffect(() => {
    if (!selectedCompany) {
      setHistoryData([]);
      return;
    }

    setHistoryLoading(true);
    fetch(`http://localhost:5000/api/history?ticker=${encodeURIComponent(selectedCompany.ticker)}&range=${historyRange}&market=${market}`)
      .then((res) => res.json())
      .then((data) => setHistoryData(Array.isArray(data) ? data : []))
      .catch(() => setHistoryData([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedCompany, historyRange, market]);

  const chartPoints = useMemo(() => {
    return historyData.map((entry) => ({
      label: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Number(entry.closingPrice) || 0,
    }));
  }, [historyData]);

  return (
    <div className="app-shell">
      <header
        className="hero-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          margin: '0 calc(-50vw + 50%)',
          width: '100vw',
          borderBottom: '1px solid #242424',
          borderRadius: 0,
          padding: '18px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>{market === 'zse' ? 'ZSE Bubbles' : 'VFEX Bubbles'}</h1>

          <div style={{ display: 'inline-flex', gap: '6px', background: '#171717', border: '1px solid #2b2b2b', borderRadius: '999px', padding: '4px' }}>
            {[
              { key: 'daily', label: '1D' },
              { key: 'week', label: '1W' },
              { key: 'month', label: '1M' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setBubbleRange(option.key)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: 'none',
                  background: bubbleRange === option.key ? '#2b2b2b' : 'transparent',
                  color: bubbleRange === option.key ? '#f7f7f7' : '#9a9a9a',
                  fontSize: '12px',
                  fontWeight: bubbleRange === option.key ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'inline-flex', gap: '6px', background: '#171717', border: '1px solid #2b2b2b', borderRadius: '999px', padding: '4px' }}>
            {[
              { key: 'change', label: '% Change' },
              { key: 'marketCap', label: 'Market Cap' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setSizeBy(option.key)}
                title={option.key === 'marketCap' ? 'Bubble size reflects company size, not price movement' : 'Bubble size reflects how much the price moved'}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: 'none',
                  background: sizeBy === option.key ? '#2b2b2b' : 'transparent',
                  color: sizeBy === option.key ? '#f7f7f7' : '#9a9a9a',
                  fontSize: '12px',
                  fontWeight: sizeBy === option.key ? 700 : 400,
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9a9a9a' }}>Market</span>
            <select
              value={market}
              onChange={(event) => setMarket(event.target.value)}
              style={{
                borderRadius: '10px',
                border: '1px solid #2b2b2b',
                background: '#171717',
                color: '#f7f7f7',
                padding: '10px 12px',
              }}
            >
              <option value="vfex">VFEX</option>
              <option value="zse">ZSE</option>
            </select>
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '220px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#9a9a9a' }}>Search</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Ticker or company"
              style={{
                borderRadius: '10px',
                border: '1px solid #2b2b2b',
                background: '#171717',
                color: '#f7f7f7',
                padding: '10px 12px',
                minWidth: '220px',
              }}
            />
          </label>

          <button
            onClick={() => setShowList((value) => !value)}
            aria-label={showList ? 'Hide company list' : 'Show company list'}
            aria-pressed={showList}
            title={showList ? 'Hide list view' : 'Show list view'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              border: `1px solid ${showList ? '#4b4b4b' : '#2b2b2b'}`,
              background: showList ? '#262626' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f7f7f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Canvas sits flush against the header — zero gap. "Last updated" and
          the range-availability warning are small overlays positioned over
          the top of the canvas instead of block elements, since a block
          here would recreate the gap we just removed. */}
      <div
        style={{
          position: 'relative',
          margin: '0 calc(-50vw + 50%)',
          width: '100vw',
        }}
      >
        {(lastUpdated || (bubbleRange !== 'daily' && signals?.some((s) => s.rangeChangeAvailable === false))) && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '16px',
              zIndex: 5,
              textAlign: 'right',
              pointerEvents: 'none',
            }}
          >
            {lastUpdated && (
              <div style={{ color: '#9a9a9a', fontSize: '11px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                Last updated: {lastUpdated}
              </div>
            )}
            {bubbleRange !== 'daily' && signals?.some((s) => s.rangeChangeAvailable === false) && (
              <div style={{ marginTop: '2px', fontSize: '10px', color: '#fde68a', textShadow: '0 1px 3px rgba(0,0,0,0.8)', maxWidth: '260px' }}>
                Some companies lack enough history for a {bubbleRange === 'week' ? '1W' : '1M'} view — showing daily change instead.
              </div>
            )}
          </div>
        )}

        <VFEXBubbles data={filteredSignals} onBubbleSelect={setSelectedCompany} sizeBy={sizeBy} />
      </div>

      {showList && (
        <div ref={listRef}>
          <CompanyList data={filteredSignals} onSelect={setSelectedCompany} />
        </div>
      )}

      {selectedCompany && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${selectedCompany.name}`}
          onClick={() => setSelectedCompany(null)}
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
              width: 'min(760px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              borderRadius: '16px',
              background: '#121212',
              border: '1px solid #2b2b2b',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.42)',
              padding: '22px',
              color: '#f7f7f7',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9a9a9a' }}>Company detail</div>
                <h2 style={{ margin: '4px 0 0', fontSize: '24px' }}>{selectedCompany.name}</h2>
                <div style={{ marginTop: '4px', color: '#9a9a9a' }}>{selectedCompany.ticker}</div>

                <button
                  onClick={() => setShowAbout((value) => !value)}
                  style={{
                    marginTop: '10px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    border: '1px solid #2b2b2b',
                    background: showAbout ? '#262626' : 'transparent',
                    color: '#e1e1e1',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {showAbout ? 'Hide' : 'What does this company do?'}
                </button>

                {showAbout && (
                  <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: 1.6, color: '#cfcfcf', maxWidth: '520px' }}>
                    {selectedCompany.description || 'No description on file for this company yet.'}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                aria-label="Close details"
                style={{
                  border: '1px solid #2b2b2b',
                  background: '#171717',
                  color: '#f7f7f7',
                  borderRadius: '999px',
                  width: '44px',
                  height: '44px',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginTop: '16px' }}>
              <div style={{ padding: '12px', borderRadius: '12px', background: '#171717', border: '1px solid #232323' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9a9a9a' }}>Closing price</div>
                <div style={{ marginTop: '6px', fontSize: '20px', fontWeight: 700 }}>${Number(selectedCompany.closingPrice || 0).toFixed(4)}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: '#171717', border: '1px solid #232323' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9a9a9a' }}>Change</div>
                <div style={{ marginTop: '6px', fontSize: '20px', fontWeight: 700, color: colorForChange(selectedCompany.change) }}>
                  {formatChange(selectedCompany.change)}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: '#171717', border: '1px solid #232323' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9a9a9a' }}>Market cap</div>
                <div style={{ marginTop: '6px', fontSize: '20px', fontWeight: 700 }}>{formatMarketCap(Number(selectedCompany.marketCap) || 0)}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '12px', background: '#171717', border: '1px solid #232323' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9a9a9a' }}>Notes</div>
                <div style={{ marginTop: '6px', fontSize: '14px', color: '#cfcfcf' }}>
                  {selectedCompany.estimated ? 'Estimated market cap from the current dataset.' : 'Officially listed data point.'}
                </div>
              </div>
            </div>

            <div style={{ marginTop: '18px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {HISTORY_RANGES.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setHistoryRange(option.key)}
                  style={{
                    border: `1px solid ${historyRange === option.key ? '#4b4b4b' : '#2b2b2b'}`,
                    borderRadius: '999px',
                    background: historyRange === option.key ? '#262626' : 'transparent',
                    color: historyRange === option.key ? '#f7f7f7' : '#9a9a9a',
                    padding: '8px 12px',
                    cursor: 'pointer',
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '16px', borderRadius: '14px', padding: '14px', background: '#101010', border: '1px solid #232323' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#9a9a9a' }}>Price history</div>
              <div style={{ fontSize: '13px', color: '#cfcfcf', marginTop: '4px' }}>
                Recorded end-of-day closing prices for the selected company.
              </div>

              {historyLoading ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#9a9a9a', fontSize: '13px' }}>
                  Loading history…
                </div>
              ) : chartPoints.length < 2 ? (
                <div style={{ padding: '30px 12px', textAlign: 'center', color: '#9a9a9a', fontSize: '13px', lineHeight: 1.6 }}>
                  Not enough recorded history yet to draw a trend — this app started tracking daily closes on{' '}
                  {historyData[0]?.date ? new Date(historyData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'a recent date'}.
                  <br />
                  Check back after a few more trading days.
                  <br />
                  <strong style={{ color: '#f7f7f7' }}>Today's close: ${Number(selectedCompany.closingPrice || 0).toFixed(4)}</strong>
                </div>
              ) : (
                <PriceChart points={chartPoints} color={colorForChange(selectedCompany.change)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
