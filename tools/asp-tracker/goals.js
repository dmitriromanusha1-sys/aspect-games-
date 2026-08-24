// ---------- Storage ----------
const STORAGE_KEY = 'goal-tracker-data-v1';

function loadGoals() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load goals', e);
    return [];
  }
}

function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

let goals = loadGoals();
let editingGoalId = null;
let draftGoal = null; // working copy while modal open

// ---------- Helpers ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function termLabel(term) {
  return { short: 'Краткосрочная', mid: 'Среднесрочная', long: 'Долгосрочная' }[term] || term;
}

function statusLabel(status) {
  return { planned: 'Запланирована', active: 'В процессе', done: 'Закрыта', overdue: 'Просрочена' }[status] || status;
}

// Status derived from dates, unless manually closed
function computeStatus(goal) {
  if (goal.manuallyClosed) return 'done';
  const today = todayISO();
  if (!goal.openDate || !goal.closeDate) return 'planned';
  if (today < goal.openDate) return 'planned';
  if (today > goal.closeDate) return 'overdue';
  return 'active';
}

function planProgress(goal) {
  const steps = goal.plan || [];
  if (steps.length === 0) return null;
  const done = steps.filter(s => s.done).length;
  return Math.round((done / steps.length) * 100);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function emptyGoal() {
  return {
    id: uid(),
    title: '',
    description: '',
    term: 'short',
    openDate: todayISO(),
    closeDate: '',
    manuallyClosed: false,
    archived: false,
    plan: [],
    forecast: { pessimistic: '', realistic: '', optimistic: '' },
    notes: [],
    savingsGoal: { enabled: false, target: 0 },
    notifiedDeadline: false,
    priority: 'medium',
    tags: [],
    links: [],
    history: [],
    icon: '',
    color: '',
    parentId: '',
    reminderDays: parseInt(localStorage.getItem('goal-tracker-default-reminder-days'), 10) || 3,
    createdAt: new Date().toISOString(),
  };
}

function getSubgoals(parentId) {
  return goals.filter(g => g.parentId === parentId && !g.archived);
}

function getGoalById(id) {
  return goals.find(g => g.id === id);
}

const GOAL_TEMPLATES = {
  'learn-language': { title: 'Выучить язык до уровня B2', description: 'Регулярные занятия, практика речи и словарного запаса.', term: 'long', plan: ['Пройти вводный тест', 'Заниматься 3 раза в неделю', 'Найти носителя языка для разговорной практики', 'Сдать экзамен B2'] },
  'save-money': { title: 'Накопить сумму', description: 'Финансовая цель — регулярные отчисления в бюджет.', term: 'mid', plan: ['Определить целевую сумму', 'Настроить автоматический перевод после зарплаты', 'Проверять прогресс раз в месяц'] },
  'fitness': { title: 'Привести себя в форму', description: 'Регулярные тренировки и правильное питание.', term: 'mid', plan: ['Пройти медосмотр', 'Составить план тренировок', 'Тренироваться 3 раза в неделю', 'Скорректировать питание'] },
  'read-books': { title: 'Прочитать N книг', description: 'Список книг для чтения в этом периоде.', term: 'short', plan: ['Составить список книг', 'Читать по 20 страниц в день'] },
  'career': { title: 'Сменить/повысить работу', description: 'План карьерного роста.', term: 'long', plan: ['Обновить резюме', 'Прокачать ключевые навыки', 'Начать отклики/переговорить с руководителем', 'Пройти собеседования'] },
};

function applyGoalTemplate(key) {
  const tpl = GOAL_TEMPLATES[key];
  if (!tpl) return;
  draftGoal.title = tpl.title;
  draftGoal.description = tpl.description;
  draftGoal.term = tpl.term;
  draftGoal.plan = tpl.plan.map(text => ({ id: uid(), text, done: false, dueDate: '' }));
  fTitle.value = draftGoal.title;
  fDescription.value = draftGoal.description;
  fTerm.value = draftGoal.term;
  renderPlanSteps();
}

function logGoalHistory(goal, message) {
  goal.history = goal.history || [];
  goal.history.push({ date: new Date().toISOString(), message });
}

// Amount saved for a goal = sum of budget transactions tagged with this goal (income adds, expense subtracts is not meaningful here — we just sum income tx tagged to the goal as contributions)
function getGoalSavedAmount(goalId) {
  if (typeof transactions === 'undefined') return 0;
  return transactions
    .filter(t => t.goalId === goalId)
    .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
}

function getHabitsForGoal(goalId) {
  if (typeof habits === 'undefined') return [];
  return habits.filter(h => h.goalId === goalId && !h.archived);
}

function daysUntil(dateISO) {
  if (!dateISO) return null;
  const today = new Date(todayISO() + 'T00:00:00');
  const target = new Date(dateISO + 'T00:00:00');
  return Math.round((target - today) / 86400000);
}

// Called periodically to notify about approaching deadlines (3 days out)
function checkGoalDeadlineNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  let changed = false;
  goals.forEach(g => {
    if (g.archived || g.manuallyClosed) return;
    const status = computeStatus(g);
    if (status !== 'active') return;
    const d = daysUntil(g.closeDate);
    const threshold = g.reminderDays !== undefined && g.reminderDays !== null ? g.reminderDays : 3;
    if (d !== null && d <= threshold && d >= 0 && !g.notifiedDeadline) {
      new Notification('Дедлайн цели приближается', { body: `«${g.title}» — до дедлайна ${d} дн.` });
      g.notifiedDeadline = true;
      changed = true;
    }
  });
  if (changed) saveGoals(goals);
}

// "Closed" = manually marked done, or auto-overdue (deadline passed without closing).
// "On time" = manually closed on/before the deadline.
function goalsClosedOnTimeRate() {
  const closed = goals.filter(g => !g.archived && (g.manuallyClosed || computeStatus(g) === 'overdue'));
  if (closed.length === 0) return null;
  const onTime = closed.filter(g => {
    if (!g.manuallyClosed) return false; // overdue & never closed = late
    if (!g.closeDate || !g.closedAt) return true;
    return g.closedAt.slice(0, 10) <= g.closeDate;
  });
  return Math.round((onTime.length / closed.length) * 100);
}

// ---------- Goals mini-dashboard ----------
const goalsStatsEl = document.getElementById('goalsStats');

function renderGoalsStats() {
  const active = goals.filter(g => !g.archived);
  const activeCount = active.filter(g => computeStatus(g) === 'active').length;
  const overdueCount = active.filter(g => computeStatus(g) === 'overdue').length;
  const doneThisYear = active.filter(g => g.manuallyClosed && g.closedAt && new Date(g.closedAt).getFullYear() === new Date().getFullYear()).length;
  const rate = goalsClosedOnTimeRate();
  const upcoming7 = active.filter(g => {
    if (g.manuallyClosed || !g.closeDate) return false;
    const d = daysUntil(g.closeDate);
    return d !== null && d >= 0 && d <= 7;
  }).length;

  goalsStatsEl.innerHTML = `
    <div class="stat-card"><div class="stat-label">Всего целей</div><div class="stat-value">${active.length}</div></div>
    <div class="stat-card"><div class="stat-label">В процессе</div><div class="stat-value">${activeCount}</div></div>
    <div class="stat-card"><div class="stat-label">Просрочено</div><div class="stat-value ${overdueCount > 0 ? 'negative' : ''}">${overdueCount}</div></div>
    <div class="stat-card"><div class="stat-label">Дедлайн ≤ 7 дней</div><div class="stat-value ${upcoming7 > 0 ? 'negative' : ''}">${upcoming7}</div></div>
    <div class="stat-card"><div class="stat-label">Закрыто в срок</div><div class="stat-value">${rate === null ? '—' : rate + '%'}</div></div>
    <div class="stat-card"><div class="stat-label">Закрыто в этом году</div><div class="stat-value">${doneThisYear}</div></div>
  `;
}

// ---------- View switching ----------
const tabBtns = document.querySelectorAll('#section-goals .tab-btn');
const views = { list: document.getElementById('listView'), kanban: document.getElementById('kanbanView'), calendar: document.getElementById('calendarView') };

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[btn.dataset.view].classList.add('active');
    if (btn.dataset.view === 'calendar') renderCalendar();
    if (btn.dataset.view === 'kanban') renderKanban();
  });
});

// ---------- Templates ----------
const goalTemplateSelect = document.getElementById('goalTemplateSelect');
goalTemplateSelect.addEventListener('change', () => {
  if (!goalTemplateSelect.value) return;
  openGoalModal(null);
  applyGoalTemplate(goalTemplateSelect.value);
  goalTemplateSelect.value = '';
});

// ---------- Kanban ----------
function renderKanban() {
  ['planned', 'active', 'done'].forEach(status => {
    const col = document.querySelector(`.kanban-list[data-status="${status}"]`);
    // Overdue goals are shown in the "active" column (with a warning badge) since there is no separate column for them.
    const list = goals.filter(g => {
      if (g.archived) return false;
      const s = computeStatus(g);
      return s === status || (s === 'overdue' && status === 'active');
    });
    col.innerHTML = list.map(g => `
      <div class="kanban-card" data-id="${g.id}" style="${g.color ? `border-left:3px solid ${g.color}` : ''}">
        <div class="kanban-card-title">${g.icon ? escapeHtml(g.icon) + ' ' : ''}${escapeHtml(g.title || '(без названия)')}</div>
        <div class="badges">
          <span class="badge badge-term-${g.term}">${termLabel(g.term)}</span>
          <span class="badge priority-${g.priority || 'medium'}">${priorityLabel(g.priority)}</span>
          ${computeStatus(g) === 'overdue' ? '<span class="badge badge-status-overdue">Просрочена</span>' : ''}
        </div>
        <div class="kanban-card-meta">${formatDate(g.closeDate)}</div>
      </div>
    `).join('') || '<p class="hint">Пусто</p>';
    col.querySelectorAll('.kanban-card').forEach(card => {
      card.addEventListener('click', () => openGoalModal(card.dataset.id));
    });
  });
}

function priorityLabel(p) {
  return { low: 'Низкий', medium: 'Средний', high: 'Высокий' }[p] || 'Средний';
}

// ---------- List rendering ----------
const goalListEl = document.getElementById('goalList');
const emptyStateEl = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterTerm = document.getElementById('filterTerm');
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const filterTag = document.getElementById('filterTag');
const sortBy = document.getElementById('sortBy');
const showArchived = document.getElementById('showArchived');

[searchInput, filterTerm, filterStatus, filterPriority, filterTag, sortBy, showArchived].forEach(el => {
  el.addEventListener('input', renderList);
  el.addEventListener('change', renderList);
});

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function populateTagFilter() {
  const tags = [...new Set(goals.flatMap(g => g.tags || []))].sort();
  const prev = filterTag.value;
  filterTag.innerHTML = '<option value="">Все теги</option>' + tags.map(t => `<option value="${escapeHtml(t)}">#${escapeHtml(t)}</option>`).join('');
  filterTag.value = tags.includes(prev) ? prev : '';
}

function getFilteredSortedGoals() {
  const q = searchInput.value.trim().toLowerCase();
  const term = filterTerm.value;
  const status = filterStatus.value;
  const priority = filterPriority.value;
  const tag = filterTag.value;
  const includeArchived = showArchived.checked;

  let list = goals.filter(g => {
    if (!includeArchived && g.archived) return false;
    if (term && g.term !== term) return false;
    const st = computeStatus(g);
    if (status && st !== status) return false;
    if (priority && (g.priority || 'medium') !== priority) return false;
    if (tag && !(g.tags || []).includes(tag)) return false;
    if (q && !(g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q))) return false;
    return true;
  });

  list.sort((a, b) => {
    switch (sortBy.value) {
      case 'openAsc': return (a.openDate || '').localeCompare(b.openDate || '');
      case 'closeAsc': return (a.closeDate || '9999').localeCompare(b.closeDate || '9999');
      case 'priority': return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      case 'title': return a.title.localeCompare(b.title, 'ru');
      case 'openDesc':
      default: return (b.openDate || '').localeCompare(a.openDate || '');
    }
  });

  return list;
}

// ---------- Bulk selection ----------
let selectMode = false;
let selectedGoalIds = new Set();
const toggleSelectModeBtn = document.getElementById('toggleSelectModeBtn');
const bulkActionsBar = document.getElementById('bulkActionsBar');
const bulkSelectedCount = document.getElementById('bulkSelectedCount');
const bulkArchiveBtn = document.getElementById('bulkArchiveBtn');
const bulkTagBtn = document.getElementById('bulkTagBtn');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

toggleSelectModeBtn.addEventListener('click', () => {
  selectMode = !selectMode;
  selectedGoalIds.clear();
  toggleSelectModeBtn.textContent = selectMode ? 'Отменить выбор' : 'Выбрать несколько';
  toggleSelectModeBtn.classList.toggle('active-toggle', selectMode);
  bulkActionsBar.hidden = !selectMode;
  renderList();
});

function updateBulkBar() {
  bulkSelectedCount.textContent = `Выбрано: ${selectedGoalIds.size}`;
}

bulkArchiveBtn.addEventListener('click', () => {
  if (selectedGoalIds.size === 0) return;
  goals.forEach(g => { if (selectedGoalIds.has(g.id)) g.archived = true; });
  saveGoals(goals);
  toast(`Архивировано целей: ${selectedGoalIds.size}`, 'success');
  selectedGoalIds.clear();
  renderList();
});

bulkDeleteBtn.addEventListener('click', () => {
  if (selectedGoalIds.size === 0) return;
  if (!confirm(`Удалить безвозвратно ${selectedGoalIds.size} цел${selectedGoalIds.size === 1 ? 'ь' : 'и'}? Это действие необратимо.`)) return;
  goals = goals.filter(g => !selectedGoalIds.has(g.id));
  saveGoals(goals);
  toast('Цели удалены', 'success');
  selectedGoalIds.clear();
  renderList();
});

bulkTagBtn.addEventListener('click', () => {
  if (selectedGoalIds.size === 0) return;
  const tag = prompt('Тег для добавления к выбранным целям:');
  if (!tag || !tag.trim()) return;
  const clean = tag.trim();
  goals.forEach(g => {
    if (!selectedGoalIds.has(g.id)) return;
    g.tags = g.tags || [];
    if (!g.tags.includes(clean)) g.tags.push(clean);
  });
  saveGoals(goals);
  toast(`Тег «${clean}» добавлен`, 'success');
  renderList();
});

function renderList() {
  renderGoalsStats();
  populateTagFilter();
  const list = getFilteredSortedGoals();
  goalListEl.innerHTML = '';
  emptyStateEl.hidden = list.length > 0;

  list.forEach(g => {
    const status = computeStatus(g);
    const progress = planProgress(g);
    const subgoals = getSubgoals(g.id);
    const parent = g.parentId ? getGoalById(g.parentId) : null;
    const card = document.createElement('div');
    card.className = 'goal-card' + (g.archived ? ' archived' : '') + (selectedGoalIds.has(g.id) ? ' selected' : '') + (g.color ? ' has-color' : '');
    if (g.color) card.style.borderLeftColor = g.color;
    card.innerHTML = `
      <div class="goal-card-row">
        ${selectMode ? `<label class="goal-select-check checkbox-label"><input type="checkbox" class="goal-select-cb" data-id="${g.id}" ${selectedGoalIds.has(g.id) ? 'checked' : ''} /></label>` : ''}
        <div class="goal-card-body">
          <div class="goal-card-top">
            <div>
              ${parent ? `<div class="goal-parent-breadcrumb">⤷ ${escapeHtml(parent.title)}</div>` : ''}
              <p class="goal-card-title">${g.icon ? escapeHtml(g.icon) + ' ' : ''}${escapeHtml(g.title || '(без названия)')}</p>
              ${g.description ? `<p class="goal-card-desc">${escapeHtml(g.description)}</p>` : ''}
            </div>
            <div class="badges">
              <span class="badge badge-term-${g.term}">${termLabel(g.term)}</span>
              <span class="badge badge-status-${status}">${statusLabel(status)}</span>
              <span class="badge priority-${g.priority || 'medium'}">${priorityLabel(g.priority)}</span>
              ${g.archived ? '<span class="badge badge-status-planned">Архив</span>' : ''}
              ${subgoals.length ? `<span class="badge badge-subgoals">🧩 ${subgoals.length}</span>` : ''}
            </div>
          </div>
          ${g.tags && g.tags.length ? `<div class="tags-row">${g.tags.map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
          <div class="goal-card-dates">${formatDate(g.openDate)} → ${formatDate(g.closeDate)}</div>
          ${progress !== null ? `<div class="progress-bar-track"><div class="progress-bar-fill" style="width:${progress}%"></div></div>` : ''}
          ${g.savingsGoal && g.savingsGoal.enabled && g.savingsGoal.target > 0 ? renderSavingsMini(g) : ''}
        </div>
      </div>`;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.goal-select-check')) return;
      if (selectMode) {
        toggleGoalSelection(g.id);
        return;
      }
      openGoalModal(g.id);
    });
    goalListEl.appendChild(card);
  });

  if (selectMode) {
    goalListEl.querySelectorAll('.goal-select-cb').forEach(cb => {
      cb.addEventListener('change', () => toggleGoalSelection(cb.dataset.id));
    });
  }
}

function toggleGoalSelection(id) {
  if (selectedGoalIds.has(id)) selectedGoalIds.delete(id);
  else selectedGoalIds.add(id);
  updateBulkBar();
  renderList();
}

function renderSavingsMini(g) {
  const saved = getGoalSavedAmount(g.id);
  const pct = Math.min(100, Math.max(0, Math.round((saved / g.savingsGoal.target) * 100)));
  return `<div class="savings-mini"><span>💰 ${saved.toLocaleString('ru-RU')} / ${g.savingsGoal.target.toLocaleString('ru-RU')} ₽</span><div class="progress-bar-track"><div class="progress-bar-fill" style="width:${pct}%;background:var(--accent)"></div></div></div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Modal ----------
const goalModal = document.getElementById('goalModal');
const modalTitle = document.getElementById('modalTitle');
const newGoalBtn = document.getElementById('newGoalBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveGoalBtn = document.getElementById('saveGoalBtn');
const deleteGoalBtn = document.getElementById('deleteGoalBtn');

const fTitle = document.getElementById('fTitle');
const fDescription = document.getElementById('fDescription');
const fTerm = document.getElementById('fTerm');
const fOpenDate = document.getElementById('fOpenDate');
const fCloseDate = document.getElementById('fCloseDate');
const fManuallyClosed = document.getElementById('fManuallyClosed');
const fPessimistic = document.getElementById('fPessimistic');
const fRealistic = document.getElementById('fRealistic');
const fOptimistic = document.getElementById('fOptimistic');
const fSavingsEnabled = document.getElementById('fSavingsEnabled');
const fSavingsTarget = document.getElementById('fSavingsTarget');
const fSavingsTargetWrap = document.getElementById('fSavingsTargetWrap');
const fSavingsProgress = document.getElementById('fSavingsProgress');
const fLinkedHabits = document.getElementById('fLinkedHabits');
const fPriority = document.getElementById('fPriority');
const fTags = document.getElementById('fTags');
const fLinksList = document.getElementById('fLinksList');
const newLinkLabel = document.getElementById('newLinkLabel');
const newLinkUrl = document.getElementById('newLinkUrl');
const addLinkBtn = document.getElementById('addLinkBtn');
const goalHistoryList = document.getElementById('goalHistoryList');
const fIcon = document.getElementById('fIcon');
const fColor = document.getElementById('fColor');
const fColorEnabled = document.getElementById('fColorEnabled');
fColorEnabled.addEventListener('change', () => { fColor.disabled = !fColorEnabled.checked; });
const fParentGoal = document.getElementById('fParentGoal');
const fReminderDays = document.getElementById('fReminderDays');
const fSubgoalsList = document.getElementById('fSubgoalsList');
const duplicateGoalBtn = document.getElementById('duplicateGoalBtn');
const copySummaryBtn = document.getElementById('copySummaryBtn');

fSavingsEnabled.addEventListener('change', () => {
  fSavingsTargetWrap.hidden = !fSavingsEnabled.checked;
});

newGoalBtn.addEventListener('click', () => openGoalModal(null));
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
goalModal.addEventListener('click', (e) => { if (e.target === goalModal) closeModal(); });

function openGoalModal(id) {
  editingGoalId = id;
  const existing = id ? goals.find(g => g.id === id) : null;
  draftGoal = existing ? JSON.parse(JSON.stringify(existing)) : emptyGoal();

  modalTitle.textContent = existing ? 'Редактировать цель' : 'Новая цель';
  deleteGoalBtn.hidden = !existing;
  deleteGoalBtn.textContent = existing && existing.archived ? 'Восстановить из архива' : 'Архивировать';
  duplicateGoalBtn.hidden = !existing;
  copySummaryBtn.hidden = !existing;

  fTitle.value = draftGoal.title;
  fDescription.value = draftGoal.description;
  fTerm.value = draftGoal.term;
  fOpenDate.value = draftGoal.openDate;
  fCloseDate.value = draftGoal.closeDate;
  fManuallyClosed.checked = draftGoal.manuallyClosed;
  fPessimistic.value = draftGoal.forecast.pessimistic;
  fRealistic.value = draftGoal.forecast.realistic;
  fOptimistic.value = draftGoal.forecast.optimistic;

  draftGoal.savingsGoal = draftGoal.savingsGoal || { enabled: false, target: 0 };
  fSavingsEnabled.checked = draftGoal.savingsGoal.enabled;
  fSavingsTarget.value = draftGoal.savingsGoal.target || '';
  fSavingsTargetWrap.hidden = !draftGoal.savingsGoal.enabled;

  fPriority.value = draftGoal.priority || 'medium';
  fTags.value = (draftGoal.tags || []).join(', ');
  fIcon.value = draftGoal.icon || '';
  fColorEnabled.checked = !!draftGoal.color;
  fColor.value = draftGoal.color || '#1f8a4c';
  fColor.disabled = !draftGoal.color;
  fReminderDays.value = draftGoal.reminderDays !== undefined && draftGoal.reminderDays !== null ? draftGoal.reminderDays : 3;

  // Populate parent-goal select, excluding self and its own descendants (to avoid creating cycles)
  const descendantIds = new Set();
  if (existing) {
    const collect = (pid) => {
      goals.forEach(g => {
        if (g.parentId === pid && !descendantIds.has(g.id)) {
          descendantIds.add(g.id);
          collect(g.id);
        }
      });
    };
    collect(existing.id);
  }
  const parentOptions = goals.filter(g => !g.archived && g.id !== draftGoal.id && !descendantIds.has(g.id));
  fParentGoal.innerHTML = '<option value="">— нет, это цель верхнего уровня —</option>' +
    parentOptions.map(g => `<option value="${g.id}">${escapeHtml(g.title || '(без названия)')}</option>`).join('');
  fParentGoal.value = draftGoal.parentId || '';

  draftGoal.links = draftGoal.links || [];
  draftGoal.history = draftGoal.history || [];

  renderPlanSteps();
  renderNotes();
  renderGoalLinks();
  renderGoalHistory();
  switchModalTab('main');
  goalModal.hidden = false;
}

function renderGoalHistory() {
  const items = [...(draftGoal.history || [])].sort((a, b) => b.date.localeCompare(a.date));
  goalHistoryList.innerHTML = items.length === 0
    ? '<p class="hint">Пока нет записей — история появится после первого редактирования.</p>'
    : items.map(h => `<div class="note-item"><div class="note-date">${new Date(h.date).toLocaleString('ru-RU')}</div><div class="note-text">${escapeHtml(h.message)}</div></div>`).join('');
}

function renderGoalLinksList() {
  fLinksList.innerHTML = (draftGoal.links || []).length === 0
    ? '<p class="hint">Ссылок пока нет.</p>'
    : draftGoal.links.map((l, i) => `
        <div class="link-row">
          <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label || l.url)}</a>
          <button class="remove-step" data-idx="${i}">✕</button>
        </div>
      `).join('');
  fLinksList.querySelectorAll('.remove-step').forEach(btn => {
    btn.addEventListener('click', () => {
      draftGoal.links.splice(+btn.dataset.idx, 1);
      renderGoalLinksList();
    });
  });
}

addLinkBtn.addEventListener('click', () => {
  const url = newLinkUrl.value.trim();
  if (!url) return;
  draftGoal.links.push({ label: newLinkLabel.value.trim(), url });
  newLinkLabel.value = '';
  newLinkUrl.value = '';
  renderGoalLinksList();
});

function renderGoalLinks() {
  const saved = getGoalSavedAmount(draftGoal.id);
  if (draftGoal.savingsGoal && draftGoal.savingsGoal.enabled && draftGoal.savingsGoal.target > 0) {
    const pct = Math.min(100, Math.max(0, Math.round((saved / draftGoal.savingsGoal.target) * 100)));
    fSavingsProgress.innerHTML = `Накоплено: <strong>${saved.toLocaleString('ru-RU')} ₽</strong> из ${draftGoal.savingsGoal.target.toLocaleString('ru-RU')} ₽ (${pct}%)`;
  } else {
    fSavingsProgress.textContent = '';
  }

  const linked = getHabitsForGoal(draftGoal.id);
  fLinkedHabits.innerHTML = linked.length === 0
    ? '<p class="hint">Пока не привязано ни одной привычки.</p>'
    : linked.map(h => `<div class="linked-habit-chip"><span class="habit-dot" style="background:${h.color}"></span>${escapeHtml(h.title)} — 🔥 ${computeStreak(h)}</div>`).join('');

  const subgoals = getSubgoals(draftGoal.id);
  fSubgoalsList.innerHTML = subgoals.length === 0
    ? '<p class="hint">Подцелей пока нет — создайте новую цель и выберите эту в поле «Родительская цель».</p>'
    : subgoals.map(sg => {
        const p = planProgress(sg);
        return `<div class="linked-habit-chip subgoal-chip" data-id="${sg.id}">${sg.icon ? escapeHtml(sg.icon) + ' ' : ''}${escapeHtml(sg.title)} ${p !== null ? `— ${p}%` : ''}</div>`;
      }).join('');
  fSubgoalsList.querySelectorAll('.subgoal-chip').forEach(el => {
    el.addEventListener('click', () => openGoalModal(el.dataset.id));
  });

  renderGoalLinksList();
}

function closeModal() {
  goalModal.hidden = true;
  editingGoalId = null;
  draftGoal = null;
}

function collectFormIntoDraft() {
  draftGoal.title = fTitle.value.trim();
  draftGoal.description = fDescription.value.trim();
  draftGoal.term = fTerm.value;
  draftGoal.openDate = fOpenDate.value;
  draftGoal.closeDate = fCloseDate.value;
  draftGoal.manuallyClosed = fManuallyClosed.checked;
  draftGoal.forecast.pessimistic = fPessimistic.value;
  draftGoal.forecast.realistic = fRealistic.value;
  draftGoal.forecast.optimistic = fOptimistic.value;
  draftGoal.savingsGoal = { enabled: fSavingsEnabled.checked, target: parseFloat(fSavingsTarget.value) || 0 };
  draftGoal.priority = fPriority.value;
  draftGoal.tags = fTags.value.split(',').map(t => t.trim()).filter(Boolean);
  draftGoal.icon = fIcon.value.trim();
  draftGoal.color = fColorEnabled.checked ? fColor.value : '';
  draftGoal.parentId = fParentGoal.value || '';
  draftGoal.reminderDays = Math.max(0, parseInt(fReminderDays.value, 10) || 0);
}

saveGoalBtn.addEventListener('click', () => {
  collectFormIntoDraft();
  if (!draftGoal.title) {
    alert('Укажите название цели');
    switchModalTab('main');
    fTitle.focus();
    return;
  }
  if (draftGoal.openDate && draftGoal.closeDate && draftGoal.closeDate < draftGoal.openDate) {
    alert('Дата закрытия не может быть раньше даты открытия');
    switchModalTab('main');
    return;
  }
  const wasManuallyClosed = editingGoalId ? goals.find(g => g.id === editingGoalId)?.manuallyClosed : false;
  if (draftGoal.manuallyClosed && !wasManuallyClosed) draftGoal.closedAt = new Date().toISOString();
  if (!draftGoal.manuallyClosed) draftGoal.closedAt = null;
  draftGoal.notifiedDeadline = draftGoal.manuallyClosed ? true : (editingGoalId ? goals.find(g => g.id === editingGoalId)?.notifiedDeadline : false) || false;

  logGoalHistory(draftGoal, editingGoalId ? 'Цель отредактирована' : 'Цель создана');

  const idx = goals.findIndex(g => g.id === draftGoal.id);
  const wasNew = idx < 0;
  if (idx >= 0) goals[idx] = draftGoal;
  else goals.push(draftGoal);
  saveGoals(goals);
  closeModal();
  renderList();
  if (views.calendar.classList.contains('active')) renderCalendar();
  if (views.kanban.classList.contains('active')) renderKanban();
  toast(wasNew ? 'Цель создана' : 'Цель сохранена', 'success');
});

deleteGoalBtn.addEventListener('click', () => {
  const idx = goals.findIndex(g => g.id === draftGoal.id);
  if (idx >= 0) {
    goals[idx].archived = !goals[idx].archived;
    toast(goals[idx].archived ? 'Цель архивирована' : 'Цель восстановлена', 'success');
    saveGoals(goals);
  }
  closeModal();
  renderList();
  if (views.kanban.classList.contains('active')) renderKanban();
});

duplicateGoalBtn.addEventListener('click', () => {
  const source = goals.find(g => g.id === draftGoal.id);
  if (!source) return;
  const copy = JSON.parse(JSON.stringify(source));
  copy.id = uid();
  copy.title = copy.title + ' (копия)';
  copy.manuallyClosed = false;
  copy.closedAt = null;
  copy.notifiedDeadline = false;
  copy.archived = false;
  copy.history = [];
  copy.createdAt = new Date().toISOString();
  logGoalHistory(copy, 'Цель создана дублированием из «' + source.title + '»');
  goals.push(copy);
  saveGoals(goals);
  closeModal();
  renderList();
  if (views.kanban.classList.contains('active')) renderKanban();
  toast('Цель продублирована', 'success');
  openGoalModal(copy.id);
});

copySummaryBtn.addEventListener('click', async () => {
  const g = goals.find(gl => gl.id === draftGoal.id);
  if (!g) return;
  const status = statusLabel(computeStatus(g));
  const lines = [
    `${g.icon ? g.icon + ' ' : ''}${g.title}`,
    g.description ? g.description : '',
    `Срок: ${termLabel(g.term)} | Приоритет: ${priorityLabel(g.priority)} | Статус: ${status}`,
    `Даты: ${formatDate(g.openDate)} → ${formatDate(g.closeDate)}`,
    g.tags && g.tags.length ? `Теги: ${g.tags.map(t => '#' + t).join(' ')}` : '',
    '',
  ];
  if (g.plan && g.plan.length) {
    lines.push('План:');
    g.plan.forEach(s => lines.push(`  [${s.done ? 'x' : ' '}] ${s.text}${s.dueDate ? ' (до ' + formatDate(s.dueDate) + ')' : ''}`));
    lines.push('');
  }
  if (g.forecast && (g.forecast.pessimistic || g.forecast.realistic || g.forecast.optimistic)) {
    lines.push('Прогнозы:');
    if (g.forecast.pessimistic) lines.push(`  Пессимистичный: ${g.forecast.pessimistic}`);
    if (g.forecast.realistic) lines.push(`  Реалистичный: ${g.forecast.realistic}`);
    if (g.forecast.optimistic) lines.push(`  Оптимистичный: ${g.forecast.optimistic}`);
  }
  const text = lines.filter(l => l !== undefined).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    toast('Сводка скопирована в буфер обмена', 'success');
  } catch (e) {
    toast('Не удалось скопировать — браузер заблокировал доступ к буферу', 'error');
  }
});

// ---------- Modal tabs ----------
const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
modalTabBtns.forEach(btn => btn.addEventListener('click', () => switchModalTab(btn.dataset.tab)));

function switchModalTab(tab) {
  document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.modal-tab-content').forEach(c => c.classList.toggle('active', c.dataset.tabContent === tab));
}

// ---------- Plan steps ----------
const planStepsEl = document.getElementById('planSteps');
const newStepText = document.getElementById('newStepText');
const addStepBtn = document.getElementById('addStepBtn');

function renderPlanSteps() {
  planStepsEl.innerHTML = '';
  const total = (draftGoal.plan || []).length;
  (draftGoal.plan || []).forEach((step, i) => {
    const overdue = !step.done && step.dueDate && step.dueDate < todayISO();
    const row = document.createElement('div');
    row.className = 'plan-step' + (step.done ? ' done' : '') + (overdue ? ' step-overdue' : '');
    row.innerHTML = `
      <div class="step-reorder">
        <button class="step-move-up" data-idx="${i}" ${i === 0 ? 'disabled' : ''} title="Выше">▲</button>
        <button class="step-move-down" data-idx="${i}" ${i === total - 1 ? 'disabled' : ''} title="Ниже">▼</button>
      </div>
      <input type="checkbox" ${step.done ? 'checked' : ''} data-idx="${i}" class="step-check" />
      <input type="text" value="${escapeHtml(step.text)}" data-idx="${i}" class="step-text" />
      <input type="date" value="${step.dueDate || ''}" data-idx="${i}" class="step-date" title="Срок" />
      ${overdue ? '<span class="step-overdue-badge" title="Просрочен">⚠️</span>' : ''}
      <button class="remove-step" data-idx="${i}">✕</button>
    `;
    planStepsEl.appendChild(row);
  });

  planStepsEl.querySelectorAll('.step-check').forEach(cb => {
    cb.addEventListener('change', (e) => {
      draftGoal.plan[+e.target.dataset.idx].done = e.target.checked;
      renderPlanSteps();
    });
  });
  planStepsEl.querySelectorAll('.step-text').forEach(inp => {
    inp.addEventListener('input', (e) => {
      draftGoal.plan[+e.target.dataset.idx].text = e.target.value;
    });
  });
  planStepsEl.querySelectorAll('.step-date').forEach(inp => {
    inp.addEventListener('change', (e) => {
      draftGoal.plan[+e.target.dataset.idx].dueDate = e.target.value;
      renderPlanSteps();
    });
  });
  planStepsEl.querySelectorAll('.remove-step').forEach(btn => {
    btn.addEventListener('click', (e) => {
      draftGoal.plan.splice(+e.target.dataset.idx, 1);
      renderPlanSteps();
    });
  });
  planStepsEl.querySelectorAll('.step-move-up').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = +e.target.dataset.idx;
      if (idx <= 0) return;
      [draftGoal.plan[idx - 1], draftGoal.plan[idx]] = [draftGoal.plan[idx], draftGoal.plan[idx - 1]];
      renderPlanSteps();
    });
  });
  planStepsEl.querySelectorAll('.step-move-down').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = +e.target.dataset.idx;
      if (idx >= draftGoal.plan.length - 1) return;
      [draftGoal.plan[idx + 1], draftGoal.plan[idx]] = [draftGoal.plan[idx], draftGoal.plan[idx + 1]];
      renderPlanSteps();
    });
  });
}

addStepBtn.addEventListener('click', addStep);
newStepText.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } });

function addStep() {
  const text = newStepText.value.trim();
  if (!text) return;
  const newStepDate = document.getElementById('newStepDate');
  draftGoal.plan.push({ id: uid(), text, done: false, dueDate: newStepDate.value || '' });
  newStepText.value = '';
  newStepDate.value = '';
  renderPlanSteps();
}

// ---------- Notes ----------
const notesListEl = document.getElementById('notesList');
const newNoteText = document.getElementById('newNoteText');
const addNoteBtn = document.getElementById('addNoteBtn');

function renderNotes() {
  notesListEl.innerHTML = '';
  const notes = [...(draftGoal.notes || [])].sort((a, b) => b.date.localeCompare(a.date));
  notes.forEach(note => {
    const div = document.createElement('div');
    div.className = 'note-item';
    div.innerHTML = `
      <button class="note-remove" data-id="${note.id}">Удалить</button>
      <div class="note-date">${new Date(note.date).toLocaleString('ru-RU')}</div>
      <div class="note-text">${escapeHtml(note.text)}</div>
    `;
    notesListEl.appendChild(div);
  });
  notesListEl.querySelectorAll('.note-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      draftGoal.notes = draftGoal.notes.filter(n => n.id !== id);
      renderNotes();
    });
  });
}

addNoteBtn.addEventListener('click', addNote);

function addNote() {
  const text = newNoteText.value.trim();
  if (!text) return;
  draftGoal.notes.push({ id: uid(), text, date: new Date().toISOString() });
  newNoteText.value = '';
  renderNotes();
}

// ---------- Calendar ----------
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth(); // 0-indexed
let selectedDay = null;

const calendarGrid = document.getElementById('calendarGrid');
const calendarTitle = document.getElementById('calendarTitle');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const todayBtn = document.getElementById('todayBtn');
const calFilterTerm = document.getElementById('calFilterTerm');
const calFilterStatus = document.getElementById('calFilterStatus');
const dayDetails = document.getElementById('dayDetails');
const dayDetailsTitle = document.getElementById('dayDetailsTitle');
const dayDetailsList = document.getElementById('dayDetailsList');

prevMonthBtn.addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); });
nextMonthBtn.addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); });
todayBtn.addEventListener('click', () => { const d = new Date(); calYear = d.getFullYear(); calMonth = d.getMonth(); renderCalendar(); });
calFilterTerm.addEventListener('change', renderCalendar);
calFilterStatus.addEventListener('change', renderCalendar);

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function goalsForDay(dateISO, applyFilters = true) {
  return goals.filter(g => {
    if (g.archived) return false;
    if (!g.openDate || !g.closeDate) return false;
    if (dateISO < g.openDate || dateISO > g.closeDate) return false;
    if (applyFilters) {
      if (calFilterTerm.value && g.term !== calFilterTerm.value) return false;
      const st = computeStatus(g);
      if (calFilterStatus.value && st !== calFilterStatus.value) return false;
    }
    return true;
  });
}

function renderCalendar() {
  calendarTitle.textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;
  calendarGrid.innerHTML = '';

  WEEKDAYS.forEach(w => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = w;
    calendarGrid.appendChild(el);
  });

  const firstOfMonth = new Date(calYear, calMonth, 1);
  let startOffset = firstOfMonth.getDay() - 1; // Monday-first
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = todayISO();

  for (let i = 0; i < startOffset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    calendarGrid.appendChild(el);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateISO = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayGoals = goalsForDay(dateISO);

    const el = document.createElement('div');
    el.className = 'cal-day' + (dateISO === today ? ' today' : '');
    const chipsHtml = dayGoals.slice(0, 3).map(g => {
      const isOpen = g.openDate === dateISO;
      const isClose = g.closeDate === dateISO;
      let cls = `cal-goal-chip${g.color ? '' : ' term-' + g.term}`;
      if (isClose) cls += ' close-day';
      else if (isOpen) cls += ' open-day';
      const style = g.color ? ` style="background:${g.color}"` : '';
      return `<div class="${cls}"${style} title="${escapeHtml(g.title)}">${g.icon ? escapeHtml(g.icon) + ' ' : ''}${escapeHtml(g.title)}</div>`;
    }).join('');
    const moreHtml = dayGoals.length > 3 ? `<div class="cal-more">+${dayGoals.length - 3} ещё</div>` : '';

    el.innerHTML = `<div class="cal-day-num">${day}</div>${chipsHtml}${moreHtml}`;
    el.addEventListener('click', () => showDayDetails(dateISO));
    calendarGrid.appendChild(el);
  }

  if (selectedDay) showDayDetails(selectedDay);
}

function showDayDetails(dateISO) {
  selectedDay = dateISO;
  const dayGoals = goalsForDay(dateISO);
  dayDetails.hidden = dayGoals.length === 0;
  if (dayGoals.length === 0) return;

  const d = new Date(dateISO + 'T00:00:00');
  dayDetailsTitle.textContent = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  dayDetailsList.innerHTML = '';
  dayGoals.forEach(g => {
    const isOpen = g.openDate === dateISO;
    const isClose = g.closeDate === dateISO;
    const marker = isClose ? ' 🏁 Завершение' : (isOpen ? ' 🚀 Старт' : '');
    const div = document.createElement('div');
    div.className = 'day-detail-item';
    div.innerHTML = `<span class="badge badge-term-${g.term}">${termLabel(g.term)}</span> <strong>${escapeHtml(g.title)}</strong>${marker}`;
    div.addEventListener('click', () => openGoalModal(g.id));
    dayDetailsList.appendChild(div);
  });
}

// ---------- Init ----------
function initGoals() {
  renderList();
  renderCalendar();
  checkGoalDeadlineNotifications();
  setInterval(checkGoalDeadlineNotifications, 60 * 60 * 1000);
}
initGoals();

// Quick creation of a goal without opening the full modal (used by Overview quick-add)
function quickAddGoal(title, closeDate) {
  const g = emptyGoal();
  g.title = title;
  g.closeDate = closeDate || '';
  logGoalHistory(g, 'Цель создана (быстрое добавление)');
  goals.push(g);
  saveGoals(goals);
  renderList();
  renderCalendar();
}
window.quickAddGoal = quickAddGoal;
window.openGoalModal = openGoalModal;
