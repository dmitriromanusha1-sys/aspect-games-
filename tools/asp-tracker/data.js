// ---------- Full data export / import ----------
const exportDataBtn = document.getElementById('settingsExportBtn');
const importDataInput = document.getElementById('settingsImportInput');

function exportAllData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    goals,
    transactions,
    categoryLimits,
    habits,
    debts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `goal-tracker-backup-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  localStorage.setItem('goal-tracker-last-backup', todayISO());
  if (window.checkBackupReminder) window.checkBackupReminder();
  toast('Резервная копия сохранена', 'success');
}

exportDataBtn.addEventListener('click', exportAllData);

importDataInput.addEventListener('change', () => {
  const file = importDataInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (e) {
      alert('Файл повреждён или не является корректным JSON.');
      importDataInput.value = '';
      return;
    }
    const confirmed = confirm('Импорт заменит ВСЕ текущие данные (цели, бюджет, привычки, лимиты, долги) содержимым файла. Продолжить?');
    if (!confirmed) {
      importDataInput.value = '';
      return;
    }
    if (Array.isArray(data.goals)) { goals = data.goals; saveGoals(goals); }
    if (Array.isArray(data.transactions)) { transactions = data.transactions; saveTx(transactions); }
    if (data.categoryLimits && typeof data.categoryLimits === 'object') { categoryLimits = data.categoryLimits; saveLimits(categoryLimits); }
    if (Array.isArray(data.habits)) { habits = data.habits; saveHabits(habits); }
    if (Array.isArray(data.debts)) { debts = data.debts; saveDebts(debts); }

    renderList();
    renderCalendar();
    renderBudget();
    renderHabits();
    renderOverview();
    if (window.renderDebts) window.renderDebts();
    if (window.renderAnalytics) window.renderAnalytics();
    if (window.renderSettings) window.renderSettings();
    importDataInput.value = '';
    toast('Данные успешно импортированы', 'success');
  };
  reader.readAsText(file);
});

window.exportAllData = exportAllData;
