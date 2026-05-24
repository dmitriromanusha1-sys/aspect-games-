// ── TOAST ──
const toastEl = document.createElement('div');
toastEl.className = 'toast';
document.body.appendChild(toastEl);
let toastTimer;

window.showToast = function(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
};

// ── BURGER ──
const burger = document.getElementById('burger');
const navLinks = document.getElementById('nav-links');

if (burger && navLinks) {
  burger.addEventListener('click', () => {
    burger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });
}

// ── CUSTOM CURSOR ──
const cursor    = document.getElementById('cursor');
const cursorDot = document.getElementById('cursor-dot');

// Кольцо — с лагом; точка — мгновенно
let rx = window.innerWidth / 2, ry = window.innerHeight / 2;
let mx = rx, my = ry;

document.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;
  if (cursorDot) { cursorDot.style.left = mx + 'px'; cursorDot.style.top = my + 'px'; }
});

// клик — вспышка кольца
document.addEventListener('mousedown', () => {
  cursor?.classList.add('click');
});
document.addEventListener('mouseup', () => {
  cursor?.classList.remove('click');
});

// кольцо — с лагом через rAF
(function animRing() {
  rx += (mx - rx) * 0.13;
  ry += (my - ry) * 0.13;
  if (cursor) { cursor.style.left = rx + 'px'; cursor.style.top = ry + 'px'; }
  requestAnimationFrame(animRing);
})();

// hover на интерактивных элементах
document.addEventListener('mouseover', e => {
  if (e.target.closest('a, button')) cursor?.classList.add('hover');
});
document.addEventListener('mouseout', e => {
  if (e.target.closest('a, button')) cursor?.classList.remove('hover');
});

// ── BACK TO TOP ──
const backTop = document.getElementById('back-to-top');
if (backTop) {
  window.addEventListener('scroll', () => {
    backTop.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── LOADER ──
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add('hide');
    setTimeout(() => loader.remove(), 500);
  }, 1000);
});

// ── TYPEWRITER ──
const typeEl  = document.querySelector('.typewriter');
const phrases = ['Indie Game Development', 'Made by ASPECT', 'Романуша Д.С.'];
let pi = 0, ci = 0, deleting = false;

function type() {
  if (!typeEl) return;
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
if (typeEl) setTimeout(type, 1000);

// ── CARD THUMBNAILS ──
document.querySelectorAll('.card[data-thumb]').forEach(card => {
  const raw = card.dataset.thumb;
  const encoded = raw.split('/').map(s => encodeURIComponent(s)).join('/');
  card.style.backgroundImage = `url('${encoded}')`;
});

// ── PLAY COUNTERS ON CARDS ──
document.querySelectorAll('.card[data-game]').forEach(card => {
  const n = parseInt(localStorage.getItem('played_' + card.dataset.game) || '0', 10);
  const el = document.getElementById('plays-' + card.dataset.game);
  if (el && n > 0) el.textContent = `▶ ${n}`;
});

// ── FILTER ──
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const f = btn.dataset.filter;
    document.querySelectorAll('.card').forEach(card => {
      const genre = card.querySelector('.card-genre')?.textContent || '';
      card.style.display = (f === 'all' || genre.includes(f)) ? '' : 'none';
    });
  });
});

// ── SCROLL ANIMATIONS ──
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.card, .developer').forEach((el, i) => {
  el.style.transitionDelay = `${i * 55}ms`;
  io.observe(el);
});

// ── STAT COUNTER ──
const statIo = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el  = e.target;
    const max = +el.dataset.val;
    el.closest('.stat').classList.add('visible');
    let v = 0;
    const step = Math.ceil(max / 20);
    const t = setInterval(() => {
      v = Math.min(v + step, max);
      el.textContent = v;
      if (v >= max) clearInterval(t);
    }, 40);
    statIo.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-val]').forEach(el => statIo.observe(el));

// ── NAV ACTIVE ──
const sections  = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('nav a[href^="#"]');

const secIo = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navAnchors.forEach(a => a.classList.remove('active'));
      document.querySelector(`nav a[href="#${e.target.id}"]`)?.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => secIo.observe(s));

// ── LOGO GLITCH ──
const logoImg = document.querySelector('.logo-img');
if (logoImg) {
  logoImg.parentElement.addEventListener('mouseenter', () => logoImg.classList.add('logo-glitch'));
  logoImg.addEventListener('animationend', () => logoImg.classList.remove('logo-glitch'));
}

// ── SCROLL DOWN BTN ──
document.getElementById('scroll-down')?.addEventListener('click', () => {
  document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
});
