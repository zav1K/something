// Granum — a tiny falling-sand physics playground.
// Cellular automaton: each material follows a local rule, applied on a
// low-res grid that's upscaled to the screen for that chunky "powder toy" look.

const EMPTY = 0, SAND = 1, WATER = 2, STONE = 3, WOOD = 4, FIRE = 5, OIL = 6, SMOKE = 7;
const MATERIALS = { EMPTY, SAND, WATER, STONE, WOOD, FIRE, OIL, SMOKE };

const FIRE_LIFE_MIN = 35, FIRE_LIFE_MAX = 70;
const SMOKE_LIFE_MIN = 40, SMOKE_LIFE_MAX = 90;
const WOOD_IGNITE_CHANCE = 0.035;
const OIL_IGNITE_CHANCE = 0.14;
const FIRE_RISE_CHANCE = 0.35;

const NEI = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

const canvas = document.getElementById('sim-canvas');
const mainCtx = canvas.getContext('2d');
const simCanvas = document.createElement('canvas');
const simCtx = simCanvas.getContext('2d');
const hint = document.getElementById('hint');
const brushInput = document.getElementById('brush-size');
const pauseBtn = document.getElementById('pause-btn');
const clearBtn = document.getElementById('clear-btn');

let dpr = Math.max(1, window.devicePixelRatio || 1);
let cols = 0, rows = 0, CELL = 6;
let mat, life, variant;
let simImg;

let selectedMaterial = SAND;
let brushSize = Number(brushInput.value);
let paused = false;
let painting = false;

function idx(x, y) { return y * cols + x; }
function inBounds(x, y) { return x >= 0 && x < cols && y >= 0 && y < rows; }

function randRange(a, b) { return a + Math.floor(Math.random() * (b - a)); }
function randFireLife() { return randRange(FIRE_LIFE_MIN, FIRE_LIFE_MAX); }
function randSmokeLife() { return randRange(SMOKE_LIFE_MIN, SMOKE_LIFE_MAX); }

function swap(i, j) {
  const m = mat[i]; mat[i] = mat[j]; mat[j] = m;
  const l = life[i]; life[i] = life[j]; life[j] = l;
  const v = variant[i]; variant[i] = variant[j]; variant[j] = v;
}

function neighborHas(x, y, material) {
  for (const [dx, dy] of NEI) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny) && mat[idx(nx, ny)] === material) return true;
  }
  return false;
}

function forEachNeighbor(x, y, cb) {
  for (const [dx, dy] of NEI) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(nx, ny)) cb(nx, ny, idx(nx, ny));
  }
}

function setupGrid() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const stageWidth = rect.width;
  const stageHeight = rect.height;

  const targetCols = 220;
  CELL = Math.max(3, stageWidth / targetCols);
  cols = Math.max(10, Math.floor(stageWidth / CELL));
  rows = Math.max(10, Math.floor(stageHeight / CELL));

  mat = new Uint8Array(cols * rows);
  life = new Uint16Array(cols * rows);
  variant = new Uint8Array(cols * rows);

  canvas.width = Math.round(stageWidth * dpr);
  canvas.height = Math.round(stageHeight * dpr);

  simCanvas.width = cols;
  simCanvas.height = rows;
  simImg = simCtx.createImageData(cols, rows);
}

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(setupGrid, 150);
});

// --- material rules -------------------------------------------------------

function updateSand(x, y, i) {
  const by = y + 1;
  if (inBounds(x, by)) {
    const bi = idx(x, by);
    const bm = mat[bi];
    if (bm === EMPTY || bm === WATER || bm === OIL) { swap(i, bi); return; }
  }
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const d of [dir, -dir]) {
    const dx = x + d, dy = y + 1;
    if (inBounds(dx, dy)) {
      const di = idx(dx, dy);
      const dm = mat[di];
      if (dm === EMPTY || dm === WATER || dm === OIL) { swap(i, di); return; }
    }
  }
}

function updateWater(x, y, i) {
  const by = y + 1;
  if (inBounds(x, by)) {
    const bi = idx(x, by);
    const bm = mat[bi];
    if (bm === EMPTY || bm === OIL) { swap(i, bi); return; }
  }
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const d of [dir, -dir]) {
    const dx = x + d, dy = y + 1;
    if (inBounds(dx, dy) && mat[idx(dx, dy)] === EMPTY) { swap(i, idx(dx, dy)); return; }
  }
  for (const d of [dir, -dir]) {
    const dx = x + d;
    if (inBounds(dx, y) && mat[idx(dx, y)] === EMPTY) { swap(i, idx(dx, y)); return; }
  }
}

function updateOil(x, y, i) {
  const by = y + 1;
  if (inBounds(x, by) && mat[idx(x, by)] === EMPTY) { swap(i, idx(x, by)); return; }
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const d of [dir, -dir]) {
    const dx = x + d, dy = y + 1;
    if (inBounds(dx, dy) && mat[idx(dx, dy)] === EMPTY) { swap(i, idx(dx, dy)); return; }
  }
  for (const d of [dir, -dir]) {
    const dx = x + d;
    if (inBounds(dx, y) && mat[idx(dx, y)] === EMPTY) { swap(i, idx(dx, y)); return; }
  }
}

function updateWood(x, y, i) {
  if (neighborHas(x, y, FIRE) && Math.random() < WOOD_IGNITE_CHANCE) {
    mat[i] = FIRE; life[i] = randFireLife();
  }
}

function updateFire(x, y, i) {
  life[i]--;
  if (life[i] <= 0) {
    if (Math.random() < 0.5) { mat[i] = SMOKE; life[i] = randSmokeLife(); }
    else { mat[i] = EMPTY; life[i] = 0; }
    return;
  }
  if (neighborHas(x, y, WATER)) {
    mat[i] = SMOKE; life[i] = randSmokeLife() >> 1;
    return;
  }
  forEachNeighbor(x, y, (nx, ny, ni) => {
    const nm = mat[ni];
    if (nm === WOOD && Math.random() < WOOD_IGNITE_CHANCE * 1.5) {
      mat[ni] = FIRE; life[ni] = randFireLife();
    } else if (nm === OIL && Math.random() < OIL_IGNITE_CHANCE) {
      mat[ni] = FIRE; life[ni] = randFireLife();
    }
  });
  if (Math.random() < FIRE_RISE_CHANCE) {
    const opts = [[x, y - 1], [x - 1, y - 1], [x + 1, y - 1]];
    for (let k = opts.length - 1; k > 0; k--) {
      const j = (Math.random() * (k + 1)) | 0;
      [opts[k], opts[j]] = [opts[j], opts[k]];
    }
    for (const [nx, ny] of opts) {
      if (inBounds(nx, ny) && mat[idx(nx, ny)] === EMPTY) { swap(i, idx(nx, ny)); return; }
    }
  }
}

function updateSmoke(x, y, i) {
  life[i]--;
  if (life[i] <= 0) { mat[i] = EMPTY; return; }
  if (inBounds(x, y - 1) && mat[idx(x, y - 1)] === EMPTY) { swap(i, idx(x, y - 1)); return; }
  const dir = Math.random() < 0.5 ? -1 : 1;
  for (const d of [dir, -dir]) {
    const dx = x + d, dy = y - 1;
    if (inBounds(dx, dy) && mat[idx(dx, dy)] === EMPTY) { swap(i, idx(dx, dy)); return; }
  }
}

function step() {
  for (let y = rows - 1; y >= 0; y--) {
    const leftToRight = (y % 2) === 0;
    for (let xi = 0; xi < cols; xi++) {
      const x = leftToRight ? xi : cols - 1 - xi;
      const i = idx(x, y);
      switch (mat[i]) {
        case SAND: updateSand(x, y, i); break;
        case WATER: updateWater(x, y, i); break;
        case OIL: updateOil(x, y, i); break;
        case WOOD: updateWood(x, y, i); break;
        case FIRE: updateFire(x, y, i); break;
        case SMOKE: updateSmoke(x, y, i); break;
        default: break;
      }
    }
  }
}

// --- rendering --------------------------------------------------------

function colorFor(m, v, l) {
  switch (m) {
    case SAND: { const j = (v % 20) - 10; return [217 + j, 178 + ((j * 0.7) | 0), 107 + ((j * 0.5) | 0)]; }
    case WATER: return [40 + (v % 8), 108 + (v % 14), 228 + (v % 10)];
    case STONE: { const j = (v % 18) - 9; return [110 + j, 114 + j, 124 + j]; }
    case WOOD: { const j = (v % 16) - 8; return [124 + j, 76 + ((j * 0.6) | 0), 38 + ((j * 0.4) | 0)]; }
    case OIL: { const j = (v % 10) - 5; return [48 + j, 42 + j, 30 + j]; }
    case FIRE: {
      const t = Math.max(0, Math.min(1, l / FIRE_LIFE_MAX));
      return [255, 60 + Math.floor(170 * t), Math.floor(40 * t)];
    }
    case SMOKE: {
      const t = Math.max(0, Math.min(1, l / SMOKE_LIFE_MAX));
      const g = 60 + Math.floor(60 * (1 - t));
      return [g, g, g + 4];
    }
    default: return [8, 9, 11];
  }
}

function render() {
  const data = simImg.data;
  for (let i = 0, p = 0; i < mat.length; i++, p += 4) {
    const [r, g, b] = colorFor(mat[i], variant[i], life[i]);
    data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = 255;
  }
  simCtx.putImageData(simImg, 0, 0);
  mainCtx.imageSmoothingEnabled = false;
  mainCtx.drawImage(simCanvas, 0, 0, cols, rows, 0, 0, canvas.width, canvas.height);
}

// --- input --------------------------------------------------------------

function pointerToGrid(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  return [Math.floor(relX * cols), Math.floor(relY * rows)];
}

function paintAt(gx, gy, material) {
  const r = brushSize;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = gx + dx, y = gy + dy;
      if (!inBounds(x, y)) continue;
      const i = idx(x, y);
      if (material === EMPTY) {
        if (mat[i] === STONE) continue;
        mat[i] = EMPTY; life[i] = 0; variant[i] = 0;
      } else {
        mat[i] = material;
        variant[i] = (Math.random() * 256) | 0;
        life[i] = material === FIRE ? randFireLife() : 0;
      }
    }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  painting = true;
  hint.classList.add('hidden');
  paintAt(...pointerToGrid(e.clientX, e.clientY), selectedMaterial);
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!painting) return;
  paintAt(...pointerToGrid(e.clientX, e.clientY), selectedMaterial);
});
window.addEventListener('pointerup', () => { painting = false; });

document.querySelectorAll('.mat-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mat-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMaterial = MATERIALS[btn.dataset.mat];
  });
});

brushInput.addEventListener('input', () => { brushSize = Number(brushInput.value); });

pauseBtn.addEventListener('click', () => {
  paused = !paused;
  pauseBtn.textContent = paused ? 'Resume' : 'Pause';
});

clearBtn.addEventListener('click', () => {
  mat.fill(EMPTY); life.fill(0); variant.fill(0);
});

// --- main loop ------------------------------------------------------------

function loop() {
  if (!paused) step();
  render();
  requestAnimationFrame(loop);
}

setupGrid();
requestAnimationFrame(loop);
