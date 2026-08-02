// ── SCROLL PROGRESS ──
(function() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }, { passive: true });
})();

// ── ANALYTICS ──
(function() {
  const KEY = 'aspect_analytics';
  const data = JSON.parse(localStorage.getItem(KEY) || '{}');
  data.visits = (data.visits || 0) + 1;
  data.lastVisit = new Date().toISOString();
  data.pages = data.pages || {};
  const page = location.pathname.split('/').pop() || 'index.html';
  data.pages[page] = (data.pages[page] || 0) + 1;
  localStorage.setItem(KEY, JSON.stringify(data));
  console.log('%c📊 ASPECT Analytics', 'color:#888;font-size:13px;font-weight:bold', data);

  // Hidden panel — Alt+Shift+A
  const panel = document.createElement('div');
  panel.id = 'analytics-panel';
  panel.innerHTML = `
    <div class="ap-header"><span>📊 Analytics</span><button class="ap-close" aria-label="Закрыть">✕</button></div>
    <div class="ap-body">
      <div class="ap-row"><span>Визитов</span><b>${data.visits}</b></div>
      <div class="ap-row"><span>Последний визит</span><b>${new Date(data.lastVisit).toLocaleString('ru')}</b></div>
      <div class="ap-sep"></div>
      ${Object.entries(data.pages).sort((a,b)=>b[1]-a[1]).map(([p,n])=>`<div class="ap-row"><span>${p}</span><b>${n}</b></div>`).join('')}
    </div>`;
  document.body.appendChild(panel);
  panel.querySelector('.ap-close').addEventListener('click', () => panel.classList.remove('open'));
  document.addEventListener('keydown', e => {
    if (e.altKey && e.shiftKey && e.key === 'A') panel.classList.toggle('open');
  });
})();

// ── SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

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

// ── THEME ──
(function() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light') document.body.classList.add('light');

  const btn = document.createElement('button');
  btn.id = 'theme-toggle';
  btn.setAttribute('aria-label', 'Сменить тему');
  btn.textContent = document.body.classList.contains('light') ? '☾' : '☀';

  const nav = document.querySelector('nav');
  const burgerEl = document.getElementById('burger');
  if (nav) nav.insertBefore(btn, burgerEl || null);

  // ── NAV: TOTAL PLAYS ──
  const totalPlays = ['posledniy','coredrift','oligarch','floorbyfloor','resonance','fnaf','evtn','shot','outpost']
    .reduce((s, k) => s + parseInt(localStorage.getItem('played_' + k) || '0', 10), 0);
  if (totalPlays > 0 && nav) {
    const playsSpan = document.createElement('span');
    playsSpan.id = 'nav-total-plays';
    playsSpan.textContent = '▶ ' + totalPlays;
    playsSpan.title = 'Всего запусков игр';
    nav.insertBefore(playsSpan, burgerEl || null);
  }

  // ── NAV: RANDOM GAME ──
  if (nav) {
    const GAME_KEYS = ['posledniy','coredrift','oligarch','floorbyfloor','resonance','fnaf','evtn','shot','outpost'];
    const rndLi = document.createElement('li');
    const rndA = document.createElement('a');
    rndA.href = '#';
    rndA.textContent = '🎲';
    rndA.title = 'Случайная игра';
    rndA.style.fontSize = '1rem';
    rndA.addEventListener('click', e => {
      e.preventDefault();
      location.href = GAME_KEYS[Math.floor(Math.random() * GAME_KEYS.length)] + '.html';
    });
    rndLi.appendChild(rndA);
    const navUl = document.getElementById('nav-links');
    if (navUl) navUl.appendChild(rndLi);
  }

  btn.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    btn.textContent = isLight ? '☾' : '☀';
  });
})();

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

// ── CURSOR GENRE COLOR ──
const GENRE_CLASSES = ['genre-horror', 'genre-roguelike', 'genre-strategy'];
function setCursorGenre(cls) {
  GENRE_CLASSES.forEach(c => { cursor?.classList.remove(c); cursorDot?.classList.remove(c); });
  if (cls) { cursor?.classList.add(cls); cursorDot?.classList.add(cls); }
}
document.querySelectorAll('.card').forEach(card => {
  const genre = card.querySelector('.card-genre')?.textContent || '';
  const cls = genre.includes('Хоррор') ? 'genre-horror'
             : genre.includes('Стратегия') ? 'genre-strategy'
             : genre.includes('Рогалик') ? 'genre-roguelike'
             : null;
  if (!cls) return;
  card.addEventListener('mouseenter', () => setCursorGenre(cls));
  card.addEventListener('mouseleave', () => setCursorGenre(null));
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

// ── CARD COPY LINK ──
document.querySelectorAll('a.card[href]').forEach(card => {
  const btn = document.createElement('button');
  btn.className = 'card-copy-btn';
  btn.setAttribute('aria-label', 'Копировать ссылку');
  btn.textContent = '⎘';
  card.appendChild(btn);
  btn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(card.href)
      .then(() => window.showToast?.('Ссылка скопирована!'))
      .catch(() => window.showToast?.('Не удалось скопировать'));
  });
});

// ── CARD THUMBNAIL PREVIEW ──
const cardPreview = document.createElement('div');
cardPreview.id = 'card-preview';
document.body.appendChild(cardPreview);

const isFinePointer = window.matchMedia('(pointer: fine)').matches;

document.querySelectorAll('.card[data-thumb]').forEach(card => {
  if (!isFinePointer) return;
  card.addEventListener('mouseenter', () => {
    const raw = card.dataset.thumb;
    const encoded = raw.split('/').map(s => encodeURIComponent(s)).join('/');
    cardPreview.style.backgroundImage = `url('${encoded}')`;
    cardPreview.classList.add('visible');
  });
  card.addEventListener('mousemove', e => {
    cardPreview.style.left = (e.clientX + 20) + 'px';
    cardPreview.style.top  = Math.min(e.clientY - 60, window.innerHeight - 140) + 'px';
  });
  card.addEventListener('mouseleave', () => {
    cardPreview.classList.remove('visible');
  });
});

// ── PREFETCH ON HOVER ──
const prefetched = new Set();
document.querySelectorAll('a.card[href]').forEach(card => {
  card.addEventListener('mouseenter', () => {
    const href = card.getAttribute('href');
    if (!href || prefetched.has(href)) return;
    prefetched.add(href);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }, { once: true });
});

// ── CARD THUMBNAILS ──
document.querySelectorAll('.card[data-thumb]').forEach(card => {
  const raw = card.dataset.thumb;
  const encoded = raw.split('/').map(s => encodeURIComponent(s)).join('/');
  card.style.backgroundImage = `url('${encoded}')`;
});

// ── PLAY COUNTERS ON CARDS (animate count-up on reveal) ──
document.querySelectorAll('.card[data-game]').forEach(card => {
  const n = parseInt(localStorage.getItem('played_' + card.dataset.game) || '0', 10);
  const el = document.getElementById('plays-' + card.dataset.game);
  if (!el || n === 0) return;
  const playsIo = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      playsIo.unobserve(e.target);
      let v = 0;
      const step = Math.ceil(n / 20);
      const t = setInterval(() => {
        v = Math.min(v + step, n);
        el.textContent = `▶ ${v}`;
        if (v >= n) clearInterval(t);
      }, 40);
    });
  }, { threshold: 0.5 });
  playsIo.observe(card);
});

// ── FILTER + SEARCH ──
const searchInput = document.getElementById('game-search');
const searchEmpty = document.getElementById('search-empty');
let activeFilter = 'all';

function applyGameFilters() {
  const q = (searchInput?.value || '').trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll('.card').forEach(card => {
    const genre = card.querySelector('.card-genre')?.textContent || '';
    const hay = ((card.querySelector('h3')?.textContent || '') + ' ' + genre + ' ' +
      (card.querySelector('.card-tags')?.textContent || '')).toLowerCase();
    const show = (activeFilter === 'all' || genre.includes(activeFilter)) && (!q || hay.includes(q));
    card.style.display = show ? '' : 'none';
    if (show) shown++;
  });
  if (searchEmpty) searchEmpty.hidden = shown > 0;
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    applyGameFilters();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', applyGameFilters);
  // «/» — фокус в поиск, Esc — очистить
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName || '';
    if (e.key === '/' && !/INPUT|TEXTAREA/.test(tag)) {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.value = '';
      applyGameFilters();
      searchInput.blur();
    }
  });
}

// ── SECTION HEADING TYPEWRITER ──
const headingIo = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    headingIo.unobserve(e.target);
    const el = e.target;
    const text = el.textContent;
    el.textContent = '';
    let i = 0;
    const t = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) clearInterval(t);
    }, 55);
  });
}, { threshold: 0.6 });
document.querySelectorAll('.games h2, .wip-inner h2, .news-inner h2, .about-inner h2, .contacts-inner h2').forEach(h => headingIo.observe(h));

// ── NEWS ANIMATIONS ──
const newsIo = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); newsIo.unobserve(e.target); }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.news-item').forEach((el, i) => {
  el.style.transitionDelay = `${i * 70}ms`;
  newsIo.observe(el);
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

// ── HERO STATS COUNTER ──
document.querySelectorAll('.hs-num[data-val]').forEach(el => {
  const max = +el.dataset.val;
  let v = 0;
  const step = Math.ceil(max / 20);
  const t = setInterval(() => {
    v = Math.min(v + step, max);
    el.textContent = v;
    if (v >= max) clearInterval(t);
  }, 60);
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

// ── ИГРА ДНЯ ── (один и тот же выбор на бейдже карточки и в баннере наверху)
(function() {
  if (typeof GAMES === 'undefined') return;
  const keys = Object.keys(GAMES);
  if (!keys.length) return;
  const d = new Date();
  const seed = d.getFullYear() * 372 + (d.getMonth() + 1) * 31 + d.getDate();
  const key = keys[seed % keys.length];
  const game = GAMES[key];

  // Бейдж на карточке в общей сетке.
  const card = document.querySelector(`.card[data-game="${key}"]`);
  if (card) {
    const badge = document.createElement('div');
    badge.className = 'gotd-badge';
    badge.textContent = '★ Игра дня';
    card.appendChild(badge);
    card.classList.add('gotd');
  }

  // Баннер наверху — сразу с кнопкой скачать, без перехода на страницу игры.
  const section = document.getElementById('gotd');
  if (!section || !game) return;
  const thumb = (game.screenshots && game.screenshots[0]) || '';
  section.innerHTML = `
    <div class="gotd-inner" style="--gotd-bg: url('${encodeURI(thumb)}')">
      <div class="gotd-label">★ Игра дня</div>
      <h3 class="gotd-title">${game.title}</h3>
      <p class="gotd-desc">${game.description}</p>
      <div class="gotd-actions">
        <a class="gotd-download" href="${game.url}" target="_blank" rel="noopener">Скачать${game.size ? ` (${game.size})` : ''} →</a>
        <a class="gotd-more" href="${key}.html">Подробнее</a>
      </div>
    </div>`;
})();

// ── 3D TILT КАРТОЧЕК ──
(function() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('a.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.12s ease-out';
    });
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width  - 0.5;
      const py = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform =
        `perspective(700px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-3px) scale(1.015)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transition = '';
      card.style.transform = '';
    });
  });
})();

// ── НОВОСТИ: СВЕРНУТЬ ──
(function() {
  const items = [...document.querySelectorAll('.news-item')];
  const btn = document.getElementById('news-more');
  const LIMIT = 6;
  if (!btn || items.length <= LIMIT) return;
  const collapse = () => {
    items.slice(LIMIT).forEach(el => el.classList.add('news-hidden'));
    btn.textContent = `Показать ещё (${items.length - LIMIT}) ↓`;
  };
  collapse();
  btn.hidden = false;
  btn.addEventListener('click', () => {
    if (items.some(el => el.classList.contains('news-hidden'))) {
      items.forEach(el => { el.classList.remove('news-hidden'); el.style.transitionDelay = '0ms'; });
      btn.textContent = 'Свернуть ↑';
    } else {
      collapse();
      document.getElementById('news')?.scrollIntoView({ behavior: 'smooth' });
    }
  });
})();

// ── ДНЕЙ РАЗРАБОТКИ (с 27.12.2025) ──
(function() {
  const el = document.getElementById('stat-days');
  if (!el) return;
  el.dataset.val = Math.max(1, Math.floor((Date.now() - new Date(2025, 11, 27).getTime()) / 86400000));
})();

// ── ДОСТИЖЕНИЯ ПОСЕТИТЕЛЯ ──
(function() {
  const KEY = 'aspect_achievements';
  const earned = JSON.parse(localStorage.getItem(KEY) || '{}');
  const GAMES = ['posledniy','coredrift','oligarch','floorbyfloor','resonance','fnaf','evtn','shot','outpost','zone'];
  const DEFS = {
    explorer: { icon: '🗺', name: 'Исследователь', desc: 'Открыть страницы всех 10 игр' },
    night:    { icon: '🌙', name: 'Ночной гость',  desc: 'Зайти на сайт с 00:00 до 05:00' },
    regular:  { icon: '🔥', name: 'Свой человек',  desc: '10 визитов на сайт' },
    konami:   { icon: '👾', name: 'Код доступа',   desc: 'Ввести секретный код' },
  };
  window.grantAchievement = function(id) {
    if (earned[id] || !DEFS[id]) return;
    earned[id] = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(earned));
    window.showToast?.(`${DEFS[id].icon} Достижение: ${DEFS[id].name}`);
  };

  const visited = JSON.parse(localStorage.getItem('aspect_visited') || '[]');
  const page = (location.pathname.split('/').pop() || '').replace('.html', '');
  if (GAMES.includes(page) && !visited.includes(page)) {
    visited.push(page);
    localStorage.setItem('aspect_visited', JSON.stringify(visited));
  }
  if (GAMES.every(g => visited.includes(g))) window.grantAchievement('explorer');
  const h = new Date().getHours();
  if (h >= 0 && h < 5) window.grantAchievement('night');
  if ((JSON.parse(localStorage.getItem('aspect_analytics') || '{}').visits || 0) >= 10) window.grantAchievement('regular');

  // блок в панели Alt+Shift+A
  const apBody = document.querySelector('#analytics-panel .ap-body');
  if (apBody) {
    const sep = document.createElement('div');
    sep.className = 'ap-sep';
    apBody.appendChild(sep);
    Object.entries(DEFS).forEach(([id, d]) => {
      const row = document.createElement('div');
      row.className = 'ap-row';
      row.title = d.desc;
      row.innerHTML = `<span>${d.icon} ${d.name}</span><b>${earned[id] ? '✓' : '—'}</b>`;
      apBody.appendChild(row);
    });
  }
})();

// ── KONAMI → ГЛИТЧ-РЕЖИМ ──
(function() {
  const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let pos = 0;
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = (k === SEQ[pos]) ? pos + 1 : (k === SEQ[0] ? 1 : 0);
    if (pos < SEQ.length) return;
    pos = 0;
    const on = document.body.classList.toggle('glitch-mode');
    window.grantAchievement?.('konami');
    window.showToast?.(on ? '👾 ГЛИТЧ-РЕЖИМ АКТИВИРОВАН' : 'Глитч-режим выключен');
  });
})();
