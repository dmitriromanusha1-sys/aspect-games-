// ── CURSOR GLOW ──
const glow = document.getElementById('cursor-glow');
let mx = -200, my = -200, cx = -200, cy = -200;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

(function animateGlow() {
  cx += (mx - cx) * 0.08;
  cy += (my - cy) * 0.08;
  glow.style.transform = `translate(${cx - 150}px, ${cy - 150}px)`;
  requestAnimationFrame(animateGlow);
})();

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
