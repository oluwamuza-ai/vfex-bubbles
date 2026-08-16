import { useMemo, useRef, useState } from 'react';

// ============================================================================
// 📈 CHART CONFIG — edit here for sizing/style tweaks
// ============================================================================
const CHART = {
  width: 640,
  height: 260,
  paddingX: 44,   // left/right padding — needs room for y-axis price labels
  paddingY: 28,
  maxXLabels: 6,  // show at most this many x-axis date labels, evenly spaced
  yLabelCount: 4, // number of horizontal gridlines / y-axis price labels
};

function formatPrice(value, currency = 'USD') {
  const prefix = currency === 'ZWG' ? 'ZWG ' : '$';
  if (value >= 1000) return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `${prefix}${value.toFixed(2)}`;
  return `${prefix}${value.toFixed(4)}`;
}

// Converts a sequence of points into a smooth curve (Catmull-Rom spline
// converted to cubic beziers) instead of sharp straight-line segments —
// this is what gives the line its polished, "real financial chart" look
// instead of a jagged connect-the-dots line.
function smoothPath(coords) {
  if (coords.length < 2) return '';
  if (coords.length === 2) return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;

  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export default function PriceChart({ points = [], color = '#4ade80', currency = 'USD' }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const { width, height, paddingX, paddingY, maxXLabels, yLabelCount } = CHART;

  const { coords, minValue, maxValue } = useMemo(() => {
    if (points.length === 0) return { coords: [], minValue: 0, maxValue: 0 };
    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 1;

    const computed = points.map((point, index) => ({
      x: paddingX + (index / Math.max(1, points.length - 1)) * (width - paddingX * 2),
      y: height - paddingY - ((point.value - min) / spread) * (height - paddingY * 2),
      ...point,
    }));

    return { coords: computed, minValue: min, maxValue: max };
  }, [points, width, height, paddingX, paddingY]);

  const linePath = useMemo(() => smoothPath(coords), [coords]);
  const areaPath = useMemo(() => {
    if (coords.length < 2) return '';
    const baseline = height - paddingY;
    return `${smoothPath(coords)} L ${coords[coords.length - 1].x} ${baseline} L ${coords[0].x} ${baseline} Z`;
  }, [coords, height, paddingY]);

  // Which x-axis labels to actually show — evenly spaced indices, capped
  // at maxXLabels regardless of how many data points there are.
  const labelIndices = useMemo(() => {
    if (coords.length <= maxXLabels) return coords.map((_, i) => i);
    const step = (coords.length - 1) / (maxXLabels - 1);
    return Array.from({ length: maxXLabels }, (_, i) => Math.round(i * step));
  }, [coords, maxXLabels]);

  const yTicks = useMemo(() => {
    const spread = maxValue - minValue || 1;
    return Array.from({ length: yLabelCount }, (_, i) => {
      const value = minValue + (spread * i) / (yLabelCount - 1);
      const y = height - paddingY - (i / (yLabelCount - 1)) * (height - paddingY * 2);
      return { value, y };
    });
  }, [minValue, maxValue, height, paddingY, yLabelCount]);

  function handlePointerMove(event) {
    if (coords.length === 0 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const relativeX = ((clientX - rect.left) / rect.width) * width;

    let closest = 0;
    let closestDistance = Infinity;
    coords.forEach((c, i) => {
      const distance = Math.abs(c.x - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  if (coords.length < 2) return null; // caller handles the "not enough data" state

  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ marginTop: '10px', touchAction: 'none', cursor: 'crosshair' }}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => setHoverIndex(null)}
        onTouchMove={handlePointerMove}
        onTouchEnd={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="priceFillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines + y-axis price labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={paddingX} y1={tick.y} x2={width - 12} y2={tick.y} stroke="#2a2a2a" strokeDasharray="4 4" />
            <text x={paddingX - 8} y={tick.y} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#9a9a9a">
              {formatPrice(tick.value, currency)}
            </text>
          </g>
        ))}

        {/* Gradient area fill under the line */}
        <path d={areaPath} fill="url(#priceFillGradient)" stroke="none" />

        {/* The smooth price line itself */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* x-axis date labels — sparse, evenly spaced regardless of point count */}
        {labelIndices.map((i) => (
          <text key={i} x={coords[i].x} y={height - 6} textAnchor="middle" fontSize="10" fill="#9a9a9a">
            {coords[i].label}
          </text>
        ))}

        {/* Hover crosshair + highlighted point + tooltip */}
        {hovered && (
          <>
            <line x1={hovered.x} y1={paddingY / 2} x2={hovered.x} y2={height - paddingY} stroke="#4b4b4b" strokeWidth="1" />
            <circle cx={hovered.x} cy={hovered.y} r="5" fill={color} stroke="#fff" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* HTML tooltip overlay (easier to style/position precisely than SVG text) */}
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: `${(hovered.x / width) * 100}%`,
            top: 0,
            transform: hovered.x > width * 0.7 ? 'translateX(-105%)' : 'translateX(8px)',
            background: '#1c1c1c',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '12px',
            color: '#f7f7f7',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ color: '#9a9a9a', fontSize: '10px' }}>{hovered.label}</div>
          <div style={{ fontWeight: 700 }}>{formatPrice(hovered.value, currency)}</div>
        </div>
      )}
    </div>
  );
}
