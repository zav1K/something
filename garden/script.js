// Procedural Garden — L-system tree/plant generator, rendered in 3D,
// potted, grown through real developmental stages, and now alive year
// round: it sways in a light breeze, turns with the seasons, and sheds
// leaves in autumn.
//
// Growth: every segment records how far along its branch's path (in
// cumulative length from the root) it starts and ends. "Age" is just
// that same cumulative distance, so scrubbing age grows each branch
// out of its parent instead of popping fully-formed line segments in.
//
// 3D-ification: at every branch point the turtle rolls its frame around
// the trunk axis by the golden angle (same spiral real phyllotaxis
// uses), spreading siblings around the trunk instead of fanning flat.
// Species differ by grammar, branch angle/taper, bark & leaf color, how
// densely leaves cluster near the tips, how much branches droop under
// their own weight (weeping willow), and whether the trunk starts on a
// trained lean (bonsai).
//
// Reproducibility: structural randomness (turn jitter, branch spread)
// is drawn from a seeded PRNG, not Math.random. Grow rolls a fresh
// seed; dragging a slider keeps the current one, so nudging an angle
// adjusts THIS tree instead of reshuffling into an unrelated one. The
// seed travels in the share link so a specific specimen is a URL, not
// a screenshot.

const PRESETS = {
  // --- abstract (original presets, unchanged look) ---
  fractalPlant: {
    group: 'Abstract', label: 'Fractal Plant', deciduous: true,
    axiom: 'X', rules: { X: 'F+[[X]-X]-F[-FX]+X', F: 'FF' },
    angle: 25, jitter: 4, iterations: 5, startLen: 7, lengthDecay: 0.97,
    trunkColor: [107, 66, 38], leafColor: [76, 175, 109],
    leafDots: [[233, 163, 201], [255, 213, 110], [168, 216, 139]],
    leafDepthFrac: 0.3, gravityBias: 0, leanDeg: 0,
  },
  binaryTree: {
    group: 'Abstract', label: 'Young Sapling', deciduous: true,
    axiom: 'F', rules: { F: 'F[+F]F[-F]F' },
    angle: 30, jitter: 4, iterations: 4, startLen: 9, lengthDecay: 0.78,
    trunkColor: [107, 66, 38], leafColor: [76, 175, 109],
    leafDots: [[233, 163, 201], [255, 213, 110], [168, 216, 139]],
    leafDepthFrac: 0.3, gravityBias: 0, leanDeg: 0,
  },
  bushyShrub: {
    group: 'Abstract', label: 'Bushy Shrub', deciduous: true,
    axiom: 'F', rules: { F: 'FF-[-F+F+F]+[+F-F-F]' },
    angle: 22, jitter: 4, iterations: 4, startLen: 11, lengthDecay: 0.88,
    trunkColor: [107, 66, 38], leafColor: [76, 175, 109],
    leafDots: [[233, 163, 201], [255, 213, 110], [168, 216, 139]],
    leafDepthFrac: 0.3, gravityBias: 0, leanDeg: 0,
  },
  sparseTree: {
    group: 'Abstract', label: 'Sparse Tree', deciduous: true,
    axiom: 'F', rules: { F: 'F[+F]F[-F][F]' },
    angle: 20, jitter: 4, iterations: 5, startLen: 8, lengthDecay: 0.86,
    trunkColor: [107, 66, 38], leafColor: [76, 175, 109],
    leafDots: [[233, 163, 201], [255, 213, 110], [168, 216, 139]],
    leafDepthFrac: 0.3, gravityBias: 0, leanDeg: 0,
  },

  // --- real species (reuse the two grammars that read lushest, and tell
  // species apart through color/angle/taper/gravity/lean instead) ---
  oak: {
    group: 'Real species', label: 'Oak', deciduous: true,
    axiom: 'F', rules: { F: 'FF-[-F+F+F]+[+F-F-F]' },
    angle: 26, jitter: 4, iterations: 4, startLen: 9, lengthDecay: 0.85,
    trunkColor: [92, 70, 48], leafColor: [70, 128, 58],
    leafDots: [[70, 140, 60], [88, 155, 74], [56, 112, 50]],
    leafDepthFrac: 0.55, gravityBias: 0, leanDeg: 0,
  },
  willow: {
    group: 'Real species', label: 'Weeping Willow', deciduous: true,
    axiom: 'F', rules: { F: 'FF-[-F+F+F]+[+F-F-F]' },
    angle: 30, jitter: 5, iterations: 4, startLen: 9, lengthDecay: 0.76,
    trunkColor: [80, 64, 46], leafColor: [158, 185, 104],
    leafDots: [[170, 195, 115], [185, 205, 130], [150, 178, 96]],
    leafDepthFrac: 0.6, gravityBias: 0.16, leanDeg: 0,
  },
  pine: {
    group: 'Real species', label: 'Pine', deciduous: false,
    axiom: 'F', rules: { F: 'F[+F]F[-F][F]' },
    angle: 16, jitter: 2, iterations: 5, startLen: 7, lengthDecay: 0.84,
    trunkColor: [70, 52, 38], leafColor: [42, 86, 54],
    leafDots: [[36, 86, 54], [50, 100, 64], [28, 70, 44]],
    leafDepthFrac: 0.42, gravityBias: 0, leanDeg: 0,
  },
  sakura: {
    group: 'Real species', label: 'Sakura', deciduous: true,
    axiom: 'F', rules: { F: 'FF-[-F+F+F]+[+F-F-F]' },
    angle: 24, jitter: 4, iterations: 4, startLen: 9, lengthDecay: 0.87,
    trunkColor: [94, 72, 60], leafColor: [238, 176, 200],
    leafDots: [[250, 200, 220], [242, 172, 196], [255, 228, 236]],
    leafDepthFrac: 0.65, gravityBias: 0, leanDeg: 0,
  },
  bonsai: {
    group: 'Real species', label: 'Bonsai Juniper', deciduous: false,
    axiom: 'F', rules: { F: 'FF-[-F+F+F]+[+F-F-F]' },
    angle: 32, jitter: 12, iterations: 3, startLen: 10, lengthDecay: 0.68,
    trunkColor: [100, 76, 54], leafColor: [64, 120, 68],
    leafDots: [[58, 122, 64], [72, 136, 78], [46, 100, 54]],
    leafDepthFrac: 0.4, gravityBias: 0, leanDeg: 22,
  },
};

const MAX_SYMBOLS = 200000;
const GROW_DURATION_MS = 4500;
const SKY_FADE_COLOR = [223, 240, 243];
const GOLDEN_ANGLE = 137.5 * (Math.PI / 180);
const BRANCH_ROLL_JITTER = 15 * (Math.PI / 180);
const AUTO_ROTATE_SPEED = 0.0022;
const MAX_LEAF_PARTICLES = 40;
const LEAF_PARTICLE_SPAWN_MS = 220;
const AUTUMN_COLOR = [206, 110, 42];
const SPRING_COLOR = [205, 230, 150];

const canvas = document.getElementById('tree-canvas');
const ctx = canvas.getContext('2d');

const el = {
  preset: document.getElementById('preset-input'),
  season: document.getElementById('season-input'),
  age: document.getElementById('age-input'),
  ageValue: document.getElementById('age-value'),
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
  shareBtn: document.getElementById('share-btn'),
  toast: document.getElementById('toast'),
};

let dpr = Math.max(1, window.devicePixelRatio || 1);
let cssWidth = 0, cssHeight = 0;
let currentSegments = [];
let currentPotQuads = [];
let currentTrunkColor = [107, 66, 38];
let currentLeafColor = [76, 175, 109];
let currentLeafDots = [[233, 163, 201]];
let currentLeafDepthFrac = 0.3;
let currentDeciduous = true;
let maxDepthSeen = 1;
let sceneView = { center: [0, 0, 0], radius: 1, maxPathLen: 1 };

let azimuth = 0.6;
let elevation = 0.28;
let zoom = 1;
let dragging = false;
let lastPointer = null;
let growAge = 1;
let growAnimating = false;
let growStart = 0;

let leafParticles = [];
let lastParticleSpawnTs = 0;
let lastFrameTs = 0;
let toastTimer = null;

// --- seeded randomness ---------------------------------------------------
// Structural shape comes from this PRNG, not Math.random, so a seed fully
// determines a tree's geometry: same seed + same sliders = same plant.

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let currentSeed = (Math.random() * 2 ** 31) | 0;
let rng = mulberry32(currentSeed);

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  cssWidth = rect.width;
  cssHeight = rect.height;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2400);
}

// --- L-system grammar (string rewriting) --------------------------------

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

function applyGravity(F, U, R, biasRad) {
  const down = [0, -1, 0];
  const cx = F[1] * down[2] - F[2] * down[1];
  const cy = F[2] * down[0] - F[0] * down[2];
  const cz = F[0] * down[1] - F[1] * down[0];
  const len = Math.hypot(cx, cy, cz);
  if (len < 1e-6) return [F, U, R];
  const axis = [cx / len, cy / len, cz / len];
  return [
    rotateAroundAxis(F, axis, biasRad),
    rotateAroundAxis(U, axis, biasRad),
    rotateAroundAxis(R, axis, biasRad),
  ];
}

function interpret3D(symbols, opts) {
  const { angleDeg, jitterDeg, startLen, lengthDecay, gravityBias, leanDeg } = opts;
  const angleRad = angleDeg * (Math.PI / 180);
  const jitterRad = jitterDeg * (Math.PI / 180);

  const segments = [];
  const stack = [];
  let pos = [0, 0, 0];
  let F = [0, 1, 0];
  let U = [0, 0, 1];
  let R = [1, 0, 0];
  let len = startLen;
  let depth = 0;
  let branchCount = 0;
  let pathLen = 0;

  if (leanDeg) {
    const leanRad = leanDeg * (Math.PI / 180);
    F = rotateAroundAxis(F, R, leanRad);
    U = rotateAroundAxis(U, R, leanRad);
  }

  for (const ch of symbols) {
    if (ch === 'F' || ch === 'G') {
      if (gravityBias && depth >= 1) [F, U, R] = applyGravity(F, U, R, gravityBias);
      const next = [pos[0] + F[0] * len, pos[1] + F[1] * len, pos[2] + F[2] * len];
      const born = pathLen;
      pathLen += len;
      segments.push({ x1: pos[0], y1: pos[1], z1: pos[2], x2: next[0], y2: next[1], z2: next[2], depth, born, bornEnd: pathLen });
      pos = next;
    } else if (ch === '+' || ch === '-') {
      const sign = ch === '+' ? 1 : -1;
      const a = sign * (angleRad + (rng() * 2 - 1) * jitterRad);
      F = rotateAroundAxis(F, U, a);
      R = rotateAroundAxis(R, U, a);
    } else if (ch === '[') {
      stack.push({ pos, F, U, R, len, depth, pathLen });
      branchCount++;
      const roll = branchCount * GOLDEN_ANGLE + (rng() * 2 - 1) * BRANCH_ROLL_JITTER;
      U = rotateAroundAxis(U, F, roll);
      R = rotateAroundAxis(R, F, roll);
      depth++;
      len *= lengthDecay;
    } else if (ch === ']') {
      const s = stack.pop();
      if (s) { pos = s.pos; F = s.F; U = s.U; R = s.R; len = s.len; depth = s.depth; pathLen = s.pathLen; }
    }
  }
  return segments;
}

// --- pot -----------------------------------------------------------------

function buildPot(treeHeight) {
  const potTopR = Math.max(0.6, treeHeight * 0.16);
  const potBottomR = potTopR * 0.76;
  const potHeight = Math.max(0.5, treeHeight * 0.22);
  const footH = potHeight * 0.12;
  const M = 20;
  const rim = [], base = [];
  for (let i = 0; i <= M; i++) {
    const a = (i / M) * Math.PI * 2;
    rim.push([Math.cos(a) * potTopR, potHeight, Math.sin(a) * potTopR]);
    base.push([Math.cos(a) * potBottomR, footH, Math.sin(a) * potBottomR]);
  }
  const potColor = [176, 94, 56];
  const soilColor = [56, 41, 30];
  const quads = [];
  for (let i = 0; i < M; i++) {
    const azMid = ((i + 0.5) / M) * Math.PI * 2;
    quads.push({ pts: [rim[i], rim[i + 1], base[i + 1], base[i]], color: potColor, azMid });
  }
  const soilR = potTopR * 0.9;
  const soilY = potHeight + Math.max(0.01, treeHeight * 0.002);
  const soilRing = [];
  for (let i = 0; i <= M; i++) {
    const a = (i / M) * Math.PI * 2;
    soilRing.push([Math.cos(a) * soilR, soilY, Math.sin(a) * soilR]);
  }
  const soilCenter = [0, soilY, 0];
  for (let i = 0; i < M; i++) {
    quads.push({ pts: [soilCenter, soilRing[i], soilRing[i + 1]], color: soilColor, azMid: null });
  }
  return { quads, potHeight };
}

// --- scene bounds ----------------------------------------------------

function computeScene(treeSegments, potQuads) {
  if (!treeSegments.length) { sceneView = { center: [0, 0, 0], radius: 1, maxPathLen: 1 }; maxDepthSeen = 1; return; }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let maxDepth = 0, maxPath = 0;
  for (const s of treeSegments) {
    minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
    minZ = Math.min(minZ, s.z1, s.z2); maxZ = Math.max(maxZ, s.z1, s.z2);
    if (s.depth > maxDepth) maxDepth = s.depth;
    if (s.bornEnd > maxPath) maxPath = s.bornEnd;
  }
  for (const q of potQuads) {
    for (const p of q.pts) {
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      minZ = Math.min(minZ, p[2]); maxZ = Math.max(maxZ, p[2]);
    }
  }
  maxDepthSeen = Math.max(1, maxDepth);
  const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
  const dx = maxX - minX, dy = maxY - minY, dz = maxZ - minZ;
  const radius = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz) / 2);
  sceneView = { center, radius, maxPathLen: Math.max(1, maxPath) };
}

// --- seasons --------------------------------------------------------

function seasonalLeafColor(season) {
  if (!currentDeciduous) return currentLeafColor;
  if (season === 'winter') return null; // bare
  if (season === 'spring') return lerpColor(currentLeafColor, SPRING_COLOR, 0.4);
  if (season === 'autumn') return lerpColor(currentLeafColor, AUTUMN_COLOR, 0.7);
  return currentLeafColor;
}

function seasonalLeafDots(season) {
  const base = seasonalLeafColor(season);
  if (!base) return null;
  if (season === 'summer' || !currentDeciduous) return currentLeafDots;
  return currentLeafDots.map((c) => (
    season === 'autumn' ? lerpColor(c, AUTUMN_COLOR, 0.7)
      : season === 'spring' ? lerpColor(c, SPRING_COLOR, 0.4)
        : c
  ));
}

// --- falling leaf particles (autumn, deciduous only) ---------------------

function updateParticles(ts, ageDist, leafThreshold) {
  const dt = Math.min(0.05, (ts - (lastFrameTs || ts)) / 1000);
  lastFrameTs = ts;

  const season = el.season.value;
  const sheddable = season === 'autumn' && currentDeciduous && el.leaves.checked;

  if (sheddable && leafParticles.length < MAX_LEAF_PARTICLES && ts - lastParticleSpawnTs > LEAF_PARTICLE_SPAWN_MS) {
    lastParticleSpawnTs = ts;
    const candidates = currentSegments.filter((s) => s.bornEnd <= ageDist && s.depth >= leafThreshold);
    if (candidates.length) {
      const s = candidates[(Math.random() * candidates.length) | 0];
      const dots = seasonalLeafDots('autumn') || currentLeafDots;
      leafParticles.push({
        x: s.x2, y: s.y2, z: s.z2,
        vy: sceneView.radius * (0.22 + Math.random() * 0.14),
        swayPhase: Math.random() * Math.PI * 2,
        swayFreq: 0.8 + Math.random() * 0.6,
        color: dots[(Math.random() * dots.length) | 0],
      });
    }
  }

  const floorY = -sceneView.radius * 0.25;
  leafParticles = leafParticles.filter((p) => {
    p.y -= p.vy * dt;
    return p.y > floorY;
  });
}

// --- rendering --------------------------------------------------------

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

function windOffset(pathLenAtPoint, tsec) {
  const f = Math.pow(Math.min(1, pathLenAtPoint / sceneView.maxPathLen), 1.6);
  const amp = sceneView.radius * 0.05 * f;
  const phase = pathLenAtPoint * 0.7;
  return [
    Math.sin(tsec * 1.3 + phase) * amp,
    Math.cos(tsec * 1.1 + phase * 1.3) * amp * 0.6,
  ];
}

function render(ts, ageDist, leafThreshold) {
  drawBackground();
  const { center, radius } = sceneView;
  const cosAz = Math.cos(azimuth), sinAz = Math.sin(azimuth);
  const cosEl = Math.cos(elevation), sinEl = Math.sin(elevation);
  const D = radius * 2.6;
  const pxScale = ((Math.min(cssWidth, cssHeight) * 0.4) / radius) * zoom;
  const cxpx = cssWidth / 2, cypx = cssHeight * 0.58;
  const tsec = ts / 1000;

  function project(x, y, z) {
    const px = x - center[0], py = y - center[1], pz = z - center[2];
    const x1 = px * cosAz + pz * sinAz;
    const z1 = -px * sinAz + pz * cosAz;
    const y2 = py * cosEl - z1 * sinEl;
    const z2 = py * sinEl + z1 * cosEl;
    const persp = D / (D - z2);
    return { sx: cxpx + x1 * pxScale * persp, sy: cypx - y2 * pxScale * persp, z2, persp };
  }

  const season = el.season.value;
  const seasonLeafColor = seasonalLeafColor(season);
  const seasonLeafDots = seasonalLeafDots(season);
  const leavesVisible = el.leaves.checked && seasonLeafColor !== null;

  const drawables = [];
  let zMin = Infinity, zMax = -Infinity;

  for (let i = 0; i < currentSegments.length; i++) {
    const s = currentSegments[i];
    if (ageDist <= s.born) continue;
    let ex = s.x2, ey = s.y2, ez = s.z2, grown = true;
    let tipPathLen = s.bornEnd;
    if (ageDist < s.bornEnd) {
      const frac = (ageDist - s.born) / Math.max(1e-6, s.bornEnd - s.born);
      ex = s.x1 + (s.x2 - s.x1) * frac;
      ey = s.y1 + (s.y2 - s.y1) * frac;
      ez = s.z1 + (s.z2 - s.z1) * frac;
      grown = false;
      tipPathLen = ageDist;
    }
    const [swx1, swz1] = windOffset(s.born, tsec);
    const [swx2, swz2] = windOffset(tipPathLen, tsec);
    const p1 = project(s.x1 + swx1, s.y1, s.z1 + swz1);
    const p2 = project(ex + swx2, ey, ez + swz2);
    const avgZ = (p1.z2 + p2.z2) / 2;
    if (avgZ < zMin) zMin = avgZ;
    if (avgZ > zMax) zMax = avgZ;
    drawables.push({
      type: 'line', p1, p2, depth: s.depth, avgZ, i,
      leafEligible: grown && leavesVisible && s.depth >= leafThreshold,
    });
  }

  for (const q of currentPotQuads) {
    const proj = q.pts.map((p) => project(p[0], p[1], p[2]));
    const avgZ = proj.reduce((a, p) => a + p.z2, 0) / proj.length;
    if (avgZ < zMin) zMin = avgZ;
    if (avgZ > zMax) zMax = avgZ;
    drawables.push({ type: 'poly', proj, color: q.color, avgZ, azMid: q.azMid });
  }

  for (const p of leafParticles) {
    const sway = Math.sin(tsec * p.swayFreq + p.swayPhase) * sceneView.radius * 0.1;
    const proj = project(p.x + sway, p.y, p.z);
    if (proj.z2 < zMin) zMin = proj.z2;
    if (proj.z2 > zMax) zMax = proj.z2;
    drawables.push({ type: 'dot', p: proj, color: p.color, avgZ: proj.z2 });
  }

  drawables.sort((a, b) => a.avgZ - b.avgZ);
  const zSpan = Math.max(1e-6, zMax - zMin);

  ctx.lineCap = 'round';
  for (const d of drawables) {
    const farT = (zMax - d.avgZ) / zSpan;
    if (d.type === 'line') {
      const t = seasonLeafColor ? Math.min(1, d.depth / Math.max(3, maxDepthSeen)) : 0;
      let [r, g, b] = lerpColor(currentTrunkColor, seasonLeafColor || currentTrunkColor, t);
      [r, g, b] = lerpColor([r, g, b], SKY_FADE_COLOR, farT * 0.5);
      ctx.strokeStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      const avgPersp = (d.p1.persp + d.p2.persp) / 2;
      ctx.lineWidth = Math.max(0.5, (maxDepthSeen - d.depth + 1) * 0.8 * avgPersp);
      ctx.beginPath();
      ctx.moveTo(d.p1.sx, d.p1.sy);
      ctx.lineTo(d.p2.sx, d.p2.sy);
      ctx.stroke();

      if (d.leafEligible && seasonLeafDots) {
        const colorIdx = (d.i * 2654435761) % seasonLeafDots.length >>> 0;
        const [lr, lg, lb] = seasonLeafDots[colorIdx % seasonLeafDots.length];
        ctx.fillStyle = `rgb(${lr}, ${lg}, ${lb})`;
        ctx.beginPath();
        ctx.arc(d.p2.sx, d.p2.sy, 2.2 * avgPersp, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.type === 'poly') {
      let [r, g, b] = d.color;
      if (d.azMid !== null) {
        const facing = (Math.cos(d.azMid - azimuth) + 1) / 2;
        const shade = 0.62 + 0.38 * facing;
        r *= shade; g *= shade; b *= shade;
      }
      [r, g, b] = lerpColor([r, g, b], SKY_FADE_COLOR, farT * 0.35);
      ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      ctx.beginPath();
      ctx.moveTo(d.proj[0].sx, d.proj[0].sy);
      for (let k = 1; k < d.proj.length; k++) ctx.lineTo(d.proj[k].sx, d.proj[k].sy);
      ctx.closePath();
      ctx.fill();
    } else {
      let [r, g, b] = d.color;
      [r, g, b] = lerpColor([r, g, b], SKY_FADE_COLOR, farT * 0.4);
      ctx.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      ctx.beginPath();
      ctx.arc(d.p.sx, d.p.sy, 2.6 * d.p.persp, 0, Math.PI * 2);
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
    gravityBias: preset.gravityBias || 0,
    leanDeg: preset.leanDeg || 0,
  };
}

function buildTree() {
  const preset = PRESETS[el.preset.value];
  currentTrunkColor = preset.trunkColor;
  currentLeafColor = preset.leafColor;
  currentLeafDots = preset.leafDots;
  currentLeafDepthFrac = preset.leafDepthFrac;
  currentDeciduous = preset.deciduous;

  rng = mulberry32(currentSeed);
  const opts = currentOptions();
  const symbols = expandLSystem(opts.axiom, opts.rules, opts.iterations);
  const rawSegments = interpret3D(symbols, opts);

  let treeHeight = 1;
  for (const s of rawSegments) treeHeight = Math.max(treeHeight, s.y1, s.y2);
  const pot = buildPot(treeHeight);

  currentSegments = rawSegments.map((s) => ({ ...s, y1: s.y1 + pot.potHeight, y2: s.y2 + pot.potHeight }));
  currentPotQuads = pot.quads;
  computeScene(currentSegments, currentPotQuads);
  leafParticles = [];
}

function setAgeDisplay(pct) {
  el.age.value = String(pct);
  el.ageValue.textContent = String(pct);
}

function regenerateInstant() {
  buildTree();
  growAge = Number(el.age.value) / 100;
  growAnimating = false;
}

function regenerateAnimated() {
  currentSeed = (Math.random() * 2 ** 31) | 0;
  buildTree();
  growAge = 0;
  growAnimating = true;
  growStart = performance.now();
  setAgeDisplay(0);
}

function applyPresetDefaults() {
  const preset = PRESETS[el.preset.value];
  el.angle.value = preset.angle; el.angleValue.textContent = preset.angle;
  el.iter.value = preset.iterations; el.iterValue.textContent = preset.iterations;
  el.decay.value = preset.lengthDecay; el.decayValue.textContent = preset.lengthDecay.toFixed(2);
  el.jitter.value = preset.jitter; el.jitterValue.textContent = preset.jitter;
}

// --- share link -------------------------------------------------------

function loadFromUrlIfPresent() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('species') || !PRESETS[params.get('species')]) return false;
  el.preset.value = params.get('species');
  applyPresetDefaults();
  if (params.has('iter')) el.iter.value = params.get('iter');
  if (params.has('angle')) el.angle.value = params.get('angle');
  if (params.has('jitter')) el.jitter.value = params.get('jitter');
  if (params.has('decay')) el.decay.value = params.get('decay');
  if (params.has('season') && ['spring', 'summer', 'autumn', 'winter'].includes(params.get('season'))) {
    el.season.value = params.get('season');
  }
  el.iterValue.textContent = el.iter.value;
  el.angleValue.textContent = el.angle.value;
  el.jitterValue.textContent = el.jitter.value;
  el.decayValue.textContent = Number(el.decay.value).toFixed(2);
  const seedParam = Number(params.get('seed'));
  if (Number.isFinite(seedParam) && seedParam) currentSeed = seedParam | 0;
  return true;
}

function shareLink() {
  const params = new URLSearchParams({
    species: el.preset.value,
    iter: el.iter.value,
    angle: el.angle.value,
    jitter: el.jitter.value,
    decay: el.decay.value,
    season: el.season.value,
    seed: String(currentSeed),
  });
  const url = `${location.origin}${location.pathname}?${params.toString()}`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(
      () => showToast('Link copied — paste it anywhere'),
      () => showToast(url),
    );
  } else {
    showToast(url);
  }
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
el.shareBtn.addEventListener('click', shareLink);
el.season.addEventListener('change', () => { leafParticles = []; });

el.age.addEventListener('input', () => {
  growAnimating = false;
  growAge = Number(el.age.value) / 100;
  el.ageValue.textContent = el.age.value;
});

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
    growAge = frac;
    setAgeDisplay(Math.round(frac * 100));
    if (frac >= 1) growAnimating = false;
  }
  const ageDist = growAge * sceneView.maxPathLen;
  const leafThreshold = maxDepthSeen * (1 - currentLeafDepthFrac);
  updateParticles(ts, ageDist, leafThreshold);
  render(ts, ageDist, leafThreshold);
  requestAnimationFrame(mainLoop);
}

resizeCanvas();
const loadedFromUrl = loadFromUrlIfPresent();
if (!loadedFromUrl) applyPresetDefaults();
if (loadedFromUrl) regenerateInstant(); else regenerateAnimated();
requestAnimationFrame(mainLoop);
