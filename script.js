// QR Studio — branded QR code generator.
// Free: colored PNG export. Pro (one-time unlock, no backend required):
// logo embedding, vector SVG export, no watermark.

const UNLOCK_CODE = 'QRSTUDIO-PRO-2024'; // TODO: rotate this, or move to a real per-purchase key later
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/REPLACE_ME'; // TODO: paste your real Stripe Payment Link
const WATERMARK_TEXT = 'Made with QR Studio';
const STORAGE_KEY = 'qrStudioPro';

const el = {
  content: document.getElementById('content-input'),
  fg: document.getElementById('fg-color'),
  bg: document.getElementById('bg-color'),
  size: document.getElementById('size-input'),
  sizeValue: document.getElementById('size-value'),
  ecl: document.getElementById('ecl-input'),
  logoInput: document.getElementById('logo-input'),
  logoClear: document.getElementById('logo-clear'),
  logoField: document.getElementById('logo-field'),
  exportPng: document.getElementById('export-png'),
  exportSvg: document.getElementById('export-svg'),
  exportBatch: document.getElementById('export-batch'),
  preview: document.getElementById('preview-canvas'),
  proBadge: document.getElementById('pro-badge'),
  modal: document.getElementById('unlock-modal'),
  modalClose: document.getElementById('modal-close'),
  buyLink: document.getElementById('buy-link'),
  unlockCode: document.getElementById('unlock-code'),
  unlockSubmit: document.getElementById('unlock-submit'),
  unlockError: document.getElementById('unlock-error'),
  toast: document.getElementById('toast'),
};

let isPro = localStorage.getItem(STORAGE_KEY) === '1';
let logoImage = null;
let logoDataUrl = null;
let lastQrCanvas = null;
let regenTimer = null;
let toastTimer = null;

function debounceRegenerate() {
  clearTimeout(regenTimer);
  regenTimer = setTimeout(regenerate, 150);
}

function showToast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 2200);
}

function applyProState() {
  el.proBadge.textContent = isPro ? 'PRO ✓' : 'Unlock Pro';
  el.proBadge.classList.toggle('is-pro', isPro);
  document.querySelectorAll('.pro-field').forEach((node) => {
    node.classList.toggle('locked', !isPro);
  });
  el.exportSvg.disabled = false; // click still opens unlock modal when locked
}

function setPro(value) {
  isPro = value;
  localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  applyProState();
  regenerate();
}

function openModal() {
  el.unlockError.classList.add('hidden');
  el.unlockCode.value = '';
  el.buyLink.href = STRIPE_PAYMENT_LINK;
  el.modal.classList.remove('hidden');
}
function closeModal() { el.modal.classList.add('hidden'); }

function checkUnlockFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('unlock');
  if (code && code === UNLOCK_CODE) {
    setPro(true);
    params.delete('unlock');
    const rest = params.toString();
    const newUrl = window.location.pathname + (rest ? '?' + rest : '');
    window.history.replaceState({}, '', newUrl);
    showToast('Pro unlocked — thank you!');
  }
}

// --- QR generation --------------------------------------------------------

function currentOptions() {
  const hasLogo = isPro && logoImage;
  return {
    text: el.content.value || ' ',
    width: Number(el.size.value),
    fg: el.fg.value,
    bg: el.bg.value,
    ecl: hasLogo ? 'H' : el.ecl.value, // logo needs high error correction to stay scannable
    hasLogo,
  };
}

function drawLogoOnCanvas(canvas, opts) {
  const ctx = canvas.getContext('2d');
  const logoSize = Math.round(canvas.width * 0.22);
  const pad = Math.round(logoSize * 0.16);
  const x = (canvas.width - logoSize) / 2;
  const y = (canvas.height - logoSize) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2);
  ctx.drawImage(logoImage, x, y, logoSize, logoSize);
}

function regenerate() {
  const opts = currentOptions();

  const qrCanvas = document.createElement('canvas');
  QRCode.toCanvas(qrCanvas, opts.text, {
    width: opts.width,
    margin: 1,
    errorCorrectionLevel: opts.ecl,
    color: { dark: opts.fg, light: opts.bg },
  }, (err) => {
    if (err) { showToast('Could not render that input.'); return; }

    if (opts.hasLogo) drawLogoOnCanvas(qrCanvas, opts);
    lastQrCanvas = qrCanvas;

    const stripH = isPro ? 0 : Math.round(qrCanvas.width * 0.09);
    el.preview.width = qrCanvas.width;
    el.preview.height = qrCanvas.height + stripH;

    const pctx = el.preview.getContext('2d');
    pctx.fillStyle = opts.bg;
    pctx.fillRect(0, 0, el.preview.width, el.preview.height);
    pctx.drawImage(qrCanvas, 0, 0);

    if (stripH > 0) {
      pctx.fillStyle = '#9aa0ab';
      pctx.font = `${Math.round(stripH * 0.46)}px -apple-system, sans-serif`;
      pctx.textAlign = 'center';
      pctx.textBaseline = 'middle';
      pctx.fillText(WATERMARK_TEXT, el.preview.width / 2, qrCanvas.height + stripH / 2);
    }
  });
}

// --- exporting --------------------------------------------------------

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportPng() {
  if (!lastQrCanvas) return;
  el.preview.toBlob((blob) => {
    if (blob) downloadBlob(blob, 'qr-code.png');
  }, 'image/png');
}

function exportSvg() {
  if (!isPro) { openModal(); return; }
  const opts = currentOptions();
  QRCode.toString(opts.text, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: opts.ecl,
    color: { dark: opts.fg, light: opts.bg },
  }, (err, svg) => {
    if (err) { showToast('Could not render that input.'); return; }
    svg = injectSvgExtras(svg, opts);
    downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
  });
}

function injectSvgExtras(svg, opts) {
  const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!match) return svg;
  const w = Number(match[1]);
  let h = Number(match[2]);
  let extra = '';

  if (opts.hasLogo && logoDataUrl) {
    const logoSize = w * 0.22;
    const pad = logoSize * 0.16;
    const x = (w - logoSize) / 2;
    const y = (h - logoSize) / 2;
    extra += `<rect x="${x - pad}" y="${y - pad}" width="${logoSize + pad * 2}" height="${logoSize + pad * 2}" fill="${opts.bg}"/>`;
    extra += `<image href="${logoDataUrl}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}"/>`;
  }

  svg = svg.replace(/viewBox="0 0 \d+ \d+"/, `viewBox="0 0 ${w} ${h}"`);
  svg = svg.replace('</svg>', `${extra}</svg>`);
  return svg;
}

// --- logo upload --------------------------------------------------------

function handleLogoFile(file) {
  if (!isPro) { openModal(); el.logoInput.value = ''; return; }
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    logoDataUrl = reader.result;
    const img = new Image();
    img.onload = () => { logoImage = img; regenerate(); };
    img.src = logoDataUrl;
  };
  reader.readAsDataURL(file);
}

// --- events --------------------------------------------------------

el.content.addEventListener('input', debounceRegenerate);
el.fg.addEventListener('input', debounceRegenerate);
el.bg.addEventListener('input', debounceRegenerate);
el.ecl.addEventListener('change', debounceRegenerate);
el.size.addEventListener('input', () => {
  el.sizeValue.textContent = el.size.value;
  debounceRegenerate();
});

el.logoInput.addEventListener('change', (e) => handleLogoFile(e.target.files[0]));
el.logoClear.addEventListener('click', () => {
  logoImage = null; logoDataUrl = null; el.logoInput.value = '';
  regenerate();
});

el.exportPng.addEventListener('click', exportPng);
el.exportSvg.addEventListener('click', exportSvg);
el.exportBatch.addEventListener('click', () => { if (!isPro) openModal(); });

el.proBadge.addEventListener('click', () => { if (!isPro) openModal(); });
el.modalClose.addEventListener('click', closeModal);
el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

el.unlockSubmit.addEventListener('click', () => {
  const entered = el.unlockCode.value.trim();
  if (entered && entered === UNLOCK_CODE) {
    setPro(true);
    closeModal();
    showToast('Pro unlocked — thank you!');
  } else {
    el.unlockError.classList.remove('hidden');
  }
});
el.unlockCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el.unlockSubmit.click();
});

// --- init --------------------------------------------------------

applyProState();
checkUnlockFromUrl();
regenerate();
