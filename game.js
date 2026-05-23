const params = new URLSearchParams(location.search);
const gameKey = params.get('game');
const g = GAMES[gameKey];

if (!g) {
  location.href = 'index.html';
}

document.title = `${g.title} — ASPECT`;

const diffClass = {
  'Легко': 'diff-easy',
  'Средне': 'diff-medium',
  'Сложно': 'diff-hard',
  'Хардкор': 'diff-hardcore',
}[g.difficulty] || '';

const changelogHTML = g.changelog
  .map((item, i) => `<li class="${i === 0 ? 'log-current' : ''}">${item}</li>`)
  .join('');

const sliderHTML = g.screenshots && g.screenshots.length ? `
  <div class="gp-slider" id="gp-slider">
    <img class="gp-slider-img" id="gp-slider-img" src="${g.screenshots[0]}" alt="Screenshot" />
    ${g.screenshots.length > 1 ? `
      <button class="slider-btn slider-prev" id="gp-prev">&#8592;</button>
      <button class="slider-btn slider-next" id="gp-next">&#8594;</button>
      <div class="slider-dots" id="gp-dots">
        ${g.screenshots.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`).join('')}
      </div>
      <span class="slider-counter" id="gp-counter">1 / ${g.screenshots.length}</span>
    ` : ''}
  </div>` : '';

document.getElementById('game-root').innerHTML = `
  <section class="gp-hero" style="background-image:url('${g.screenshots?.[0] || ''}')">
    <div class="gp-hero-overlay"></div>
    <div class="gp-hero-content">
      <a href="index.html" class="gp-back">← Все игры</a>
      <div class="gp-status-row">
        <span class="gp-tag ${g.status === 'Бета' ? 'beta-tag' : ''}">${g.status}</span>
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
        <button class="share-btn" id="gp-share" data-url="${g.url}">⧉ Поделиться</button>
        <a href="${g.url}" target="_blank" class="play-btn" id="gp-play">Играть →</a>
      </div>
      <span class="gp-plays" id="gp-plays"></span>
    </div>
  </div>
`;

// ── SLIDER ──
let idx = 0;
const imgs = g.screenshots || [];

function goTo(i) {
  idx = (i + imgs.length) % imgs.length;
  document.getElementById('gp-slider-img').src = imgs[idx];
  document.querySelectorAll('#gp-dots .dot').forEach((d, j) => d.classList.toggle('active', j === idx));
  const counter = document.getElementById('gp-counter');
  if (counter) counter.textContent = `${idx + 1} / ${imgs.length}`;
}

document.getElementById('gp-prev')?.addEventListener('click', () => goTo(idx - 1));
document.getElementById('gp-next')?.addEventListener('click', () => goTo(idx + 1));
document.querySelectorAll('#gp-dots .dot').forEach(d => {
  d.addEventListener('click', () => goTo(+d.dataset.i));
});

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') goTo(idx - 1);
  if (e.key === 'ArrowRight') goTo(idx + 1);
});

// ── PLAY COUNTER ──
const storageKey = 'played_' + gameKey;
let playCount = parseInt(localStorage.getItem(storageKey) || '0', 10);
const playsEl = document.getElementById('gp-plays');

function updatePlaysDisplay() {
  if (playsEl && playCount > 0) {
    playsEl.textContent = `▶ Сыграли ${playCount} ${playCount === 1 ? 'раз' : playCount < 5 ? 'раза' : 'раз'}`;
  }
}
updatePlaysDisplay();

document.getElementById('gp-play')?.addEventListener('click', () => {
  playCount++;
  localStorage.setItem(storageKey, playCount);
  updatePlaysDisplay();
});

// ── SHARE ──
document.getElementById('gp-share')?.addEventListener('click', () => {
  navigator.clipboard.writeText(g.url)
    .then(() => window.showToast?.('Ссылка скопирована!'))
    .catch(() => window.showToast?.('Не удалось скопировать'));
});
