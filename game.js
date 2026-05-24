const gameKey = window.GAME_KEY;
const g = GAMES[gameKey];

if (!g) { location.href = 'index.html'; }

document.title = `${g.title} — ASPECT`;

// Encode a local path so Cyrillic/spaces work on GitHub Pages
function imgUrl(raw) {
  if (!raw) return '';
  return raw.split('/').map(s => encodeURIComponent(s)).join('/');
}

const diffClass = {
  'Легко':   'diff-easy',
  'Средне':  'diff-medium',
  'Сложно':  'diff-hard',
  'Хардкор': 'diff-hardcore',
}[g.difficulty] || '';

const shots = g.screenshots || [];

const sliderHTML = shots.length ? `
  <div class="gp-slider" id="gp-slider">
    <img class="gp-slider-img" id="gp-slider-img"
         src="${imgUrl(shots[0])}"
         alt="Скриншот 1" />
    ${shots.length > 1 ? `
      <button class="slider-btn slider-prev" id="gp-prev" aria-label="Назад">&#8592;</button>
      <button class="slider-btn slider-next" id="gp-next" aria-label="Вперёд">&#8594;</button>
      <div class="slider-dots" id="gp-dots">
        ${shots.map((_,i) => `<span class="dot${i===0?' active':''}" data-i="${i}"></span>`).join('')}
      </div>
      <span class="slider-counter" id="gp-counter">1 / ${shots.length}</span>
    ` : ''}
  </div>` : '';

const changelogHTML = g.changelog
  .map((item, i) => `<li class="${i===0?'log-current':''}">${item}</li>`)
  .join('');

document.getElementById('game-root').innerHTML = `
  <section class="gp-hero" id="gp-hero" style="background-image:url('${imgUrl(shots[0])}')">
    <div class="gp-hero-overlay"></div>
    <div class="gp-hero-content">
      <a href="index.html" class="gp-back">← Все игры</a>
      <div class="gp-status-row">
        <span class="gp-tag${g.status==='Бета'?' beta-tag':''}">${g.status}</span>
        ${g.difficulty ? `<span class="diff-badge ${diffClass}">${g.difficulty}</span>` : ''}
      </div>
      <h1 class="gp-title">${g.title}</h1>
      <div class="gp-meta">
        <span class="gp-version">${g.version}</span>
        <span class="gp-genre">${g.genre}</span>
        <span class="gp-year">${g.released}</span>
      </div>
    </div>
  </section>

  <div class="gp-body">
    ${sliderHTML}

    <div class="gp-section">
      <span class="gp-section-label">Об игре</span>
      <p class="gp-desc">${g.description}</p>
    </div>

    <div class="gp-divider"></div>

    <div class="gp-section">
      <span class="gp-section-label">История версий</span>
      <ul class="changelog">${changelogHTML}</ul>
    </div>

    <div class="gp-divider"></div>

    <div class="gp-footer-row">
      <span class="gp-dev-credit">Разработчик: Романуша Д.С. · ASPECT</span>
      <div class="gp-actions">
        <button class="share-btn" id="gp-share">&#10697; Поделиться</button>
        <a href="${g.url}" target="_blank" rel="noopener" class="play-btn" id="gp-play">Играть →</a>
      </div>
    </div>
    <span class="gp-plays" id="gp-plays"></span>
  </div>
`;

// ── SLIDER ──
let idx = 0;

function goTo(i) {
  if (shots.length < 2) return;
  const imgEl   = document.getElementById('gp-slider-img');
  const counter = document.getElementById('gp-counter');
  idx = (i + shots.length) % shots.length;

  imgEl.classList.add('fade');
  setTimeout(() => {
    imgEl.src = imgUrl(shots[idx]);
    imgEl.alt = `Скриншот ${idx + 1}`;
    imgEl.classList.remove('fade');
  }, 220);

  document.querySelectorAll('#gp-dots .dot').forEach((d, j) => d.classList.toggle('active', j === idx));
  if (counter) counter.textContent = `${idx + 1} / ${shots.length}`;
}

document.getElementById('gp-prev')?.addEventListener('click', () => goTo(idx - 1));
document.getElementById('gp-next')?.addEventListener('click', () => goTo(idx + 1));
document.querySelectorAll('#gp-dots .dot').forEach(d => {
  d.addEventListener('click', () => goTo(+d.dataset.i));
});

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft')  goTo(idx - 1);
  if (e.key === 'ArrowRight') goTo(idx + 1);
});

// ── PLAY COUNTER ──
let playCount = parseInt(localStorage.getItem('played_' + gameKey) || '0', 10);
const playsEl = document.getElementById('gp-plays');

function updatePlays() {
  if (playsEl && playCount > 0) {
    const word = playCount === 1 ? 'раз' : playCount < 5 ? 'раза' : 'раз';
    playsEl.textContent = `▶ Сыграли ${playCount} ${word}`;
  }
}
updatePlays();

document.getElementById('gp-play')?.addEventListener('click', () => {
  playCount++;
  localStorage.setItem('played_' + gameKey, playCount);
  updatePlays();
});

// ── SHARE ──
document.getElementById('gp-share')?.addEventListener('click', () => {
  navigator.clipboard.writeText(g.url)
    .then(() => window.showToast?.('Ссылка скопирована!'))
    .catch(() => window.showToast?.('Не удалось скопировать'));
});

// ── PARALLAX HERO ──
const heroEl = document.getElementById('gp-hero');
if (heroEl) {
  window.addEventListener('scroll', () => {
    heroEl.style.backgroundPositionY = `calc(30% + ${window.scrollY * 0.3}px)`;
  }, { passive: true });
}
