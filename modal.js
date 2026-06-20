const overlay = document.getElementById('overlay');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.getElementById('modal-close');

let sliderIndex = 0;
let sliderImages = [];

function renderSlider(screenshots) {
  if (!screenshots || screenshots.length === 0) return '';
  sliderImages = screenshots;
  sliderIndex = 0;
  return `
    <div class="slider" id="slider">
      <img class="slider-img" id="slider-img" src="${screenshots[0]}" alt="Screenshot" />
      <button class="slider-btn slider-prev" id="slider-prev" aria-label="Назад">&#8592;</button>
      <button class="slider-btn slider-next" id="slider-next" aria-label="Вперёд">&#8594;</button>
      <div class="slider-dots" id="slider-dots">
        ${screenshots.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`).join('')}
      </div>
      <span class="slider-counter" id="slider-counter">1 / ${screenshots.length}</span>
    </div>
  `;
}

function updateSlider(index) {
  const img = document.getElementById('slider-img');
  const dots = document.querySelectorAll('.dot');
  if (!img) return;
  sliderIndex = (index + sliderImages.length) % sliderImages.length;
  img.src = sliderImages[sliderIndex];
  dots.forEach((d, i) => d.classList.toggle('active', i === sliderIndex));
  const counter = document.getElementById('slider-counter');
  if (counter) counter.textContent = `${sliderIndex + 1} / ${sliderImages.length}`;
}

function bindSlider() {
  const prev = document.getElementById('slider-prev');
  const next = document.getElementById('slider-next');
  if (prev) prev.addEventListener('click', () => updateSlider(sliderIndex - 1));
  if (next) next.addEventListener('click', () => updateSlider(sliderIndex + 1));
  document.querySelectorAll('.dot').forEach(dot => {
    dot.addEventListener('click', () => updateSlider(+dot.dataset.i));
  });
}

function openModal(gameKey) {
  const g = GAMES[gameKey];
  if (!g) return;

  const isBeta = g.status === 'Бета';
  const changelogHTML = g.changelog
    .map((item, i) => `<li class="${i === 0 ? 'log-current' : ''}">${item}</li>`)
    .join('');

  modalBody.innerHTML = `
    <div class="modal-header">
      <span class="modal-tag ${isBeta ? 'beta-tag' : ''}">${g.status}</span>
      <h2 class="modal-title">${g.title}</h2>
      <div class="modal-meta">
        <span class="modal-version">${g.version}</span>
        ${g.genre ? `<span class="modal-genre">${g.genre}</span>` : ''}
        ${g.released ? `<span class="modal-genre">${g.released}</span>` : ''}
      </div>
    </div>
    ${g.screenshots ? `<div class="modal-divider"></div>${renderSlider(g.screenshots)}` : ''}
    <div class="modal-divider"></div>
    <p class="modal-desc">${g.description}</p>
    <div class="modal-divider"></div>
    <div class="modal-section">
      <span class="modal-section-label">История версий</span>
      <ul class="changelog">${changelogHTML}</ul>
    </div>
    <div class="modal-divider"></div>
    <div class="modal-footer">
      <span class="modal-dev">Разработчик: Романуша Д.С. · ASPECT</span>
      <div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;">
        <button class="share-btn" id="share-btn" data-url="${g.url}">⧉ Поделиться</button>
        <a href="${g.url}" target="_blank" class="play-btn">${g.downloadOnly ? 'Скачать ↓' : 'Играть →'}</a>
      </div>
    </div>
  `;

  bindSlider();
  overlay.classList.add('active');
  overlay.removeAttribute('aria-hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  sliderImages = [];
}

document.querySelectorAll('.card[data-game]').forEach(card => {
  card.addEventListener('click', () => openModal(card.dataset.game));
});

closeBtn.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') updateSlider(sliderIndex - 1);
  if (e.key === 'ArrowRight') updateSlider(sliderIndex + 1);
});
