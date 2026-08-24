// ---------- Section navigation ----------
const sideNavBtns = document.querySelectorAll('.side-nav-btn');
const sections = {
  overview: document.getElementById('section-overview'),
  goals: document.getElementById('section-goals'),
  habits: document.getElementById('section-habits'),
  finance: document.getElementById('section-finance'),
  analytics: document.getElementById('section-analytics'),
  tools: document.getElementById('section-tools'),
  settings: document.getElementById('section-settings'),
};

sideNavBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    sideNavBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(sections).forEach(s => s.classList.remove('active'));
    sections[btn.dataset.section].classList.add('active');

    if (btn.dataset.section === 'overview' && window.renderOverview) { window.renderOverview(); window.checkBackupReminder && window.checkBackupReminder(); }
    if (btn.dataset.section === 'finance') {
      if (window.renderBudget) window.renderBudget();
      if (window.renderDebts) window.renderDebts();
      if (window.renderFinanceOverview) window.renderFinanceOverview();
    }
    if (btn.dataset.section === 'habits' && window.renderHabits) window.renderHabits();
    if (btn.dataset.section === 'analytics' && window.renderAnalytics) window.renderAnalytics();
    if (btn.dataset.section === 'settings' && window.renderSettings) window.renderSettings();
  });
});

// ---------- Theme: light / dark / system ----------
const THEME_KEY = 'goal-tracker-theme';
const themeToggleBtn = document.getElementById('themeToggleBtn');

function getEffectiveTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'system';
  if (saved === 'system') {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
  return saved;
}

function setTheme(value) {
  localStorage.setItem(THEME_KEY, value);
  if (value === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', value);
  }
  const effective = getEffectiveTheme();
  themeToggleBtn.textContent = effective === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема';
  if (window.renderSettings) window.renderSettings();
}

themeToggleBtn.addEventListener('click', () => {
  setTheme(getEffectiveTheme() === 'dark' ? 'light' : 'dark');
});

setTheme(localStorage.getItem(THEME_KEY) || 'system');

window.getEffectiveTheme = getEffectiveTheme;
window.setTheme = setTheme;

// ---------- PWA: register service worker ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
