import { useMemo, useState } from 'react';
import { colorForChange, formatMarketCap, tickerFor, formatChange } from './VFEXBubbles';

// ============================================================================
// 🎨 LIST APPEARANCE — edit this block to restyle the table
// ============================================================================
const LIST_STYLE = {
  background: '#171717',
  border: '1px solid #2b2b2b',
  headerColor: '#9a9a9a',
  rowBorder: '#232323',
  rowHoverBackground: '#1f1f1f',
  textColor: '#f7f7f7',
  mutedTextColor: '#9a9a9a',
};

const SORT_OPTIONS = [
  { key: 'marketCap', label: 'Market cap' },
  { key: 'name', label: 'Name' },
  { key: 'closingPrice', label: 'Price' },
  { key: 'change', label: 'Change' },
];

export default function CompanyList({ data = [], onSelect }) {
  const [sortKey, setSortKey] = useState('marketCap');
  const [sortDir, setSortDir] = useState('desc');

  const rows = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let result;
      if (sortKey === 'name') {
        result = String(a.name || '').localeCompare(String(b.name || ''));
      } else {
        result = (Number(a[sortKey]) || 0) - (Number(b[sortKey]) || 0);
      }
      return sortDir === 'asc' ? result : -result;
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  function handleSort(key) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <section
      style={{
        marginTop: '24px',
        borderRadius: '12px',
        background: LIST_STYLE.background,
        border: `1px solid ${LIST_STYLE.border}`,
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 18px', display: 'flex', gap: '10px', flexWrap: 'wrap', borderBottom: `1px solid ${LIST_STYLE.rowBorder}` }}>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleSort(option.key)}
            style={{
              padding: '6px 12px',
              borderRadius: '999px',
              border: `1px solid ${sortKey === option.key ? '#4b4b4b' : LIST_STYLE.rowBorder}`,
              background: sortKey === option.key ? '#262626' : 'transparent',
              color: sortKey === option.key ? LIST_STYLE.textColor : LIST_STYLE.mutedTextColor,
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {option.label} {sortKey === option.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: LIST_STYLE.headerColor, textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.1em' }}>
              <th style={{ padding: '10px 18px' }}>Company</th>
              <th style={{ padding: '10px 18px' }}>Ticker</th>
              <th style={{ padding: '10px 18px', textAlign: 'right' }}>Price</th>
              <th style={{ padding: '10px 18px', textAlign: 'right' }}>Market cap</th>
              <th style={{ padding: '10px 18px', textAlign: 'right' }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.ticker}
                onClick={() => onSelect?.(item)}
                style={{ borderTop: `1px solid ${LIST_STYLE.rowBorder}`, cursor: onSelect ? 'pointer' : 'default' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = LIST_STYLE.rowHoverBackground; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '10px 18px', color: LIST_STYLE.textColor }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.logoUrl || item.logo || item.iconUrl || item.icon ? (
                      <img
                        src={item.logoUrl || item.logo || item.iconUrl || item.icon}
                        alt={`${item.name} logo`}
                        style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '6px', background: '#111' }}
                      />
                    ) : null}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{item.name}</span>
                      {item.estimated && (
                        <span style={{ fontSize: '11px', color: '#fde68a' }} title="Market cap is estimated — no shares-in-issue on file">
                          ⚠
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 18px', color: LIST_STYLE.mutedTextColor }}>{tickerFor(item)}</td>
                <td style={{ padding: '10px 18px', textAlign: 'right', color: LIST_STYLE.textColor }}>
                  {item.currency === 'ZWG' ? 'ZWG ' : '$'}{Number(item.closingPrice || 0)}
                </td>
                <td style={{ padding: '10px 18px', textAlign: 'right', color: LIST_STYLE.textColor }}>
                  {formatMarketCap(Number(item.marketCap) || 0, item.currency)}
                </td>
                <td style={{ padding: '10px 18px', textAlign: 'right', fontWeight: 700, color: colorForChange(item.change) }}>
                  {formatChange(item.change)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '18px', textAlign: 'center', color: LIST_STYLE.mutedTextColor }}>
                  No data loaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
