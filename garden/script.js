// Procedural Garden — L-system tree/plant generator, rendered in 3D.
// Same grammar rewriting as before, but the turtle now walks in 3D space:
// at every branch point it "rolls" around the trunk axis by the golden
// angle (the same spiral real plants use to spread leaves around a stem),
// which turns a flat 2D fan of branches into a full 3D bush. No WebGL/
// Three.js — just rotation matrices and a manual perspective projection,
// since all we're drawing is a few thousand line segments.

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

const MAX_SYMBOLS = 200000;
const GROW_DURATION_MS = 1800;
const TRUNK_COLOR = [107, 66, 38];
const LEAF_TIP_COLOR = [76, 175, 109];
const LEAF_DOT_COLORS = [[233, 163, 201], [255, 213, 110], [168, 216, 139]];
const SKY_FADE_COLOR = [223, 240, 243];
const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);
const BRANCH_ROLL_JITTER = 15 * (Math.PI / 180);
const AUTO_ROTATE_SPEED = 0.0028;

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
  hint: document.getElementById('hint-text'),
};

let dpr = Math.max(1, window.devicePixelRatio || 1);
let cssWidth = 0, cssHeight = 0;
let currentSegments = [];
let maxDepthSeen = 1;
let sceneView = { center: [0, 0, 0], radius: 1 };

let azimuth = 0.6;
let elevation = 0.28;
let zoom = 1;
let dragging = false;
let lastPointer = null;
let revealFraction = 1;
let growAnimating = false;
let growStart = 0;

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  cssWidth = rect.width;
  cssHeight = rect.height;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);

// --- L-system grammar (string rewriting, unchanged by the 3D upgrade) ---

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

// --- 3D turtle -------------------------------------------------------

function rotateAroundAxis(v, axis, angleRad) {
  const cosT = Math.cos(angleRad), sinT = Math.sin(angleRad);
  const [vx, vy, vz] = v;
  const [kx, ky, kz] = axis;
  const dot = vx * kx + vy * ky + vz * kz;
  const cx = ky * vz - kz * vy;
  const cy = kz * vx - kx * vz;
  const cz = kx * vy - ky * vx;
  const omc = 1 - cosT;
  return [
    vx * cosT + cx * sinT + kx * dot * omc,
    vy * cosT + cy * sinT + ky * dot * omc,
    vz * cosT + cz * sinT + kz * dot * omc,
  ];
}

function interpret3D(symbols, opts) {
  const { angleDeg, jitterDeg, startLen, lengthDecay } = opts;
  const angleRad = angleDeg * (Math.PI / 180);
  const jitterRad = jitterDeg * (Math.PI / 180);

  const segments = [];
  const stack = [];
  let pos = [0, 0, 0];
  let F = [0, 1, 0]; // growth direction
  let U = [0, 0, 1]; // axis that +/- turns rotate around
  let R = [1, 0, 0];
  let len = startLen;
  let depth = 0;
  let branchCount = 0;

  for (const ch of symbols) {
    if (ch === 'F' || ch === 'G') {
      const next = [pos[0] + F[0] * len, pos[1] + F[1] * len, pos[2] + F[2] * len];
      segments.push({ x1: pos[0], y1: pos[1], z1: pos[2], x2: next[0], y2: next[1], z2: next[2], depth });
      pos = next;
    } else if (ch === '+' || ch === '-') {
      const sign = ch === '+' ? 1 : -1;
      const a = sign * (angleRad + (Math.random() * 2 - 1) * jitterRad);
      F = rotateAroundAxis(F, U, a);
      R = rotateAroundAxis(R, U, a);
    } else if (ch === '[') {
      stack.push({ pos, F, U, R, len, depth });
      branchCount++;
      const roll = branchCount * GOLDEN_ANGLE + (Math.random() * 2 - 1) * BRANCH_ROLL_JITTER;
      U = rotateAroundAxis(U, F, roll);
      R = rotateAroundAxis(R, F, roll);
      depth++;
      len *= lengthDecay;
    } else if (ch === ']') {
      const s = stack.pop();
      if (s) { pos = s.pos; F = s.F; U = s.U; R = s.R; len = s.len; depth = s.depth; }
    }
  }
  return segments;
}

function computeScene(segments) {
  if (!segments.length) { sceneView = { center: [0, 0, 0], radius: 1 }; maxDepthSeen = 1; return; }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity, maxDepth = 0;
  for (const s of segments) {
    minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
    minZ = Math.min(minZ, s.z1, s.z2); maxZ = Math.max(maxZ, s.z1, s.z2);
    if (s.depth > maxDepth) maxDepth = s.depth;
  }
  maxDepthSeen = Math.max(1, maxDepth);
  const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  const radius = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) / 2);
  sceneView = { center, radius };
}

// --- projection + rendering --------------------------------------------

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

function render() {
  drawBackground();

  const n = Math.min(currentSegments.length, Math.ceil(revealFraction * currentSegments.length));
  if (n === 0) return;

  const { center, radius } = sceneView;
  const cosAz = Math.cos(azimuth), sinAz = Math.sin(azimuth);
  const cosEl = Math.cos(elevation), sinEl = Math.sin(elevation);
  const D = radius * 2.4;
  const pxScale = ((Math.min(cssWidth, cssHeight) * 0.42) / radius) * zoom;
  const cxpx = cssWidth / 2, cypx = cssHeight * 0.56;

  function project(x, y, z) {
    const px = x - center[0], py = y - center[1], pz = z - center[2];
    const x1 = px * cosAz + pz * sinAz;
    const z1 = -px * sinAz + pz * cosAz;
    const y2 = py * cosEl - z1 * sinEl;
    const z2 = py * sinEl + z1 * cosEl;
    const persp = D / (D - z2);
    return { sx: cxpx + x1 * pxScale * persp, sy: cypx - y2 * pxScale * persp, z2, persp };
  }

  const showLeaves = el.leaves.checked;
  const drawables = [];
  let zMin = Infinity, zMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const s = currentSegments[i];
    const p1 = project(s.x1, s.y1, s.z1);
    const p2 = project(s.x2, s.y2, s.z2);
    const avgZ = (p1.z2 + p2.z2) / 2;
    if (avgZ < zMin) zMin = avgZ;
    if (avgZ > zMax) zMax = avgZ;
    drawables.push({ p1, p2, depth: s.depth, avgZ, i });
  }
  drawables.sort((a, b) => a.avgZ - b.avgZ); // farthest first

  const zSpan = Math.max(1e-6, zMax - zMin);
  ctx.lineCap = 'round';
  for (const d of drawables) {
    const t = Math.min(1, d.depth / Math.max(3, maxDepthSeen));
    let [r, g, b] = lerpColor(TRUNK_COLOR, LEAF_TIP_COLOR, t);
    const farT = (zMax - d.avgZ) / zSpan; // 0 = nearest, 1 = farthest
    [r, g, b] = lerpColor([r, g, b], SKY_FADE_COLOR, farT * 0.55);
    ctx.strokeStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
    const avgPersp = (d.p1.persp + d.p2.persp) / 2;
    ctx.lineWidth = Math.max(0.5, (maxDepthSeen - d.depth + 1) * 0.8 * avgPersp);
    ctx.beginPath();
    ctx.moveTo(d.p1.sx, d.p1.sy);
    ctx.lineTo(d.p2.sx, d.p2.sy);
    ctx.stroke();

    if (showLeaves && d.depth >= maxDepthSeen - 1) {
      const colorIdx = (d.i * 2654435761) % LEAF_DOT_COLORS.length >>> 0;
      const [lr, lg, lb] = LEAF_DOT_COLORS[colorIdx % LEAF_DOT_COLORS.length];
      ctx.fillStyle = `rgb(${lr}, ${lg}, ${lb})`;
      ctx.beginPath();
      ctx.arc(d.p2.sx, d.p2.sy, 2.2 * avgPersp, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// --- tree (re)generation --------------------------------------------

function currentOptions() {
  const preset = PRESETS[el.preset.value];
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
  currentSegments = interpret3D(symbols, opts);
  computeScene(currentSegments);
}

function regenerateInstant() {
  buildTree();
  revealFraction = 1;
  growAnimating = false;
}

function regenerateAnimated() {
  buildTree();
  revealFraction = 0;
  growAnimating = true;
  growStart = performance.now();
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

// --- orbit controls --------------------------------------------------

canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastPointer = { x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  lastPointer = { x: e.clientX, y: e.clientY };
  azimuth += dx * 0.012;
  elevation = Math.max(-1.35, Math.min(1.35, elevation - dy * 0.012));
});
window.addEventListener('pointerup', () => { dragging = false; });

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoom = Math.max(0.45, Math.min(2.5, zoom * (1 - e.deltaY * 0.001)));
}, { passive: false });

// --- UI wiring --------------------------------------------------------

el.preset.addEventListener('change', () => { applyPresetDefaults(); regenerateAnimated(); });
el.growBtn.addEventListener('click', regenerateAnimated);

el.iter.addEventListener('input', () => { el.iterValue.textContent = el.iter.value; regenerateInstant(); });
el.angle.addEventListener('input', () => { el.angleValue.textContent = el.angle.value; regenerateInstant(); });
el.jitter.addEventListener('input', () => { el.jitterValue.textContent = el.jitter.value; regenerateInstant(); });
el.decay.addEventListener('input', () => { el.decayValue.textContent = Number(el.decay.value).toFixed(2); regenerateInstant(); });
el.leaves.addEventListener('change', () => {});

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

// --- main loop --------------------------------------------------------

function mainLoop(ts) {
  if (!dragging) azimuth += AUTO_ROTATE_SPEED;
  if (growAnimating) {
    const frac = Math.min(1, (ts - growStart) / GROW_DURATION_MS);
    revealFraction = frac;
    if (frac >= 1) growAnimating = false;
  }
  render();
  requestAnimationFrame(mainLoop);
}

resizeCanvas();
buildTree();
requestAnimationFrame(mainLoop);
