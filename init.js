// ── CURSOR GLOW ──
let mx = -400, my = -400;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

const glows = [
  { el: document.getElementById('cursor-glow-1'), x: -400, y: -400, ease: 0.07, size: 340 },
  { el: document.getElementById('cursor-glow-2'), x: -400, y: -400, ease: 0.04, size: 280 },
  { el: document.getElementById('cursor-glow-3'), x: -400, y: -400, ease: 0.12, size: 200 },
];

(function animateGlows() {
  glows.forEach(g => {
    g.x += (mx - g.x) * g.ease;
    g.y += (my - g.y) * g.ease;
    g.el.style.transform = `translate(${g.x - g.size / 2}px, ${g.y - g.size / 2}px)`;
  });
  requestAnimationFrame(animateGlows);
})();

// ── SHIMMER ──
const heroH1 = document.querySelector('.hero-content h1');
if (heroH1) {
  heroH1.style.position = 'relative';
  heroH1.style.display = 'inline-block';
  const sweep = document.createElement('span');
  sweep.className = 'shimmer-sweep';
  heroH1.appendChild(sweep);
}

// ── TYPEWRITER ──
const typeEl = document.querySelector('.typewriter');
const phrases = ['Indie Game Development', 'Made by ASPECT', 'Романуша Д.С.'];
let pi = 0, ci = 0, deleting = false;

function type() {
  const phrase = phrases[pi];
  if (!deleting) {
    typeEl.textContent = phrase.slice(0, ++ci);
    if (ci === phrase.length) { deleting = true; setTimeout(type, 1800); return; }
    setTimeout(type, 70);
  } else {
    typeEl.textContent = phrase.slice(0, --ci);
    if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(type, 400); return; }
    setTimeout(type, 35);
  }
}
setTimeout(type, 1000);

// ── CARD THUMBNAILS ──
document.querySelectorAll('.card[data-thumb]').forEach(card => {
  card.style.backgroundImage = `url('${card.dataset.thumb}')`;
});

// ── SCROLL ANIMATIONS ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.card, .developer').forEach((el, i) => {
  el.style.transitionDelay = `${i * 55}ms`;
  observer.observe(el);
});

// ── STAT COUNTER ──
const statObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = +el.dataset.val;
    el.closest('.stat').classList.add('visible');
    let start = 0;
    const step = Math.ceil(target / 20);
    const interval = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = start;
      if (start >= target) clearInterval(interval);
    }, 40);
    statObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-val]').forEach(el => statObserver.observe(el));

// ── NAV ACTIVE ──
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav a[href^="#"]');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.remove('active'));
      const link = document.querySelector(`nav a[href="#${e.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));
