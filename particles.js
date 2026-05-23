// ── PARTICLES ──
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const COUNT = 90;
const particles = Array.from({ length: COUNT }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  r: Math.random() * 1.2 + 0.3,
  vx: (Math.random() - 0.5) * 0.25,
  vy: (Math.random() - 0.5) * 0.25,
  a: Math.random() * 0.5 + 0.15,
}));

function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${p.a})`;
    ctx.fill();
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = canvas.width;
    if (p.x > canvas.width) p.x = 0;
    if (p.y < 0) p.y = canvas.height;
    if (p.y > canvas.height) p.y = 0;
  });
  requestAnimationFrame(drawParticles);
}
drawParticles();

// ── SCROLL BUTTON ──
document.getElementById('scroll-down')?.addEventListener('click', () => {
  document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
});

// ── PARALLAX ON CARDS ──
document.addEventListener('mousemove', e => {
  const px = (e.clientX / window.innerWidth - 0.5) * 12;
  const py = (e.clientY / window.innerHeight - 0.5) * 12;
  document.querySelectorAll('.card[data-thumb]').forEach(card => {
    card.style.backgroundPosition = `calc(50% + ${px}px) calc(50% + ${py}px)`;
  });
});

// ── LOGO GLITCH ON HOVER ──
const logoImg = document.querySelector('.logo-img');
if (logoImg) {
  logoImg.parentElement.addEventListener('mouseenter', () => logoImg.classList.add('logo-glitch'));
  logoImg.parentElement.addEventListener('mouseleave', () => logoImg.classList.remove('logo-glitch'));
}

// ── HOVER SOUND ──
const hoverCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTick() {
  const osc = hoverCtx.createOscillator();
  const gain = hoverCtx.createGain();
  osc.connect(gain);
  gain.connect(hoverCtx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.04, hoverCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, hoverCtx.currentTime + 0.08);
  osc.start();
  osc.stop(hoverCtx.currentTime + 0.08);
}

document.querySelectorAll('.card').forEach(card => {
  card.addEventListener('mouseenter', () => {
    try { playTick(); } catch(e) {}
  });
});
