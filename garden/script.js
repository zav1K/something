// Procedural Garden — L-system tree/plant generator.
// Rewrite a grammar string N times, then walk it with turtle graphics.

const PRESETS = {
  fractalPlant: {
    axiom: 'X',
    rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    angle: 25,
    iterations: 5,
    startLen: 7,
    lengthDecay: 0.97,
  },
  binaryTree: {
    axiom: 'F',
    rules: { F: 'F[+F]F[-F]F' },
    angle: 30,
    iterations: 4,
    startLen: 9,
    lengthDecay: 0.78,
  },
  bushyShrub: {
    axiom: 'F',
    rules: { F: 'FF-[-F+F+F]+[+F-F-F]' },
    angle: 22,
    iterations: 4,
    startLen: 11,
    lengthDecay: 0.88,
  },
  sparseTree: {
    axiom: 'F',
    rules: { F: 'F[+F]F[-F][F]' },
    angle: 20,
    iterations: 5,
    startLen: 8,
    lengthDecay: 0.86,
  },
};

const MAX_SYMBOLS = 400000;
const GROW_DURATION_MS = 1800;
const TRUNK_COLOR = [107, 66, 38];
const LEAF_TIP_COLOR = [76, 175, 109];
const LEAF_DOT_COLORS = [[233, 163, 201], [255, 213, 110], [168, 216, 139]];

const canvas = document.getElementById('tree-canvas');
const ctx = canvas.getContext('2d');

const el = {
  preset: document.getElementById('preset-input'),
  iter: document.getElementById('iter-input'),
  iterValue: document.getElementById('iter-value'),
  angle: document.getElementById('angle-input'),
  angleValue: document.getElementById('angle-value'),
  jitter: document.getElementById('jitter-input'),
  jitterValue: document.getElementById('jitter-value'),
  decay: document.getElementById('decay-input'),
  decayValue: document.getElementById('decay-value'),
  leaves: document.getElementById('leaves-input'),
  growBtn: document.getElementById('grow-btn'),
  downloadBtn: document.getElementById('download-btn'),
};

let dpr = Math.max(1, window.devicePixelRatio || 1);
let cssWidth = 0, cssHeight = 0;
let currentSegments = [];
let maxDepthSeen = 1;
let view = { scale: 1, offsetX: 0, offsetY: 0 };
let animFrameHandle = null;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  cssWidth = rect.width;
  cssHeight = rect.height;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', () => { resizeCanvas(); regenerateInstant(); });

function expandLSystem(axiom, rules, iterations) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of current) next += rules[ch] !== undefined ? rules[ch] : ch;
    if (next.length > MAX_SYMBOLS) { current = next.slice(0, MAX_SYMBOLS); break; }
    current = next;
  }
  return current;
}

function interpret(symbols, opts) {
  const { angleDeg, jitterDeg, startLen, lengthDecay } = opts;
  const segments = [];
  const stack = [];
  let x = 0, y = 0, heading = -90, len = startLen, depth = 0;

  for (const ch of symbols) {
    if (ch === 'F' || ch === 'G') {
      const rad = (heading * Math.PI) / 180;
      const nx = x + Math.cos(rad) * len;
      const ny = y + Math.sin(rad) * len;
      segments.push({ x1: x, y1: y, x2: nx, y2: ny, depth, len });
      x = nx; y = ny;
    } else if (ch === '+') {
      heading += angleDeg + (Math.random() * 2 - 1) * jitterDeg;
    } else if (ch === '-') {
      heading -= angleDeg + (Math.random() * 2 - 1) * jitterDeg;
    } else if (ch === '[') {
      stack.push({ x, y, heading, len, depth });
      depth++;
      len *= lengthDecay;
    } else if (ch === ']') {
      const s = stack.pop();
      if (s) { x = s.x; y = s.y; heading = s.heading; len = s.len; depth = s.depth; }
    }
  }
  return segments;
}

function computeView(segments) {
  if (!segments.length) { view = { scale: 1, offsetX: cssWidth / 2, offsetY: cssHeight * 0.92 }; maxDepthSeen = 1; return; }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxDepth = 0;
  for (const s of segments) {
    minX = Math.min(minX, s.x1, s.x2);
    maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2);
    maxY = Math.max(maxY, s.y1, s.y2);
    if (s.depth > maxDepth) maxDepth = s.depth;
  }
  maxDepthSeen = Math.max(1, maxDepth);
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  const scale = Math.min((cssWidth * 0.8) / width, (cssHeight * 0.82) / height);
  const centerX = (minX + maxX) / 2;
  view = {
    scale,
    offsetX: cssWidth / 2 - centerX * scale,
    offsetY: cssHeight * 0.94,
  };
}

function lerpColor(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, cssHeight);
  sky.addColorStop(0, '#dff0f3');
  sky.addColorStop(0.75, '#f3efe6');
  sky.addColorStop(1, '#e4ddc0');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssWidth, cssHeight);
}

function drawScene(revealCount) {
  drawBackground();
  const showLeaves = el.leaves.checked;
  const n = Math.min(revealCount, currentSegments.length);

  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const s = currentSegments[i];
    const t = Math.min(1, s.depth / Math.max(3, maxDepthSeen));
    const [r, g, b] = lerpColor(TRUNK_COLOR, LEAF_TIP_COLOR, t);
    ctx.strokeStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
    ctx.lineWidth = Math.max(0.7, (maxDepthSeen - s.depth + 1) * 0.9);
    ctx.beginPath();
    ctx.moveTo(view.offsetX + s.x1 * view.scale, view.offsetY + s.y1 * view.scale);
    ctx.lineTo(view.offsetX + s.x2 * view.scale, view.offsetY + s.y2 * view.scale);
    ctx.stroke();

    if (showLeaves && s.depth >= maxDepthSeen - 1) {
      const colorIdx = (i * 2654435761) % LEAF_DOT_COLORS.length >>> 0;
      const [lr, lg, lb] = LEAF_DOT_COLORS[colorIdx % LEAF_DOT_COLORS.length];
      ctx.fillStyle = `rgb(${lr}, ${lg}, ${lb})`;
      ctx.beginPath();
      ctx.arc(view.offsetX + s.x2 * view.scale, view.offsetY + s.y2 * view.scale, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function currentOptions() {
  const presetKey = el.preset.value;
  const preset = PRESETS[presetKey];
  return {
    axiom: preset.axiom,
    rules: preset.rules,
    iterations: Number(el.iter.value),
    angleDeg: Number(el.angle.value),
    jitterDeg: Number(el.jitter.value),
    startLen: preset.startLen,
    lengthDecay: Number(el.decay.value),
  };
}

function buildTree() {
  const opts = currentOptions();
  const symbols = expandLSystem(opts.axiom, opts.rules, opts.iterations);
  currentSegments = interpret(symbols, opts);
  computeView(currentSegments);
}

function regenerateInstant() {
  buildTree();
  drawScene(currentSegments.length);
}

function regenerateAnimated() {
  buildTree();
  if (animFrameHandle) cancelAnimationFrame(animFrameHandle);
  const start = performance.now();
  const total = currentSegments.length;
  function tick(ts) {
    const frac = Math.min(1, (ts - start) / GROW_DURATION_MS);
    drawScene(Math.ceil(frac * total));
    if (frac < 1) animFrameHandle = requestAnimationFrame(tick);
  }
  animFrameHandle = requestAnimationFrame(tick);
}

function applyPresetDefaults() {
  const preset = PRESETS[el.preset.value];
  el.angle.value = preset.angle;
  el.angleValue.textContent = preset.angle;
  el.iter.value = preset.iterations;
  el.iterValue.textContent = preset.iterations;
  el.decay.value = preset.lengthDecay;
  el.decayValue.textContent = preset.lengthDecay.toFixed(2);
}

el.preset.addEventListener('change', () => { applyPresetDefaults(); regenerateAnimated(); });
el.growBtn.addEventListener('click', regenerateAnimated);

el.iter.addEventListener('input', () => { el.iterValue.textContent = el.iter.value; regenerateInstant(); });
el.angle.addEventListener('input', () => { el.angleValue.textContent = el.angle.value; regenerateInstant(); });
el.jitter.addEventListener('input', () => { el.jitterValue.textContent = el.jitter.value; regenerateInstant(); });
el.decay.addEventListener('input', () => { el.decayValue.textContent = Number(el.decay.value).toFixed(2); regenerateInstant(); });
el.leaves.addEventListener('change', () => drawScene(currentSegments.length));

el.downloadBtn.addEventListener('click', () => {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'procedural-tree.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
});

resizeCanvas();
regenerateAnimated();
