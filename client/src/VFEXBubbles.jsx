import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { clamp } from './utils';

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
  bubbleGap: 2.5,
  wallGap: 0.2,

  // Zero ambient friction — bubbles must coast at truly constant velocity
  // between hits, direction changing ONLY on a wall or bubble collision.
  // There is no wander/charge/centre force in this model, so anything but
  // exactly 0 here is a real, if subtle, source of direction/speed change
  // between hits: even 0.001 compounds to near-total speed loss within
  // about 2 minutes at 60fps (0.999^7200 ≈ 0.0007) with almost no
  // collisions to explain it.
  velocityDecay: 0,

  // Wall and bubble-bubble bounce energy retained per hit (1 = perfectly
  // elastic, no loss ever). Since nothing replenishes lost energy in this
  // model, ANY value below 1 guarantees the whole field eventually grinds
  // to a stop — it's just a question of how long that takes. At 0.98 the
  // field still has meaningfully non-zero speed after 20 simulated minutes
  // (measured); at 0.90 it's mostly stopped by then. Not exactly 1.0 to
  // avoid floating-point energy drift over a long-running tab.
  wallRestitution: 0.80,
  bubbleRestitution: 0.80,

  // Hover visual feedback: how much a bubble grows when hovered, and how
  // quickly it eases toward that size (0-1, higher = snappier).
  hoverScaleTarget: 1.08,
  hoverScaleEase: 0.25,

  // How quickly a bubble's size eases toward its new target when the
  // underlying data changes (1D/1W/1M toggle, % Change/Market Cap toggle,
  // or any data refresh). Lower = slower/smoother growth-shrink animation,
  // higher = snappier. Kept deliberately gentle — this system's friction
  // (velocityDecay below) was tuned back when radius never changed after
  // creation; a fast/abrupt radius change here disturbs collision
  // resolution more than the existing damping can smoothly absorb.
  radiusEase: 0.025,
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
// position, and initial velocity get computed. Edit here if you want to
// change how size maps to market cap, or how bubbles are initially
// scattered.
// ----------------------------------------------------------------------------
// Returns a function mapping one data item -> its target radius. Kept
// separate from node creation so both a fresh full build AND an in-place
// data-merge (see syncNodes below) can compute target sizes the same way.
function computeRadiusScale(items, size, sizeBy = 'change') {
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

  return (item) => {
    const magnitude = magnitudeOf(item);
    const marketStrength = Math.max(Number(item.marketCap) || 0, 1);
    // This secondary market-cap nudge only makes sense as a subtle extra
    // weighting when change is the PRIMARY size driver. When market cap is
    // already the primary driver, applying it again would double-count —
    // so it's neutralized (1x) in that mode.
    const secondaryMultiplier = sizeBy === 'marketCap'
      ? 1
      : Math.max(0.75, Math.min(1.18, 1 + Math.log10(marketStrength + 1) / 14));
    return sizeScale(magnitude) * secondaryMultiplier;
  };
}

// Creates ONE brand-new node with a seeded starting position — used only
// for a ticker that's never been seen before (first load, market switch,
// or a genuinely new company appearing). Existing bubbles are never
// recreated this way; see syncNodes, which updates them in place instead.
function createNode(item, size, radiusFn) {
  const key = item.ticker; // stable across refreshes — NOT array index, which can shift between fetches
  const radius = radiusFn(item);
  const minX = radius + CHART.wallGap;
  const maxX = Math.max(minX, size.width - radius - CHART.wallGap);
  const minY = radius + CHART.wallGap;
  const maxY = Math.max(minY, size.height - radius - CHART.wallGap);

  return {
    ...item,
    key,
    r: radius,
    targetR: radius, // starts equal to r — no animation on first appearance, it should just show up at full size
    x: minX + seededUnit(key, 'x') * (maxX - minX),
    y: minY + seededUnit(key, 'y') * (maxY - minY),
    // This is the ONLY source of motion energy a bubble will ever have —
    // there's no ambient force to add more later, and collisions only
    // redistribute existing velocity between bubbles, never create it. Too
    // small here and the whole field reads as barely moving.
    vx: (seededUnit(key, 'vx') - 0.5) * 1.2,
    vy: (seededUnit(key, 'vy') - 0.5) * 1.2,
    hoverScale: 1, // eased toward CHART.hoverScaleTarget while hovered, drawing only — never affects physics/collision radius
  };
}

function buildNodes(items, size, sizeBy = 'change') {
  const radiusFn = computeRadiusScale(items, size, sizeBy);
  return items.map((item) => createNode(item, size, radiusFn));
}

// The core of "resize in place instead of resetting": matches new data
// against EXISTING node objects by ticker, updates their data fields and
// targetR only (position/velocity/hoverScale/r untouched — those ease or
// continue naturally), and only creates fresh nodes for tickers
// that are genuinely new. Returns { nodes, tickerSetChanged } — the caller
// needs tickerSetChanged to know whether the simulation's tracked node
// array needs to be swapped via simulation.nodes(...).
function syncNodes(existingNodes, items, size, sizeBy) {
  const radiusFn = computeRadiusScale(items, size, sizeBy);
  const existingByTicker = new Map(existingNodes.map((node) => [node.ticker, node]));
  const newTickerSet = new Set(items.map((item) => item.ticker));

  let tickerSetChanged = existingNodes.length !== items.length;

  const nextNodes = items.map((item) => {
    const existing = existingByTicker.get(item.ticker);
    const targetR = radiusFn(item);

    if (existing) {
      // Update data fields (change/marketCap/closingPrice/currency/etc) in
      // place. None of the raw API fields collide with physics-only
      // properties (x, y, vx, vy, hoverScale, r, targetR, key), so this
      // can't accidentally clobber simulation state.
      Object.assign(existing, item);
      // Only actually move the target if the change is big enough to see —
      // this avoids waking up the radius-easing force (and disturbing
      // collision resolution) for sub-pixel/floating-point-level noise
      // between syncs where the underlying value didn't meaningfully change.
      if (Math.abs(targetR - existing.targetR) > 0.5) {
        existing.targetR = targetR;
      }
      return existing;
    }

    tickerSetChanged = true;
    return createNode(item, size, radiusFn);
  });

  for (const node of existingNodes) {
    if (!newTickerSet.has(node.ticker)) tickerSetChanged = true;
  }

  return { nodes: nextNodes, tickerSetChanged };
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
        node.vx = Math.abs(node.vx) * CHART.wallRestitution;
      } else if (node.x > width - edge) {
        node.x = width - edge;
        node.vx = -Math.abs(node.vx) * CHART.wallRestitution;
      }

      if (node.y < edge) {
        node.y = edge;
        node.vy = Math.abs(node.vy) * CHART.wallRestitution;
      } else if (node.y > height - edge) {
        node.y = height - edge;
        node.vy = -Math.abs(node.vy) * CHART.wallRestitution;
      }
    }
  }

  force.initialize = (nextNodes) => {
    nodes = nextNodes;
  };

  return force;
}

// Pure detection — reads positions, mutates nothing. Returns null when the
// pair isn't overlapping, otherwise the collision normal/masses/overlap
// depth. Kept separate from resolution so the velocity-impulse pass can use
// the contact as it was AT THE START of the tick: calling this again after
// resolveBubbleOverlap has already pushed a pair apart finds them exactly
// at (or just past) minDistance and returns null, silently skipping the
// impulse — that was a real bug here that made every collision purely
// positional, with bubbles sliding past each other's boundary at whatever
// velocity they already had instead of ever bouncing off it.
function detectCollision(a, b) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 0.001) {
    dx = 0.001;
    dy = 0;
    distance = 0.001;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const minDistance = a.r + b.r + CHART.bubbleGap;

  if (distance >= minDistance) return null;

  // Mass scales with AREA (r²), not radius — a bubble 3x the radius of
  // another has ~9x the mass, so it should barely budge in a collision
  // while the small one gets visibly flung back, like real unequal-mass
  // bodies. Using radius alone made big/small collisions feel too even.
  const massA = a.r * a.r;
  const massB = b.r * b.r;

  return { a, b, nx, ny, massA, massB, overlap: minDistance - distance };
}

// Pushes an already-detected overlapping pair apart along the collision
// normal, proportional to overlap depth and inverse mass.
function resolveBubbleOverlap(collision) {
  const { a, b, nx, ny, massA, massB, overlap } = collision;
  const totalMass = massA + massB;

  a.x -= nx * overlap * (massB / totalMass);
  a.y -= ny * overlap * (massB / totalMass);
  b.x += nx * overlap * (massA / totalMass);
  b.y += ny * overlap * (massA / totalMass);
}

function makeCollisionBounceForce() {
  let nodes = [];
  const restitution = CHART.bubbleRestitution;
  const positionIterations = 3;

  function force() {
    // Detect every overlapping pair ONCE, at the start of the tick, before
    // any position changes this tick — this is the contact state the
    // velocity impulse below needs to react to. Detecting again after
    // positions have already been pushed apart would find them non-
    // overlapping and silently skip the impulse (the bug this replaced).
    const collisions = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const collision = detectCollision(nodes[i], nodes[j]);
        if (collision) collisions.push(collision);
      }
    }

    // Positional separation: multiple passes resolve chained/multi-way
    // overlaps (three or more bubbles pressed together) — a single pass
    // only pushes each overlapping pair apart once, which isn't enough to
    // fully separate a cluster in one frame. Mirrors what d3.forceCollide's
    // iterations(3) used to do before it was replaced by this hand-rolled
    // force. Re-detects each pass since earlier pairs in the same pass can
    // shift positions enough to change later pairs' overlap depth.
    for (let pass = 0; pass < positionIterations; pass += 1) {
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const collision = detectCollision(nodes[i], nodes[j]);
          if (collision) resolveBubbleOverlap(collision);
        }
      }
    }

    // Velocity impulse (the actual visible "bounce"), using the contact
    // normals detected before this tick moved anything.
    for (const { a, b, nx, ny, massA, massB } of collisions) {
      const relativeVelocityX = b.vx - a.vx;
      const relativeVelocityY = b.vy - a.vy;
      const velocityAlongNormal = relativeVelocityX * nx + relativeVelocityY * ny;
      if (velocityAlongNormal > 0) continue;

      const impulseScalar =
        (-(1 + restitution) * velocityAlongNormal) / (1 / massA + 1 / massB);

      const impulseX = impulseScalar * nx;
      const impulseY = impulseScalar * ny;

      a.vx -= impulseX / massA;
      a.vy -= impulseY / massA;
      b.vx += impulseX / massB;
      b.vy += impulseY / massB;
    }
  }

  force.initialize = (nextNodes) => {
    nodes = nextNodes;
  };

  return force;
}

// Eases each bubble's DRAWN/COLLISION radius toward its current targetR
// every tick, instead of jumping instantly. This is what makes switching
// 1D/1W/1M or the size-mode toggle feel like bubbles smoothly growing or
// shrinking in place, rather than the whole field resetting — because
// nothing else about the node (position, velocity) changes when only
// targetR changes.
function makeRadiusEaseForce() {
  let nodes = [];

  function force() {
    for (const node of nodes) {
      if (node.targetR == null) continue;
      const diff = node.targetR - node.r;
      if (Math.abs(diff) > 0.02) node.r += diff * CHART.radiusEase;
      else node.r = node.targetR;
    }
  }

  force.initialize = (nextNodes) => {
    nodes = nextNodes;
  };

  return force;
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

  // Ease the bubble's DRAWN size toward the hover target — this never
  // touches node.r itself, which stays fixed for physics/collision. Only
  // what gets rendered grows/shrinks.
  const targetScale = isHovered ? CHART.hoverScaleTarget : 1;
  node.hoverScale += (targetScale - node.hoverScale) * CHART.hoverScaleEase;
  if (Math.abs(node.hoverScale - targetScale) > 0.001) requestRender();

  const r = node.r * node.hoverScale;

  context.save();
  context.translate(node.x, node.y);

  // The central charcoal fill plus bright perimeter is the characteristic
  // ring treatment of the reference site; it remains readable in either trend
  // direction and avoids the flat coloured-disc appearance of the old SVG.
  const fill = context.createRadialGradient(-r * 0, -r * 0, r * 0.05, 0, 0, r);
  fill.addColorStop(0, 'rgba(34, 36, 35, 0.2)');
  fill.addColorStop(0.6, 'rgba(34, 36, 35, 0.1)');
  fill.addColorStop(1, hexAlpha(color, 0.40));

  // Hover-only glow — brightens the bubble's presence without a permanent
  // always-on glow (that was deliberately removed earlier for a cleaner
  // resting look; this is opt-in, hover-triggered only).
  if (isHovered) {
    context.shadowColor = hexAlpha(color, 0.85);
    context.shadowBlur = Math.max(14, r * 0.35);
  }

  context.beginPath();
  context.arc(0, 0, r, 0, Math.PI * 2);
  context.fillStyle = fill;
  context.fill();
  context.shadowBlur = 0;

  // Selection/hover highlight ring — brighter/thicker specifically on hover
  // per spec ("brighten its border").
  if (isSelected || isHovered) {
    context.beginPath();
    context.arc(0, 0, r - Math.max(0.75, r * 0.016), 0, Math.PI * 2);
    context.lineWidth = isHovered ? Math.max(2.8, r * 0.05) : Math.max(2.2, r * 0.04);
    context.strokeStyle = isHovered ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.92)';
    context.stroke();
  }

  const logoUrl = bubbleImageUrl(node);
  const image = logoUrl ? imageCache.get(logoUrl) : null;
  if (logoUrl && !image) {
    const nextImage = new Image();
    nextImage.crossOrigin = 'anonymous';
    nextImage.onload = () => requestRender();
    nextImage.onerror = () => imageCache.set(logoUrl, null);
    imageCache.set(logoUrl, nextImage);
    nextImage.src = logoUrl;
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
  const tooltipRef = useRef(null);
  const selectedRef = useRef(null);
  const onBubbleSelectRef = useRef(onBubbleSelect);
  useEffect(() => {
    onBubbleSelectRef.current = onBubbleSelect;
  }, [onBubbleSelect]);

  const source = Array.isArray(data) ? data : defaultData;

  // "Latest value" refs — read inside the create-once effect below without
  // making it depend on (and re-run for) every data/sizeBy change. Updated
  // directly during render, a standard safe pattern for this.
  const sourceRef = useRef(source);
  sourceRef.current = source;
  const sizeByRef = useRef(sizeBy);
  sizeByRef.current = sizeBy;

  // The actual node array lives here, NOT in React state/useMemo — it's
  // mutated in place by the data-sync effect below, so existing bubbles
  // keep their position/velocity across data refreshes instead of being
  // torn down and recreated from scratch.
  const nodesRef = useRef([]);
  const simulationRef = useRef(null);

  const [size, setSize] = useState({ width: 960, height: 500 });
  const [selected, setSelected] = useState(source[0] || null);
  // Tooltip CONTENT is React state (cheap — only changes when the hovered
  // bubble itself changes, not on every mouse-move pixel). Tooltip
  // POSITION is updated imperatively via tooltipRef in handleMove instead,
  // so it can track the cursor smoothly every frame without triggering a
  // React re-render per pixel of movement.
  const [hoveredNode, setHoveredNode] = useState(null);

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
      const nextWidth = Math.max(320, Math.round(rect.width));
      const nextHeight = Math.max(340, Math.round(rect.height));
      // Only trigger a re-render (and, downstream, a simulation rebuild) if
      // the size actually changed. ResizeObservers commonly fire multiple
      // times during initial page load (fonts loading, layout settling)
      // even when the final pixel dimensions are identical — without this
      // check, each of those firings was tearing down and rebuilding the
      // whole physics simulation, which meant bubbles never got sustained
      // time to actually spread apart before being reset again.
      setSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // ---------------------------------------------------------------------
  // CREATE-ONCE-PER-SIZE: builds the canvas + simulation fresh. Only runs
  // on mount or when the canvas is actually resized — NOT on every data
  // change. A resize is rare enough that a fresh layout there is fine;
  // smooth in-place resizing for data changes is handled by the separate
  // sync effect further below instead.
  // ---------------------------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const deviceScale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * deviceScale);
    canvas.height = Math.round(size.height * deviceScale);

    const radiusFn = computeRadiusScale(sourceRef.current, size, sizeByRef.current);
    nodesRef.current = sourceRef.current.map((item) => createNode(item, size, radiusFn));

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
      const sorted = [...nodesRef.current].sort((left, right) => right.r - left.r);
      // Raise the hovered bubble above its neighbors regardless of size —
      // whatever's hovered is drawn last so it's never visually occluded.
      if (hoveredTicker) {
        const hoveredIndex = sorted.findIndex((n) => n.ticker === hoveredTicker);
        if (hoveredIndex !== -1) {
          const [hoveredNodeObj] = sorted.splice(hoveredIndex, 1);
          sorted.push(hoveredNodeObj);
        }
      }
      sorted.forEach((node) => drawBubble(context, node, selectedTicker, hoveredTicker, imageCache, queueRender));
    };

    const queueRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const simulation = d3
      .forceSimulation(nodesRef.current)
      .alpha(1)
      .alphaDecay(0)
      .velocityDecay(CHART.velocityDecay)
      // No ambient forces here on purpose — direction/speed must change
      // ONLY from an actual wall or bubble collision, so the only forces
      // registered are the two that fire strictly on contact.
      .force('bubbleBounce', makeCollisionBounceForce())
      .force('radiusEase', makeRadiusEaseForce())
      .force('bounds', makeBoundsForce(size.width, size.height))
      .on('tick', queueRender);

    simulationRef.current = simulation;

    const pointerPosition = (event) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * size.width,
        y: ((event.clientY - rect.top) / rect.height) * size.height,
      };
    };

    const hitTest = (event) => {
      const point = pointerPosition(event);
      const currentNodes = nodesRef.current;
      for (let index = currentNodes.length - 1; index >= 0; index -= 1) {
        const node = currentNodes[index];
        const x = point.x - node.x;
        const y = point.y - node.y;
        if (x * x + y * y <= node.r * node.r) return node;
      }
      return null;
    };

    const handleMove = (event) => {
      const node = hitTest(event);
      const nextTicker = node?.ticker || null;

      // Tooltip position: updated on every move, directly via the DOM ref,
      // no React state involved — this is what keeps it smooth at 60fps
      // without a re-render on every pixel of cursor movement.
      if (tooltipRef.current) {
        const hostRect = hostRef.current?.getBoundingClientRect();
        if (hostRect) {
          const localX = event.clientX - hostRect.left;
          const localY = event.clientY - hostRect.top;
          tooltipRef.current.style.left = `${localX}px`;
          tooltipRef.current.style.top = `${localY}px`;
        }
      }

      if (nextTicker !== hoveredTicker) {
        hoveredTicker = nextTicker;
        canvas.style.cursor = node ? 'pointer' : 'default';
        // Tooltip CONTENT: React state, but only touched when the hovered
        // bubble actually changes — cheap, infrequent.
        setHoveredNode(node || null);
        queueRender();
      }
    };

    const handleLeave = () => {
      if (hoveredTicker) {
        hoveredTicker = null;
        canvas.style.cursor = 'default';
        setHoveredNode(null);
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
      simulationRef.current = null;
      if (frame) window.cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
    };
  }, [size]);

  // ---------------------------------------------------------------------
  // DATA SYNC: runs whenever the underlying data or size-mode changes
  // (1D/1W/1M toggle, % Change/Market Cap toggle, a fresh fetch, etc).
  // Merges new values into the EXISTING node objects by ticker — position
  // and velocity are left completely alone; only each bubble's targetR
  // (and its data fields, for the tooltip/colors) get updated.
  // The radiusEase force then eases node.r toward targetR over the next
  // several ticks, which is what makes this look like bubbles growing or
  // shrinking in place instead of the whole field resetting.
  // ---------------------------------------------------------------------
  useEffect(() => {
    // No guard needed here for an empty nodesRef.current — syncNodes
    // handles that correctly on its own (every item is simply treated as
    // new and gets a fresh node). The only genuinely unsafe operation,
    // calling the simulation directly, is separately guarded below on
    // simulationRef.current actually existing.
    const { nodes: updatedNodes, tickerSetChanged } = syncNodes(nodesRef.current, source, size, sizeBy);
    nodesRef.current = updatedNodes;

    // Only tell d3 about a new node array when the SET actually changed
    // (companies added/removed, e.g. a market switch, or — importantly —
    // the very first time real data arrives after the canvas set up with
    // no data yet). For pure value updates on the same companies, the
    // simulation already holds references to the same mutated objects —
    // no need to call this.
    if (tickerSetChanged && simulationRef.current) {
      simulationRef.current.nodes(nodesRef.current);
      simulationRef.current.alpha(Math.max(simulationRef.current.alpha(), 0.3));
    }
  }, [source, sizeBy, size]);

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

        {/* Tooltip: position updated imperatively via tooltipRef in
            handleMove (smooth, no re-render per pixel); content driven by
            hoveredNode state (only changes on enter/leave a bubble). */}
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'translate(16px, 16px)',
            pointerEvents: 'none',
            zIndex: 10,
            display: hoveredNode ? 'block' : 'none',
            background: 'rgba(15, 15, 15, 0.95)',
            border: '1px solid #2b2b2b',
            borderRadius: '10px',
            padding: '10px 14px',
            minWidth: '180px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {hoveredNode && (
            <>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#f7f7f7' }}>
                {tickerFor(hoveredNode)} <span style={{ color: '#9a9a9a', fontWeight: 400 }}>· {hoveredNode.name}</span>
              </div>
              <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px' }}>
                <span style={{ color: '#9a9a9a' }}>Price</span>
                <span style={{ color: '#f7f7f7' }}>
                  {hoveredNode.currency === 'ZWG' ? 'ZWG ' : '$'}{Number(hoveredNode.closingPrice || 0).toFixed(4)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px' }}>
                <span style={{ color: '#9a9a9a' }}>Change</span>
                <span style={{ color: colorForChange(hoveredNode.change), fontWeight: 700 }}>
                  {formatChange(hoveredNode.change)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '12px' }}>
                <span style={{ color: '#9a9a9a' }}>Market cap</span>
                <span style={{ color: '#f7f7f7' }}>{formatMarketCap(Number(hoveredNode.marketCap) || 0, hoveredNode.currency)}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
