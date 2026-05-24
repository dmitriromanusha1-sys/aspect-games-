// ── HERO PARTICLES ──
const canvas = document.getElementById('particles-canvas');
const ctx    = canvas ? canvas.getContext('2d') : null;

function resize() {
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize, { passive: true });

const COUNT = 90;
const pts = canvas ? Array.from({ length: COUNT }, () => ({
  x:  Math.random() * canvas.width,
  y:  Math.random() * canvas.height,
  r:  Math.random() * 1.2 + 0.3,
  vx: (Math.random() - 0.5) * 0.25,
  vy: (Math.random() - 0.5) * 0.25,
  a:  Math.random() * 0.5 + 0.15,
})) : [];

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.a})`;
    ctx.fill();
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0)             p.x = canvas.width;
    if (p.x > canvas.width)  p.x = 0;
    if (p.y < 0)             p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  }
  requestAnimationFrame(draw);
}
draw();

// ── CARD PARALLAX ──
document.addEventListener('mousemove', e => {
  const px = (e.clientX / window.innerWidth  - 0.5) * 12;
  const py = (e.clientY / window.innerHeight - 0.5) * 12;
  document.querySelectorAll('.card[data-thumb]').forEach(card => {
    card.style.backgroundPosition = `calc(50% + ${px}px) calc(50% + ${py}px)`;
  });
});

// ── WIP DOTS CANVAS ──
const wipCanvas = document.getElementById('wip-canvas');
if (wipCanvas) {
  const wctx = wipCanvas.getContext('2d');
  const COLS = 28, ROWS = 14;
  let t = 0;

  function resizeWip() {
    wipCanvas.width  = wipCanvas.offsetWidth;
    wipCanvas.height = wipCanvas.offsetHeight;
  }
  resizeWip();
  window.addEventListener('resize', resizeWip, { passive: true });

  function drawWip() {
    wctx.clearRect(0, 0, wipCanvas.width, wipCanvas.height);
    const cw = wipCanvas.width  / COLS;
    const ch = wipCanvas.height / ROWS;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const wave  = Math.sin(t * 0.8 + c * 0.5 + r * 0.8) * 0.5 + 0.5;
        const alpha = wave * 0.18 + 0.02;
        wctx.beginPath();
        wctx.arc(c * cw + cw / 2, r * ch + ch / 2, 1.2, 0, Math.PI * 2);
        wctx.fillStyle = `rgba(255,255,255,${alpha})`;
        wctx.fill();
      }
    }
    t += 0.03;
    requestAnimationFrame(drawWip);
  }
  drawWip();
}

// ── HOVER SOUND ──
let audioCtx;
function playTick() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (_) {}
}

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mouseenter', playTick);
});
