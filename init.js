// ── TOAST ──
const toastEl = document.createElement('div');
toastEl.className = 'toast';
document.body.appendChild(toastEl);
let toastTimer;

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ── SHARE (delegated) ──
document.addEventListener('click', e => {
  const btn = e.target.closest('#share-btn');
  if (!btn) return;
  const url = btn.dataset.url;
  navigator.clipboard.writeText(url).then(() => showToast('Ссылка скопирована!')).catch(() => showToast('Не удалось скопировать'));
});

// ── BURGER ──
const burger = document.getElementById('burger');
const burgerNav = document.getElementById('nav-links');
if (burger && burgerNav) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    burgerNav.classList.toggle('open');
  });
  burgerNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      burgerNav.classList.remove('open');
    });
  });
}

// ── CUSTOM CURSOR ──
const cursor = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');
let cx2 = -100, cy2 = -100, mx2 = -100, my2 = -100;

document.addEventListener('mousemove', e => { mx2 = e.clientX; my2 = e.clientY; });

(function animCursor() {
  cx2 += (mx2 - cx2) * 0.12;
  cy2 += (my2 - cy2) * 0.12;
  cursor.style.transform = `translate(${cx2 - 16}px, ${cy2 - 16}px)`;
  cursorDot.style.transform = `translate(${mx2 - 3}px, ${my2 - 3}px)`;
  requestAnimationFrame(animCursor);
})();

document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

// ── BACK TO TOP ──
const backTop = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('visible', window.scrollY > 400);
});
backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ── FILTER ──
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.card').forEach(card => {
      const genre = card.querySelector('.card-genre')?.textContent || '';
      const show = f === 'all' || genre.includes(f);
      card.style.display = show ? '' : 'none';
    });
  });
});

// ── LOADER ──
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add('hide');
    setTimeout(() => loader.remove(), 600);
  }, 1200);
});

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
