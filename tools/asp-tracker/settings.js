// ---------- Appearance: theme select (mirrors the quick-toggle button in main.js) ----------
const settingsThemeSelect = document.getElementById('settingsThemeSelect');
settingsThemeSelect.addEventListener('change', () => {
  window.setTheme(settingsThemeSelect.value);
});

// ---------- Notifications ----------
const settingsNotifBtn = document.getElementById('settingsNotifBtn');

function updateSettingsNotifBtn() {
  if (!('Notification' in window)) {
    settingsNotifBtn.textContent = '🔔 Не поддерживается браузером';
    settingsNotifBtn.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    settingsNotifBtn.textContent = '🔔 Уведомления разрешены';
  } else if (Notification.permission === 'denied') {
    settingsNotifBtn.textContent = '🔔 Заблокированы в браузере';
  } else {
    settingsNotifBtn.textContent = '🔔 Разрешить уведомления';
  }
}

settingsNotifBtn.addEventListener('click', async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  } else if (Notification.permission === 'denied') {
    alert('Уведомления заблокированы в настройках браузера для этой страницы. Разрешите их вручную в настройках сайта.');
  }
  updateSettingsNotifBtn();
});

const settingsHabitReminderHour = document.getElementById('settingsHabitReminderHour');
settingsHabitReminderHour.addEventListener('change', () => {
  localStorage.setItem('goal-tracker-habit-reminder-hour', settingsHabitReminderHour.value);
  toast('Час напоминания сохранён', 'success');
});

const settingsDefaultReminderDays = document.getElementById('settingsDefaultReminderDays');
settingsDefaultReminderDays.addEventListener('change', () => {
  const v = Math.max(0, parseInt(settingsDefaultReminderDays.value, 10) || 3);
  settingsDefaultReminderDays.value = v;
  localStorage.setItem('goal-tracker-default-reminder-days', v);
  toast('Сохранено', 'success');
});

// ---------- Backup threshold ----------
const settingsBackupThreshold = document.getElementById('settingsBackupThreshold');
settingsBackupThreshold.addEventListener('change', () => {
  const v = Math.max(1, parseInt(settingsBackupThreshold.value, 10) || 7);
  settingsBackupThreshold.value = v;
  localStorage.setItem('goal-tracker-backup-threshold', v);
  if (window.checkBackupReminder) window.checkBackupReminder();
  toast('Сохранено', 'success');
});

// ---------- Storage stats ----------
function renderStorageStats() {
  const box = document.getElementById('settingsStorageStats');
  const keys = [
    ['goal-tracker-data-v1', 'Целей', goals.length],
    ['goal-tracker-transactions-v1', 'Операций бюджета', transactions.length],
    ['goal-tracker-habits-v1', 'Привычек', habits.length],
    ['goal-tracker-debts-v1', 'Долгов', debts.length],
  ];
  let totalBytes = 0;
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('goal-tracker') || k.startsWith('tool-input-') || k.startsWith('pomodoro-') || k.startsWith('habit-reminder-')) {
      totalBytes += (localStorage.getItem(k) || '').length;
    }
  });
  const kb = (totalBytes / 1024).toFixed(1);

  box.innerHTML = keys.map(([, label, count]) => `<div>${label}: <strong>${count}</strong></div>`).join('') +
    `<div>Занято в браузере: <strong>~${kb} КБ</strong></div>`;
}

// ---------- Reset all data ----------
document.getElementById('settingsResetBtn').addEventListener('click', () => {
  if (!confirm('Удалить ВСЕ данные приложения из этого браузера безвозвратно? Это действие нельзя отменить.')) return;
  if (!confirm('Точно уверены? Рекомендуем сначала сделать экспорт. Продолжить удаление?')) return;
  Object.keys(localStorage)
    .filter(k => k.startsWith('goal-tracker') || k.startsWith('tool-input-') || k.startsWith('pomodoro-') || k.startsWith('habit-reminder-'))
    .forEach(k => localStorage.removeItem(k));
  toast('Все данные удалены', 'success');
  setTimeout(() => location.reload(), 800);
});

// ---------- Sync controls with stored values whenever the section is opened ----------
function renderSettings() {
  settingsThemeSelect.value = localStorage.getItem('goal-tracker-theme') || 'system';
  updateSettingsNotifBtn();
  settingsHabitReminderHour.value = localStorage.getItem('goal-tracker-habit-reminder-hour') || '19';
  settingsDefaultReminderDays.value = localStorage.getItem('goal-tracker-default-reminder-days') || '3';
  settingsBackupThreshold.value = localStorage.getItem('goal-tracker-backup-threshold') || '7';
  renderStorageStats();
}

window.renderSettings = renderSettings;
renderSettings();
