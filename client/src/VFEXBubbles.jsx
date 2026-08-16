import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';

// This component deliberately recreates the *visual behaviour* of a dense
// market-bubble chart. It does not depend on, or copy, Crypto Bubbles code.
const defaultData = [
  { ticker: 'INN.vx', name: 'Innscor Africa Limited', change: 0, marketCap: 1, estimated: true, closingPrice: 0 },
  { ticker: 'PHL.vx', name: 'Padenga Holdings Ltd', change: 0, marketCap: 1, estimated: true, closingPrice: 0 },
  { ticker: 'SBL.vx', name: 'Simbisa Brands Limited', change: 0, marketCap: 1, estimated: true, closingPrice: 0 },
];

// ============================================================================
// ⚙️ PHYSICS — edit this block to change how bubbles move and collide
// ============================================================================
const CHART = {
  background: '#101010',
  smallestBubble: 28,
  largestBubbleRatio: 0.16,
  bubbleGap: 0.2,
  wallGap: 0.2,

  velocityDecay: 0.08,
  wanderStrength: 0.012,
  centreStrength: 0,
};

// ============================================================================
// 🎨 APPEARANCE — edit this block to change bubble colors and text
// ============================================================================
const COLORS = {
  gain: '#36d85a',   // fill/ring tint when change > 0%
  loss: '#e85b61',   // fill/ring tint when change < 0%
  flat: '#a9a9a9',   // fill/ring tint when change === 0%
  text: '#f7f7f7',   // ticker label color
  mutedText: '#e1e1e1', // % change label color (smaller text under the ticker)
};

export function colorForChange(change) {
  if (change > 0) return COLORS.gain;
  if (change < 0) return COLORS.loss;
  return COLORS.flat;
}

export function formatMarketCap(value, currency = 'USD') {
  const prefix = currency === 'ZWG' ? 'ZWG ' : '$';
  if (value >= 1_000_000) return `${prefix}${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(1)}K`;
  return `${prefix}${value}`;
}

export function tickerFor(item) {
  return String(item.ticker || '')
    .replace(/\.vx$/i, '')
    .replace(/\.zw$/i, '');
}

export function formatChange(change) {
  const value = Number(change) || 0;
  const decimals = Math.abs(value) < 10 && value % 1 !== 0 ? 1 : 0;
  return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hexAlpha(hex, alpha) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((character) => character + character).join('')
    : normalized;
  const number = Number.parseInt(value, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

// Deterministic starting points stop the entire field from jumping to a new
// random arrangement whenever React happens to rerender.
function seededUnit(value, salt) {
  let hash = 2166136261;
  const text = `${value}:${salt}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

// ----------------------------------------------------------------------------
// 📐 BUBBLE STRUCTURE — this is where each bubble's radius, starting
// position, and motion "personality" (phase/speed) get computed. Edit here
// if you want to change how size maps to market cap, or how bubbles are
// initially scattered.
// ----------------------------------------------------------------------------
function buildNodes(items, size, sizeBy = 'change') {
  // Two ways to drive bubble size: how much a company moved today/this
  // week/this month (sizeBy === 'change'), or how big the company actually
  // is (sizeBy === 'marketCap'). Same scale mechanism either way, just a
  // different source value.
  const magnitudeOf = (item) => {
    if (sizeBy === 'marketCap') return Math.max(Number(item.marketCap) || 0, 1);
    return Math.abs(Number(item.change) || 0);
  };

  const magnitudes = items.map(magnitudeOf);
  const minimumMagnitude = Math.min(...magnitudes);
  const maximumMagnitude = Math.max(...magnitudes);
  const smallest = Math.max(CHART.smallestBubble, Math.min(size.width, size.height) * 0.022);
  const largest = Math.max(
    smallest + 8,
    Math.min(size.height * CHART.largestBubbleRatio, size.width * 0.15)
  );
  const sizeScale = d3
    .scaleSqrt()
    .domain(minimumMagnitude === maximumMagnitude ? [0, Math.max(maximumMagnitude, 1)] : [minimumMagnitude, maximumMagnitude])
    .range([smallest, largest]);

  return items.map((item, index) => {
    const key = `${tickerFor(item)}-${index}`;
    const magnitude = magnitudeOf(item);
    const marketStrength = Math.max(Number(item.marketCap) || 0, 1);
    // This secondary market-cap nudge only makes sense as a subtle extra
    // weighting when change is the PRIMARY size driver. When market cap is
    // already the primary driver, applying it again would double-count —
    // so it's neutralized (1x) in that mode.
    const secondaryMultiplier = sizeBy === 'marketCap'
      ? 1
      : Math.max(0.75, Math.min(1.18, 1 + Math.log10(marketStrength + 1) / 14));
    const radius = sizeScale(magnitude) * secondaryMultiplier;
    const minX = radius + CHART.wallGap;
    const maxX = Math.max(minX, size.width - radius - CHART.wallGap);
    const minY = radius + CHART.wallGap;
    const maxY = Math.max(minY, size.height - radius - CHART.wallGap);

    return {
      ...item,
      key,
      r: radius,
      x: minX + seededUnit(key, 'x') * (maxX - minX),
      y: minY + seededUnit(key, 'y') * (maxY - minY),
      vx: (seededUnit(key, 'vx') - 0.5) * 0.35,
      vy: (seededUnit(key, 'vy') - 0.5) * 0.35,
      phase: seededUnit(key, 'phase') * Math.PI * 2,
      speed: 0.7 + seededUnit(key, 'speed') * 0.6,
    };
  });
}

// Bubble-vs-wall collision: keeps every bubble fully inside the canvas and
// bounces it off the edge with a velocity reflection (continuous boundary,
// no clipping).
function makeBoundsForce(width, height) {
  let nodes = [];

  function force() {
    for (const node of nodes) {
      const edge = node.r + CHART.wallGap;
      if (node.x < edge) {
        node.x = edge;
        node.vx = Math.abs(node.vx) * 0.9;
      } else if (node.x > width - edge) {
        node.x = width - edge;
        node.vx = -Math.abs(node.vx) * 0.9;
      }

      if (node.y < edge) {
        node.y = edge;
        node.vy = Math.abs(node.vy) * 0.9;
      } else if (node.y > height - edge) {
        node.y = height - edge;
        node.vy = -Math.abs(node.vy) * 0.9;
      }
    }
  }

  force.initialize = (nextNodes) => {
    nodes = nextNodes;
  };

  return force;
}

function makeCollisionBounceForce(nodes) {
  const restitution = 0.92; // 1 = perfectly elastic, lower = more energy loss

  return () => {
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];

        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        // Prevent division by zero when bubbles are exactly on top of each other
        if (distance < 0.001) {
          dx = 0.001;
          dy = 0;
          distance = 0.001;
        }

        const nx = dx / distance;
        const ny = dy / distance;

        const minDistance = a.r + b.r + CHART.bubbleGap;

        if (distance < minDistance) {
          const overlap = minDistance - distance;

          // ---------------------------------------------------------------
          // 1. Push bubbles apart so they cannot remain overlapped
          // ---------------------------------------------------------------
          const correction = overlap * 0.5;

          a.x -= nx * correction;
          a.y -= ny * correction;
          b.x += nx * correction;
          b.y += ny * correction;

          // ---------------------------------------------------------------
          // 2. Calculate relative velocity along collision normal
          // ---------------------------------------------------------------
          const relativeVelocityX = b.vx - a.vx;
          const relativeVelocityY = b.vy - a.vy;

          const velocityAlongNormal =
            relativeVelocityX * nx +
            relativeVelocityY * ny;

          // Already moving apart — don't apply another bounce impulse
          if (velocityAlongNormal > 0) {
            continue;
          }

          // ---------------------------------------------------------------
          // 3. Elastic collision impulse
          // Equal masses because every bubble is treated as the same mass
          // ---------------------------------------------------------------
          const impulse =
            -(1 + restitution) * velocityAlongNormal / 2;

          const impulseX = impulse * nx;
          const impulseY = impulse * ny;

          a.vx -= impulseX;
          a.vy -= impulseY;

          b.vx += impulseX;
          b.vy += impulseY;
        }
      }
    }
  };
}

// Continuous ambient drift — combined with alphaDecay(0) below, this is what
// keeps the field moving forever instead of settling still.
function makeFloatingForce(nodes) {
  let time = 0;

  return () => {
    time += 0.012;
    for (const node of nodes) {
      const phase = time * node.speed + node.phase;
      // Small, continuously changing pushes give the chart the calm liquid
      // movement of the reference instead of a springy or jittery simulation.
      node.vx += Math.cos(phase + node.y * 0.007) * CHART.wanderStrength;
      node.vy += Math.sin(phase * 0.9 + node.x * 0.006) * CHART.wanderStrength;
    }
  };
}

function bubbleImageUrl(node) {
  const candidate = node.logoUrl || node.logo || node.iconUrl || node.icon;
  return typeof candidate === 'string' ? candidate : null;
}

// ----------------------------------------------------------------------------
// 🎨 BUBBLE DRAWING — the actual per-frame rendering of one bubble: fill
// gradient, ring/stroke, optional logo, ticker + % change text. Edit here for
// visual tweaks that aren't covered by the CHART/COLORS config above (e.g.
// ring thickness, gradient stops, font).
// ----------------------------------------------------------------------------
function drawBubble(context, node, selectedTicker, hoveredTicker, imageCache, requestRender) {
  const color = colorForChange(Number(node.change) || 0);
  const isSelected = selectedTicker === node.ticker;
  const isHovered = hoveredTicker === node.ticker;
  const { r } = node;

  context.save();
  context.translate(node.x, node.y);

  // The central charcoal fill plus bright perimeter is the characteristic
  // ring treatment of the reference site; it remains readable in either trend
  // direction and avoids the flat coloured-disc appearance of the old SVG.
  const fill = context.createRadialGradient(-r * 0, -r * 0, r * 0.05, 0, 0, r);
  fill.addColorStop(0, 'rgba(34, 36, 35, 0.2)');
  fill.addColorStop(0.6, 'rgba(34, 36, 35, 0.1)');
  fill.addColorStop(1, hexAlpha(color, 0.40));

  context.beginPath();
  context.arc(0, 0, r, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();

  // Selection/hover highlight only — no glow, no ring on bubbles at rest.
  if (isSelected || isHovered) {
    context.beginPath();
    context.arc(0, 0, r - Math.max(0.75, r * 0.016), 0, Math.PI * 2);
    context.lineWidth = Math.max(2.2, r * 0.04);
    context.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    context.stroke();
  }

  const logoUrl = bubbleImageUrl(node);
  const image = logoUrl ? imageCache.get(logoUrl) : null;
  if (logoUrl && !image) {
    const nextImage = new Image();
    nextImage.crossOrigin = 'anonymous';
    nextImage.onload = () => {
      console.log(`[logo] loaded OK: ${node.ticker} -> ${logoUrl}`);
      requestRender();
    };
    nextImage.onerror = () => {
      console.warn(`[logo] FAILED to load: ${node.ticker} -> ${logoUrl}`);
      imageCache.set(logoUrl, null);
    };
    imageCache.set(logoUrl, nextImage);
    nextImage.src = logoUrl;
  } else if (!logoUrl) {
    console.log(`[logo] no logoUrl set on data for: ${node.ticker}`);
  }

  const hasLogo = Boolean(image?.complete && image.naturalWidth);
  if (hasLogo && r >= 16) {
    const logoSize = clamp(r * 0.58, 22, 58);
    const logoX = 0;
    const logoY = -r * 0.32;
    const needsWhiteBadge = String(node.ticker || '').toLowerCase().includes('inv');

    context.save();
    context.beginPath();
    context.arc(logoX, logoY, logoSize / 2 + (needsWhiteBadge ? 4 : 0), 0, Math.PI * 2);
    context.clip();

    if (needsWhiteBadge) {
      context.fillStyle = '#ffffff';
      context.beginPath();
      context.arc(logoX, logoY, logoSize / 2 + 3, 0, Math.PI * 2);
      context.fill();
    }

    context.drawImage(image, logoX - logoSize / 2, logoY - logoSize / 2, logoSize, logoSize);
    context.restore();
  }

  const ticker = tickerFor(node);
  if (r >= 12) {
    const preferredSize = clamp(r * 0.45, 9, 52);
    let fontSize = preferredSize;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `700 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
    const maxWidth = hasLogo ? r * 1.25 : r * 1.58;
    while (fontSize > 8 && context.measureText(ticker).width > maxWidth) {
      fontSize -= 1;
      context.font = `700 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
    }
    context.fillStyle = COLORS.text;
    context.fillText(ticker, 0, hasLogo ? r * 0.06 : (r >= 25 ? -r * 0.1 : 0));

    if (r >= 24) {
      context.font = `500 ${clamp(r * 0.23, 8, 27)}px Inter, ui-sans-serif, system-ui, sans-serif`;
      context.fillStyle = COLORS.mutedText;
      context.fillText(formatChange(node.change), 0, hasLogo ? r * 0.48 : r * 0.38);
    }
  }

  context.restore();
}

export default function VFEXBubbles({ data = defaultData, onBubbleSelect, sizeBy = 'change' }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const selectedRef = useRef(null);
  const onBubbleSelectRef = useRef(onBubbleSelect);
  useEffect(() => {
    onBubbleSelectRef.current = onBubbleSelect;
  }, [onBubbleSelect]);
  const source = Array.isArray(data) ? data : defaultData;
  const [size, setSize] = useState({ width: 960, height: 500 });
  const [selected, setSelected] = useState(source[0] || null);

  const nodes = useMemo(() => buildNodes(source, size, sizeBy), [source, size, sizeBy]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (!source.some((item) => item.ticker === selected?.ticker)) {
      setSelected(source[0] || null);
    }
  }, [source, selected?.ticker]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      setSize({
        width: Math.max(320, Math.round(rect.width)),
        height: Math.max(340, Math.round(rect.height)),
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * deviceScale);
    canvas.height = Math.round(size.height * deviceScale);

    let frame = 0;
    let hoveredTicker = null;
    const imageCache = new Map();

    const render = () => {
      frame = 0;
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      context.clearRect(0, 0, size.width, size.height);
      context.fillStyle = CHART.background;
      context.fillRect(0, 0, size.width, size.height);

      const selectedTicker = selectedRef.current?.ticker;
      [...nodes]
        .sort((left, right) => right.r - left.r)
        .forEach((node) => drawBubble(context, node, selectedTicker, hoveredTicker, imageCache, queueRender));
    };

    const queueRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

        const simulation = d3
      .forceSimulation(nodes)
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(CHART.velocityDecay)
      .force('x', d3.forceX(size.width / 2).strength(CHART.centreStrength))
      .force('y', d3.forceY(size.height / 2).strength(CHART.centreStrength))
      .force('float', makeFloatingForce(nodes))
      .force('bubbleBounce', makeCollisionBounceForce(nodes))
      .force('collide', d3.forceCollide((node) => node.r + CHART.bubbleGap).iterations(3))
      .force('bounds', makeBoundsForce(size.width, size.height))
      .on('tick', queueRender);

    const pointerPosition = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * size.width,
        y: ((event.clientY - rect.top) / rect.height) * size.height,
      };
    };

    const hitTest = (event) => {
      const point = pointerPosition(event);
      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const node = nodes[index];
        const x = point.x - node.x;
        const y = point.y - node.y;
        if (x * x + y * y <= node.r * node.r) return node;
      }
      return null;
    };

    const handleMove = (event) => {
      const node = hitTest(event);
      const nextTicker = node?.ticker || null;
      if (nextTicker !== hoveredTicker) {
        hoveredTicker = nextTicker;
        canvas.style.cursor = node ? 'pointer' : 'default';
        queueRender();
      }
    };

    const handleLeave = () => {
      if (hoveredTicker) {
        hoveredTicker = null;
        canvas.style.cursor = 'default';
        queueRender();
      }
    };

    const handleClick = (event) => {
      const node = hitTest(event);
      if (node) {
        setSelected(node);
        onBubbleSelectRef.current?.(node);
      }
    };

    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('pointerleave', handleLeave);
    canvas.addEventListener('click', handleClick);
    queueRender();

    return () => {
      simulation.stop();
      if (frame) window.cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [nodes, size]);

  return (
    <section style={{ marginTop: '0', color: '#f8fafc' }}>
      <div
        ref={hostRef}
        style={{
          position: 'relative',
          height: 'clamp(380px, 82vh, 900px)',
          overflow: 'hidden',
          background: CHART.background,
          border: '1px solid #242424',
          borderTop: 'none',
          borderRadius: '0',
          boxShadow: 'none',
          margin: '0',
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Interactive market bubble chart"
          style={{ display: 'block', width: '100%', height: '100%', touchAction: 'manipulation' }}
        />
      </div>
    </section>
  );
}
