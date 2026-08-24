import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LinePath, AreaClosed } from '@visx/shape';
import { scaleLinear } from '@visx/scale';
import { curveLinear } from '@visx/curve';
import { LinearGradient } from '@visx/gradient';
import { useTooltip, TooltipWithBounds, defaultStyles as defaultTooltipStyles } from '@visx/tooltip';
import { localPoint } from '@visx/event';
import { clamp } from './utils';

// ============================================================================
// 📈 CHART CONFIG — edit here for sizing/style tweaks
// ============================================================================
const CHART = {
  width: 820,
  height: 340,
  paddingX: 48,   // left/right padding — needs room for y-axis price labels
  paddingY: 28,
  maxXLabels: 7,  // show at most this many x-axis date labels, evenly spaced
  yLabelCount: 5, // number of horizontal gridlines / y-axis price labels
  minZoomPoints: 3,   // can't zoom in past showing this many points
  zoomStep: 1.15,     // wheel-zoom multiplier per scroll tick
};

function formatPrice(value, currency = 'USD') {
  const prefix = currency === 'ZWG' ? 'ZWG ' : '$';
  if (value >= 1000) return `${prefix}${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (value >= 1) return `${prefix}${value.toFixed(2)}`;
  return `${prefix}${value.toFixed(4)}`;
}

const tooltipStyles = {
  ...defaultTooltipStyles,
  background: '#1c1c1c',
  border: '1px solid #333',
  borderRadius: '8px',
  padding: '6px 10px',
  color: '#f7f7f7',
};

export default function PriceChart({ points = [], color = '#4ade80', currency = 'USD' }) {
  const svgRef = useRef(null);
  const { width, height, paddingX, paddingY, maxXLabels, yLabelCount, minZoomPoints, zoomStep } = CHART;

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    showTooltip,
    hideTooltip,
  } = useTooltip();

  // ---------------------------------------------------------------------
  // ZOOM & PAN STATE — unchanged from before. viewRange is null when
  // showing the full dataset, or [startIndex, endIndex] (fractional index
  // positions) once zoomed/panned. Reset whenever the underlying data
  // changes (fixes a bug where a stale zoom window got reapplied to fresh
  // data after switching 1W/1M/1Y or selecting a different company).
  // ---------------------------------------------------------------------
  const [viewRange, setViewRange] = useState(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartRangeRef = useRef(null);
  const pinchDistRef = useRef(null);
  const lastTapRef = useRef(0);
  const touchStartPosRef = useRef(null);
  const TOUCH_DRAG_THRESHOLD = 10; // px of finger movement before a touch becomes a pan instead of a tooltip scrub

  // ---------------------------------------------------------------------
  // DRAW-IN ANIMATION — the line strokes itself in left-to-right on first
  // load and on any genuinely new dataset (range switch, different
  // company), instead of just appearing. Classic SVG technique: set
  // stroke-dasharray to the path's own real length (measured via
  // getTotalLength(), not guessed — a guessed value either cuts the line
  // off early or leaves a long dead pause before anything's visible),
  // start stroke-dashoffset at that same length (fully hidden), then
  // transition it to 0. Deliberately keyed on `points`, NOT
  // `visiblePoints` — the latter also changes during interactive
  // zoom/pan, which should never replay this.
  //
  // This writes directly to the path's DOM style via the ref rather than
  // through React state/JSX style props — tried that first, and the two
  // state updates (set the hidden length, then flip to revealed) got
  // batched into a single commit, so the browser never registered an
  // intermediate "hidden" frame to transition FROM and the animation just
  // snapped straight to its end state. Confirmed by directly polling
  // getComputedStyle() through the transition window — no intermediate
  // value ever appeared, only the start and end. The manual reflow below
  // (reading getBoundingClientRect between the two style writes) is what
  // actually forces the browser to commit the hidden state first.
  // ---------------------------------------------------------------------
  const pathRef = useRef(null);

  useEffect(() => {
    setViewRange(null);
    hideTooltip();

    // Waits one frame for the viewRange-reset render above to actually
    // paint, so what gets measured below is the new full-range path —
    // not a stale zoomed-in one left over from before this data change.
    const raf = requestAnimationFrame(() => {
      const path = pathRef.current;
      if (!path) return;
      const length = path.getTotalLength();

      path.style.transition = 'none';
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
      path.getBoundingClientRect(); // force the reflow described above
      path.style.transition = 'stroke-dashoffset 650ms ease-out';
      path.style.strokeDashoffset = '0';
    });
    return () => cancelAnimationFrame(raf);
  }, [points, hideTooltip]);

  const visiblePoints = useMemo(() => {
    if (!viewRange || points.length === 0) return points;
    const startIdx = Math.max(0, Math.floor(viewRange[0]));
    const endIdx = Math.min(points.length - 1, Math.ceil(viewRange[1]));
    return points.slice(startIdx, endIdx + 1);
  }, [points, viewRange]);

  // visx scales — replace the old hand-rolled linear interpolation math.
  // xScale maps an array INDEX (0..n-1) to pixel space; yScale maps a
  // price value to pixel space (inverted, since SVG y grows downward).
  const { xScale, yScale, minValue, maxValue } = useMemo(() => {
    if (visiblePoints.length === 0) {
      return { xScale: null, yScale: null, minValue: 0, maxValue: 0 };
    }
    const values = visiblePoints.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const spread = max - min || 1;
    const paddedMin = min - spread * 0.02;
    const paddedMax = max + spread * 0.02;

    const x = scaleLinear({
      domain: [0, Math.max(1, visiblePoints.length - 1)],
      range: [paddingX, width - paddingX],
    });
    const y = scaleLinear({
      domain: [paddedMin, paddedMax],
      range: [height - paddingY, paddingY],
    });

    return { xScale: x, yScale: y, minValue: min, maxValue: max };
  }, [visiblePoints, width, height, paddingX, paddingY]);

  // Index accessors — visx's LinePath/AreaClosed call x()/y() with
  // (datum, index), so using the index argument directly is both correct
  // and O(1) per point (avoids an O(n) indexOf lookup per point, which
  // would make rendering O(n²) for larger histories).
  const getX = useCallback((d, i) => xScale(i), [xScale]);
  const getY = useCallback((d) => yScale(d.value), [yScale]);

  // Which x-axis labels to actually show — evenly spaced indices, capped
  // at maxXLabels regardless of how many data points are currently visible.
  const labelIndices = useMemo(() => {
    const n = visiblePoints.length;
    if (n === 0) return [];
    if (n <= maxXLabels) return visiblePoints.map((_, i) => i);
    const step = (n - 1) / (maxXLabels - 1);
    return Array.from({ length: maxXLabels }, (_, i) => Math.round(i * step));
  }, [visiblePoints, maxXLabels]);

  const yTicks = useMemo(() => {
    if (!yScale) return [];
    const spread = maxValue - minValue || 1;
    return Array.from({ length: yLabelCount }, (_, i) => {
      const value = minValue + (spread * i) / (yLabelCount - 1);
      return { value, y: yScale(value) };
    });
  }, [yScale, minValue, maxValue, yLabelCount]);

  // ---------------------------------------------------------------------
  // ZOOM: shared by scroll-wheel (desktop) and pinch (touch). Zooms toward
  // a specific SVG-space x position, so the point under the cursor/pinch
  // stays fixed instead of the view jumping around.
  // ---------------------------------------------------------------------
  const applyZoom = useCallback((factor, centerSvgX) => {
    if (points.length < minZoomPoints) return;

    const [curStart, curEnd] = viewRange || [0, points.length - 1];
    const span = curEnd - curStart;

    const fraction = clamp((centerSvgX - paddingX) / (width - paddingX * 2), 0, 1);
    const centerIndex = curStart + fraction * span;

    let newSpan = clamp(span * factor, minZoomPoints - 1, points.length - 1);
    const fractionAtCenter = span === 0 ? 0.5 : (centerIndex - curStart) / span;

    let newStart = centerIndex - fractionAtCenter * newSpan;
    let newEnd = newStart + newSpan;

    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > points.length - 1) {
      newStart -= newEnd - (points.length - 1);
      newEnd = points.length - 1;
    }
    newStart = Math.max(0, newStart);

    if (newSpan >= points.length - 1 - 0.01) {
      setViewRange(null);
    } else {
      setViewRange([newStart, newEnd]);
    }
  }, [points.length, viewRange, minZoomPoints, paddingX, width]);

  function handleWheel(event) {
    if (points.length < minZoomPoints || !svgRef.current) return;
    event.preventDefault();
    const point = localPoint(svgRef.current, event);
    if (!point) return;
    applyZoom(event.deltaY > 0 ? zoomStep : 1 / zoomStep, point.x);
  }

  // ---------------------------------------------------------------------
  // PAN: click-and-drag (mouse) or single-finger drag (touch).
  // ---------------------------------------------------------------------
  function panTo(clientX) {
    if (!svgRef.current || !dragStartRangeRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const pixelDeltaX = clientX - dragStartXRef.current;
    const svgDeltaX = (pixelDeltaX / rect.width) * width;

    const [startRange, endRange] = dragStartRangeRef.current;
    const span = endRange - startRange;
    const indexDelta = -(svgDeltaX / (width - paddingX * 2)) * span;

    let newStart = startRange + indexDelta;
    let newEnd = endRange + indexDelta;

    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > points.length - 1) {
      newStart -= newEnd - (points.length - 1);
      newEnd = points.length - 1;
    }
    newStart = Math.max(0, newStart);

    setViewRange([newStart, newEnd]);
  }

  function handleMouseDown(event) {
    if (!viewRange && points.length <= minZoomPoints) return;
    isDraggingRef.current = true;
    dragStartXRef.current = event.clientX;
    dragStartRangeRef.current = viewRange || [0, points.length - 1];

    const handleWindowMove = (moveEvent) => {
      if (!isDraggingRef.current) return;
      panTo(moveEvent.clientX);
    };
    const handleWindowUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleWindowMove);
      window.removeEventListener('mouseup', handleWindowUp);
    };
    window.addEventListener('mousemove', handleWindowMove);
    window.addEventListener('mouseup', handleWindowUp);
  }

  function handleDoubleClick() {
    setViewRange(null);
  }

  // ---------------------------------------------------------------------
  // HOVER / TOOLTIP — using visx's localPoint (handles SVG viewBox scaling
  // correctly) and useTooltip (auto-managed state + TooltipWithBounds
  // auto-keeps the tooltip on-screen near chart edges, which the old
  // hand-rolled version didn't do as robustly).
  // ---------------------------------------------------------------------
  const handlePointerMove = useCallback((event) => {
    if (isDraggingRef.current || !svgRef.current || !xScale || visiblePoints.length === 0) return;
    const point = localPoint(svgRef.current, event);
    if (!point) return;

    let closest = 0;
    let closestDistance = Infinity;
    visiblePoints.forEach((p, i) => {
      const distance = Math.abs(xScale(i) - point.x);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = i;
      }
    });

    const datum = visiblePoints[closest];
    showTooltip({
      tooltipData: datum,
      tooltipLeft: xScale(closest),
      tooltipTop: yScale(datum.value),
    });
  }, [visiblePoints, xScale, yScale, showTooltip]);

  function handleTouchStart(event) {
    if (event.touches.length === 2) {
      pinchDistRef.current = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
    } else if (event.touches.length === 1) {
      const now = Date.now();
      const isDoubleTap = now - lastTapRef.current < 300;
      lastTapRef.current = now;

      // A double-tap resets the view — base the drag snapshot on the range
      // it's resetting TO (full range), not the stale pre-reset viewRange
      // still sitting in this closure (setViewRange(null) hasn't applied yet).
      if (isDoubleTap) {
        setViewRange(null);
        dragStartRangeRef.current = [0, points.length - 1];
      } else {
        dragStartRangeRef.current = viewRange || [0, points.length - 1];
      }

      // Don't assume a drag yet — a tap-and-hold should scrub the tooltip,
      // not pan. handleTouchMove promotes this to a drag once the finger
      // actually moves past TOUCH_DRAG_THRESHOLD.
      isDraggingRef.current = false;
      dragStartXRef.current = event.touches[0].clientX;
      touchStartPosRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
  }

  function handleTouchMove(event) {
    if (event.touches.length === 2 && pinchDistRef.current != null && svgRef.current) {
      event.preventDefault();
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const dist = Math.hypot(dx, dy) || 1;

      const midClientX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midClientY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      const point = localPoint(svgRef.current, { clientX: midClientX, clientY: midClientY });

      const factor = pinchDistRef.current / dist;
      applyZoom(factor, point ? point.x : width / 2);
      pinchDistRef.current = dist;
    } else if (event.touches.length === 1) {
      const touch = event.touches[0];

      if (!isDraggingRef.current && touchStartPosRef.current) {
        const dx = touch.clientX - touchStartPosRef.current.x;
        const dy = touch.clientY - touchStartPosRef.current.y;
        if (Math.hypot(dx, dy) > TOUCH_DRAG_THRESHOLD) {
          isDraggingRef.current = true;
          hideTooltip();
        }
      }

      if (isDraggingRef.current) {
        panTo(touch.clientX);
      } else {
        handlePointerMove(event);
      }
    }
  }

  function handleTouchEnd(event) {
    isDraggingRef.current = false;
    pinchDistRef.current = null;
    touchStartPosRef.current = null;
    if (event.touches.length === 0) hideTooltip();
  }

  if (!xScale || visiblePoints.length < 2) return null; // caller handles the "not enough data" state

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        style={{ marginTop: '10px', touchAction: 'none', cursor: isDraggingRef.current ? 'grabbing' : 'grab' }}
        onMouseMove={handlePointerMove}
        onMouseLeave={hideTooltip}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <LinearGradient id="priceFillGradient" from={color} to={color} fromOpacity={0.35} toOpacity={0} />

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
        <AreaClosed
          data={visiblePoints}
          x={getX}
          y={getY}
          yScale={yScale}
          curve={curveLinear}
          fill="url(#priceFillGradient)"
          stroke="none"
        />

        {/* The price line — curveLinear gives straight segments between
            points (the "spiked" look), not a smoothed curve. The draw-in
            reveal (see the effect above) is applied imperatively via
            pathRef, not through a style prop here — deliberately, see that
            effect's comment for why. */}
        <LinePath
          innerRef={pathRef}
          data={visiblePoints}
          x={getX}
          y={getY}
          curve={curveLinear}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* x-axis date labels — sparse, evenly spaced regardless of point count */}
        {labelIndices.map((i) => (
          <text key={i} x={xScale(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="#9a9a9a">
            {visiblePoints[i].label}
          </text>
        ))}

        {/* Hover crosshair + highlighted point */}
        {tooltipData && (
          <>
            <line x1={tooltipLeft} y1={paddingY / 2} x2={tooltipLeft} y2={height - paddingY} stroke="#4b4b4b" strokeWidth="1" />
            <circle cx={tooltipLeft} cy={tooltipTop} r="5" fill={color} stroke="#fff" strokeWidth="1.5" />
          </>
        )}
      </svg>

      {/* visx's TooltipWithBounds automatically keeps itself on-screen near
          chart edges — the old hand-rolled version only flipped based on a
          fixed 70%-width threshold, less robust. */}
      {tooltipData && (
        <TooltipWithBounds left={tooltipLeft + 12} top={tooltipTop} style={tooltipStyles}>
          <div style={{ color: '#9a9a9a', fontSize: '10px' }}>{tooltipData.label}</div>
          <div style={{ fontWeight: 700 }}>{formatPrice(tooltipData.value, currency)}</div>
        </TooltipWithBounds>
      )}

      {/* Reset-zoom control — only shown once actually zoomed/panned */}
      {viewRange && (
        <button
          onClick={() => setViewRange(null)}
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            padding: '4px 10px',
            borderRadius: '999px',
            border: '1px solid #333',
            background: 'rgba(28,28,28,0.9)',
            color: '#e2e2e2',
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          Reset zoom
        </button>
      )}

      <div style={{ marginTop: '4px', fontSize: '10px', color: '#6b6b6b', textAlign: 'center' }}>
        Scroll or pinch to zoom · drag to pan · double-click/tap to reset
      </div>
    </div>
  );
}
