// ---------- Storage ----------
const HABITS_STORAGE_KEY = 'goal-tracker-habits-v1';

function loadHabits() {
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load habits', e);
    return [];
  }
}

function saveHabits(list) {
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(list));
}

let habits = loadHabits();
let editingHabitId = null;
let habitWeekOffset = 0; // 0 = this week
let habitViewMode = 'week'; // 'week' | 'month'
let habitCalYear = new Date().getFullYear();
let habitCalMonth = new Date().getMonth();
let noteEditTarget = null; // { habitId, date }

function habitUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

const HABIT_TEMPLATES = {
  water: { title: 'Пить 2л воды', icon: '💧', frequency: 'daily' },
  sport: { title: 'Заниматься спортом', icon: '🏋️', frequency: 'custom', customDays: [0, 2, 4] },
  read: { title: 'Читать книгу', icon: '📖', frequency: 'weekly', target: 4 },
  meditate: { title: 'Медитация', icon: '🧘', frequency: 'daily' },
  sleep: { title: 'Спать 8 часов', icon: '😴', frequency: 'daily' },
  'no-smoke': { title: 'Не курить', icon: '🚭', frequency: 'daily' },
};

// ---------- Log entry helpers ----------
// A log entry is either absent (not done), or { done: bool, note: string }.
function isHabitDoneOn(habit, dateISO) {
  const v = habit.log[dateISO];
  if (!v) return false;
  return v === true || !!v.done;
}

function getHabitNoteOn(habit, dateISO) {
  const v = habit.log[dateISO];
  return v && typeof v === 'object' ? (v.note || '') : '';
}

function setHabitDone(habit, dateISO, done) {
  const existing = habit.log[dateISO];
  const note = existing && typeof existing === 'object' ? existing.note : '';
  if (!done && !note) {
    delete habit.log[dateISO];
    return;
  }
  habit.log[dateISO] = { done: !!done, note: note || '' };
}

function setHabitNote(habit, dateISO, note) {
  const existing = habit.log[dateISO];
  const done = existing && typeof existing === 'object' ? existing.done : existing === true;
  if (!note && !done) {
    delete habit.log[dateISO];
    return;
  }
  habit.log[dateISO] = { done: !!done, note };
}

// A habit is only "due" on days matching its schedule. Daily/weekly habits are
// due every day (weekly just tracks a numeric target across the week); custom
// habits are due only on the chosen weekdays.
function isScheduledOn(habit, dateISO) {
  if (habit.frequency !== 'custom') return true;
  const weekday = (new Date(dateISO + 'T00:00:00').getDay() + 6) % 7; // Monday = 0
  return (habit.customDays || []).includes(weekday);
}

// ---------- Week helpers ----------
function getWeekStart(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dayIdx = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayIdx + offset * 7);
  return d;
}

function isoFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekDays(offset) {
  const start = getWeekStart(offset);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(isoFromDate(d));
  }
  return days;
}

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// ---------- Streaks ----------
// Current streak counts consecutive *scheduled* days that are done, walking
// backward from today. Non-scheduled days are skipped without breaking it.
function computeStreak(habit) {
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let guard = 0; guard < 3650; guard++) {
    const iso = isoFromDate(d);
    if (isScheduledOn(habit, iso)) {
      if (isHabitDoneOn(habit, iso)) {
        streak++;
      } else if (iso === isoFromDate(new Date())) {
        // Today not done yet doesn't break the streak — it just doesn't count it.
      } else {
        break;
      }
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Best-ever streak: walk forward day-by-day from the earliest logged date to today.
function computeBestStreak(habit) {
  const dates = Object.keys(habit.log || {});
  if (dates.length === 0) return 0;
  const start = new Date(dates.sort()[0] + 'T00:00:00');
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  let running = 0, best = 0;
  const cursor = new Date(start);
  for (let guard = 0; guard < 3650 && cursor <= end; guard++) {
    const iso = isoFromDate(cursor);
    if (isScheduledOn(habit, iso)) {
      if (isHabitDoneOn(habit, iso)) { running++; best = Math.max(best, running); }
      else running = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

function completionRate(habit, days) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  let scheduled = 0, done = 0;
  const cursor = new Date(end);
  cursor.setDate(cursor.getDate() - days + 1);
  for (let i = 0; i < days; i++) {
    const iso = isoFromDate(cursor);
    if (isScheduledOn(habit, iso)) {
      scheduled++;
      if (isHabitDoneOn(habit, iso)) done++;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return scheduled === 0 ? null : Math.round((done / scheduled) * 100);
}

// ---------- DOM ----------
const newHabitBtn = document.getElementById('newHabitBtn');
const habitModal = document.getElementById('habitModal');
const habitModalTitle = document.getElementById('habitModalTitle');
const closeHabitModalBtn = document.getElementById('closeHabitModalBtn');
const cancelHabitModalBtn = document.getElementById('cancelHabitModalBtn');
const saveHabitBtn = document.getElementById('saveHabitBtn');
const deleteHabitBtn = document.getElementById('deleteHabitBtn');
const archiveHabitBtn = document.getElementById('archiveHabitBtn');

const habitIcon = document.getElementById('habitIcon');
const habitTitle = document.getElementById('habitTitle');
const habitFrequency = document.getElementById('habitFrequency');
const habitTargetWrap = document.getElementById('habitTargetWrap');
const habitTarget = document.getElementById('habitTarget');
const habitCustomDaysWrap = document.getElementById('habitCustomDaysWrap');
const habitColor = document.getElementById('habitColor');
const habitGoal = document.getElementById('habitGoal');
const habitGroup = document.getElementById('habitGroup');
const habitGroupList = document.getElementById('habitGroupList');
const habitStatsBox = document.getElementById('habitStatsBox');

const habitTable = document.getElementById('habitTable');
const habitEmptyState = document.getElementById('habitEmptyState');
const habitWeekLabel = document.getElementById('habitWeekLabel');
const habitPrevWeek = document.getElementById('habitPrevWeek');
const habitNextWeek = document.getElementById('habitNextWeek');
const habitTodayBtn = document.getElementById('habitTodayBtn');
const habitWeekControls = document.getElementById('habitWeekControls');
const habitMonthControls = document.getElementById('habitMonthControls');
const habitHeatmapEl = document.getElementById('habitHeatmap');
const habitMonthLabel = document.getElementById('habitMonthLabel');
const habitPrevMonth = document.getElementById('habitPrevMonth');
const habitNextMonth = document.getElementById('habitNextMonth');
const habitViewTabs = document.querySelectorAll('#section-habits .tab-btn');
const habitGroupsBar = document.getElementById('habitGroupsBar');
const habitsStatsEl = document.getElementById('habitsStats');
const habitSearch = document.getElementById('habitSearch');
const habitGroupFilter = document.getElementById('habitGroupFilter');
const habitFrequencyFilter = document.getElementById('habitFrequencyFilter');
const showArchivedHabits = document.getElementById('showArchivedHabits');
const habitTemplateSelect = document.getElementById('habitTemplateSelect');

const habitNoteModal = document.getElementById('habitNoteModal');
const habitNoteText = document.getElementById('habitNoteText');
const closeHabitNoteModalBtn = document.getElementById('closeHabitNoteModalBtn');
const cancelHabitNoteBtn = document.getElementById('cancelHabitNoteBtn');
const saveHabitNoteBtn = document.getElementById('saveHabitNoteBtn');

newHabitBtn.addEventListener('click', () => openHabitModal(null));
closeHabitModalBtn.addEventListener('click', closeHabitModal);
cancelHabitModalBtn.addEventListener('click', closeHabitModal);
habitModal.addEventListener('click', (e) => { if (e.target === habitModal) closeHabitModal(); });

habitFrequency.addEventListener('change', () => {
  habitTargetWrap.hidden = habitFrequency.value !== 'weekly';
  habitCustomDaysWrap.hidden = habitFrequency.value !== 'custom';
});

habitTemplateSelect.addEventListener('change', () => {
  const tpl = HABIT_TEMPLATES[habitTemplateSelect.value];
  habitTemplateSelect.value = '';
  if (!tpl) return;
  openHabitModal(null);
  habitIcon.value = tpl.icon || '';
  habitTitle.value = tpl.title;
  habitFrequency.value = tpl.frequency;
  habitFrequency.dispatchEvent(new Event('change'));
  if (tpl.target) habitTarget.value = tpl.target;
  if (tpl.customDays) {
    habitCustomDaysWrap.querySelectorAll('.habit-custom-day').forEach(cb => {
      cb.checked = tpl.customDays.includes(+cb.value);
    });
  }
});

[habitSearch, habitGroupFilter, habitFrequencyFilter, showArchivedHabits].forEach(el => {
  el.addEventListener('input', renderHabits);
  el.addEventListener('change', renderHabits);
});

habitPrevWeek.addEventListener('click', () => { habitWeekOffset--; renderHabits(); });
habitNextWeek.addEventListener('click', () => { habitWeekOffset++; renderHabits(); });
habitTodayBtn.addEventListener('click', () => { habitWeekOffset = 0; renderHabits(); });
habitPrevMonth.addEventListener('click', () => { habitCalMonth--; if (habitCalMonth < 0) { habitCalMonth = 11; habitCalYear--; } renderHabits(); });
habitNextMonth.addEventListener('click', () => { habitCalMonth++; if (habitCalMonth > 11) { habitCalMonth = 0; habitCalYear++; } renderHabits(); });

habitViewTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    habitViewTabs.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    habitViewMode = btn.dataset.habitview;
    habitWeekControls.hidden = habitViewMode !== 'week';
    habitTable.hidden = habitViewMode !== 'week';
    habitGroupsBar.hidden = habitViewMode !== 'week';
    habitMonthControls.hidden = habitViewMode !== 'month';
    habitHeatmapEl.hidden = habitViewMode !== 'month';
    renderHabits();
  });
});

function openHabitModal(id) {
  editingHabitId = id;
  const existing = id ? habits.find(h => h.id === id) : null;
  habitModalTitle.textContent = existing ? 'Редактировать привычку' : 'Новая привычка';
  archiveHabitBtn.hidden = !existing;
  archiveHabitBtn.textContent = existing && existing.archived ? 'Восстановить из архива' : 'Архивировать';
  deleteHabitBtn.hidden = !(existing && existing.archived);

  habitIcon.value = existing ? (existing.icon || '') : '';
  habitTitle.value = existing ? existing.title : '';
  habitFrequency.value = existing ? existing.frequency : 'daily';
  habitTarget.value = existing ? (existing.target || 3) : 3;
  habitTargetWrap.hidden = habitFrequency.value !== 'weekly';
  habitCustomDaysWrap.hidden = habitFrequency.value !== 'custom';
  habitCustomDaysWrap.querySelectorAll('.habit-custom-day').forEach(cb => {
    cb.checked = existing ? (existing.customDays || []).includes(+cb.value) : false;
  });
  habitColor.value = existing ? existing.color : '#1f8a4c';
  habitGroup.value = existing ? (existing.group || '') : '';

  const groups = [...new Set(habits.map(h => h.group).filter(Boolean))];
  habitGroupList.innerHTML = groups.map(g => `<option value="${escapeHtml(g)}"></option>`).join('');

  const activeGoals = (typeof goals !== 'undefined' ? goals : []).filter(g => !g.archived);
  habitGoal.innerHTML = '<option value="">— не привязано —</option>' +
    activeGoals.map(g => `<option value="${g.id}">${escapeHtml(g.title || '(без названия)')}</option>`).join('');
  habitGoal.value = existing ? (existing.goalId || '') : '';

  if (existing) {
    const rate30 = completionRate(existing, 30);
    habitStatsBox.innerHTML = `Текущий стрик: <strong>${computeStreak(existing)}</strong> · Лучший стрик: <strong>${computeBestStreak(existing)}</strong> · Выполнение за 30 дней: <strong>${rate30 === null ? '—' : rate30 + '%'}</strong>`;
  } else {
    habitStatsBox.textContent = '';
  }

  habitModal.hidden = false;
}

function closeHabitModal() {
  habitModal.hidden = true;
  editingHabitId = null;
}

saveHabitBtn.addEventListener('click', () => {
  const title = habitTitle.value.trim();
  if (!title) {
    toast('Укажите название привычки', 'error');
    return;
  }
  if (habitFrequency.value === 'custom') {
    const anyChecked = [...habitCustomDaysWrap.querySelectorAll('.habit-custom-day')].some(cb => cb.checked);
    if (!anyChecked) {
      toast('Выберите хотя бы один день недели', 'error');
      return;
    }
  }
  const existing = editingHabitId ? habits.find(h => h.id === editingHabitId) : null;
  const record = {
    id: editingHabitId || habitUid(),
    icon: habitIcon.value.trim(),
    title,
    frequency: habitFrequency.value,
    target: habitFrequency.value === 'weekly' ? parseInt(habitTarget.value, 10) || 1 : 7,
    customDays: [...habitCustomDaysWrap.querySelectorAll('.habit-custom-day')].filter(cb => cb.checked).map(cb => +cb.value),
    color: habitColor.value,
    goalId: habitGoal.value || '',
    group: habitGroup.value.trim(),
    archived: existing ? existing.archived : false,
    order: existing ? existing.order : habits.length,
    log: existing ? existing.log : {},
  };
  const idx = habits.findIndex(h => h.id === record.id);
  const wasNew = idx < 0;
  if (idx >= 0) habits[idx] = record;
  else habits.push(record);
  saveHabits(habits);
  closeHabitModal();
  renderHabits();
  if (window.renderOverview) window.renderOverview();
  toast(wasNew ? 'Привычка добавлена' : 'Привычка сохранена', 'success');
});

archiveHabitBtn.addEventListener('click', () => {
  const habit = habits.find(h => h.id === editingHabitId);
  if (!habit) return;
  habit.archived = !habit.archived;
  saveHabits(habits);
  toast(habit.archived ? 'Привычка архивирована' : 'Привычка восстановлена', 'success');
  closeHabitModal();
  renderHabits();
});

deleteHabitBtn.addEventListener('click', () => {
  if (!confirm('Удалить привычку безвозвратно вместе со всей историей отметок?')) return;
  habits = habits.filter(h => h.id !== editingHabitId);
  saveHabits(habits);
  toast('Привычка удалена', 'success');
  closeHabitModal();
  renderHabits();
});

function toggleHabitDay(habitId, dateISO) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  setHabitDone(habit, dateISO, !isHabitDoneOn(habit, dateISO));
  saveHabits(habits);
  renderHabits();
  if (window.renderOverview) window.renderOverview();
}

function moveHabit(id, direction) {
  const visible = getFilteredHabits();
  const posInVisible = visible.findIndex(h => h.id === id);
  const swapWith = visible[posInVisible + direction];
  if (!swapWith) return;
  const habit = visible[posInVisible];
  const tmp = habit.order;
  habit.order = swapWith.order;
  swapWith.order = tmp;
  saveHabits(habits);
  renderHabits();
}

// ---------- Day note modal ----------
function openHabitNoteModal(habitId, dateISO) {
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  noteEditTarget = { habitId, date: dateISO };
  habitNoteText.value = getHabitNoteOn(habit, dateISO);
  habitNoteModal.hidden = false;
}

function closeHabitNoteModal() {
  habitNoteModal.hidden = true;
  noteEditTarget = null;
}

closeHabitNoteModalBtn.addEventListener('click', closeHabitNoteModal);
cancelHabitNoteBtn.addEventListener('click', closeHabitNoteModal);
habitNoteModal.addEventListener('click', (e) => { if (e.target === habitNoteModal) closeHabitNoteModal(); });

saveHabitNoteBtn.addEventListener('click', () => {
  if (!noteEditTarget) return;
  const habit = habits.find(h => h.id === noteEditTarget.habitId);
  if (habit) {
    setHabitNote(habit, noteEditTarget.date, habitNoteText.value.trim());
    saveHabits(habits);
  }
  closeHabitNoteModal();
  renderHabits();
});

// ---------- Filtering ----------
function getFilteredHabits() {
  const q = habitSearch.value.trim().toLowerCase();
  const group = habitGroupFilter.value;
  const freq = habitFrequencyFilter.value;
  const includeArchived = showArchivedHabits.checked;

  return habits
    .filter(h => {
      if (!includeArchived && h.archived) return false;
      if (group && h.group !== group) return false;
      if (freq && h.frequency !== freq) return false;
      if (q && !h.title.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function populateHabitFilters() {
  const groups = [...new Set(habits.map(h => h.group).filter(Boolean))].sort();
  const prev = habitGroupFilter.value;
  habitGroupFilter.innerHTML = '<option value="">Все группы</option>' + groups.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
  habitGroupFilter.value = groups.includes(prev) ? prev : '';
}

// ---------- Mini-dashboard ----------
function renderHabitsStats() {
  const active = habits.filter(h => !h.archived);
  const today = isoFromDate(new Date());
  const dueToday = active.filter(h => isScheduledOn(h, today));
  const doneToday = dueToday.filter(h => isHabitDoneOn(h, today)).length;
  const bestCurrentStreak = active.reduce((max, h) => Math.max(max, computeStreak(h)), 0);

  const days = getWeekDays(0);
  let scheduled = 0, done = 0;
  active.forEach(h => days.forEach(d => {
    if (d > today) return;
    if (isScheduledOn(h, d)) { scheduled++; if (isHabitDoneOn(h, d)) done++; }
  }));
  const weekRate = scheduled === 0 ? null : Math.round((done / scheduled) * 100);

  habitsStatsEl.innerHTML = `
    <div class="stat-card"><div class="stat-label">Активных привычек</div><div class="stat-value">${active.length}</div></div>
    <div class="stat-card"><div class="stat-label">Выполнено сегодня</div><div class="stat-value">${doneToday}/${dueToday.length}</div></div>
    <div class="stat-card"><div class="stat-label">Лучший текущий стрик</div><div class="stat-value">🔥 ${bestCurrentStreak}</div></div>
    <div class="stat-card"><div class="stat-label">Выполнение на этой неделе</div><div class="stat-value">${weekRate === null ? '—' : weekRate + '%'}</div></div>
  `;
}

function renderHabits() {
  renderHabitsStats();
  populateHabitFilters();
  habitEmptyState.hidden = habits.length > 0;
  if (habits.length === 0) {
    habitTable.innerHTML = '';
    habitHeatmapEl.innerHTML = '';
    habitGroupsBar.innerHTML = '';
    return;
  }
  if (habitViewMode === 'month') {
    renderHabitHeatmap();
  } else {
    renderHabitGroupsBar();
    renderHabitWeekTable();
  }
}

function renderHabitGroupsBar() {
  const today = isoFromDate(new Date());
  const visible = getFilteredHabits();
  const groups = [...new Set(visible.map(h => h.group).filter(Boolean))];
  habitGroupsBar.innerHTML = groups.length === 0 ? '' : groups.map(g => `
    <button class="group-complete-btn" data-group="${escapeHtml(g)}">✓ Выполнить всё: ${escapeHtml(g)}</button>
  `).join('');
  habitGroupsBar.querySelectorAll('.group-complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      habits.filter(h => h.group === btn.dataset.group).forEach(h => setHabitDone(h, today, true));
      saveHabits(habits);
      renderHabits();
      if (window.renderOverview) window.renderOverview();
    });
  });
}

function renderHabitWeekTable() {
  habitTable.innerHTML = '';
  const list = getFilteredHabits();
  if (list.length === 0) {
    habitTable.innerHTML = '<p class="hint">Нет привычек, подходящих под фильтр.</p>';
    return;
  }
  const days = getWeekDays(habitWeekOffset);
  const first = new Date(days[0] + 'T00:00:00');
  const last = new Date(days[6] + 'T00:00:00');
  habitWeekLabel.textContent = `${first.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} — ${last.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const today = isoFromDate(new Date());

  const table = document.createElement('table');
  table.className = 'habit-grid';

  const thead = document.createElement('thead');
  thead.innerHTML = `<tr>
    <th class="habit-name-col">Привычка</th>
    ${days.map((d, i) => `<th class="${d === today ? 'today-col' : ''}">${WEEKDAY_SHORT[i]}<br><span class="habit-day-num">${new Date(d + 'T00:00:00').getDate()}</span></th>`).join('')}
    <th>Streak</th>
  </tr>`;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  list.forEach((h, i) => {
    const weekDone = days.filter(d => isHabitDoneOn(h, d)).length;
    const weekScheduled = days.filter(d => isScheduledOn(h, d)).length;
    const tr = document.createElement('tr');
    tr.className = h.archived ? 'archived' : '';
    tr.innerHTML = `
      <td class="habit-name-col">
        <div class="step-reorder habit-reorder">
          <button class="habit-move-up" data-id="${h.id}" ${i === 0 ? 'disabled' : ''} title="Выше">▲</button>
          <button class="habit-move-down" data-id="${h.id}" ${i === list.length - 1 ? 'disabled' : ''} title="Ниже">▼</button>
        </div>
        <span class="habit-dot" style="background:${h.color}"></span>
        <span class="habit-name-text">${h.icon ? escapeHtml(h.icon) + ' ' : ''}${escapeHtml(h.title)}</span>
        ${h.group ? `<span class="habit-group-tag">${escapeHtml(h.group)}</span>` : ''}
        <span class="habit-freq">${h.frequency === 'weekly' ? `${weekDone}/${h.target} нед.` : h.frequency === 'custom' ? `${weekDone}/${weekScheduled} по дням` : ''}</span>
      </td>
      ${days.map(d => {
        const scheduled = isScheduledOn(h, d);
        const done = isHabitDoneOn(h, d);
        const note = getHabitNoteOn(h, d);
        if (!scheduled) {
          return `<td class="${d === today ? 'today-col' : ''}"><div class="habit-cell habit-cell-off" title="Не запланировано на этот день">·</div></td>`;
        }
        return `<td class="${d === today ? 'today-col' : ''}">
          <div class="habit-cell">
            <button class="habit-check ${done ? 'checked' : ''}" data-habit="${h.id}" data-date="${d}" style="${done ? `background:${h.color};border-color:${h.color}` : ''}">${done ? '✓' : ''}</button>
            <button class="habit-note-btn ${note ? 'has-note' : ''}" data-habit="${h.id}" data-date="${d}" title="${note ? escapeHtml(note) : 'Добавить заметку'}">📝</button>
          </div>
        </td>`;
      }).join('')}
      <td class="habit-streak">🔥 ${computeStreak(h)}</td>
    `;
    tr.querySelector('.habit-name-text').addEventListener('click', () => openHabitModal(h.id));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  habitTable.appendChild(table);

  habitTable.querySelectorAll('.habit-check').forEach(btn => {
    btn.addEventListener('click', () => toggleHabitDay(btn.dataset.habit, btn.dataset.date));
  });
  habitTable.querySelectorAll('.habit-note-btn').forEach(btn => {
    btn.addEventListener('click', () => openHabitNoteModal(btn.dataset.habit, btn.dataset.date));
  });
  habitTable.querySelectorAll('.habit-move-up').forEach(btn => {
    btn.addEventListener('click', () => moveHabit(btn.dataset.id, -1));
  });
  habitTable.querySelectorAll('.habit-move-down').forEach(btn => {
    btn.addEventListener('click', () => moveHabit(btn.dataset.id, 1));
  });
}

const HABIT_MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function renderHabitHeatmap() {
  habitHeatmapEl.innerHTML = '';
  habitMonthLabel.textContent = `${HABIT_MONTH_NAMES[habitCalMonth]} ${habitCalYear}`;
  const daysInMonth = new Date(habitCalYear, habitCalMonth + 1, 0).getDate();
  const today = isoFromDate(new Date());
  const list = getFilteredHabits();

  if (list.length === 0) {
    habitHeatmapEl.innerHTML = '<p class="hint">Нет привычек, подходящих под фильтр.</p>';
    return;
  }

  list.forEach(h => {
    const block = document.createElement('div');
    block.className = 'heatmap-habit-block';
    const cells = [];
    let doneCount = 0, scheduledCount = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${habitCalYear}-${String(habitCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const scheduled = isScheduledOn(h, iso);
      const done = isHabitDoneOn(h, iso);
      if (scheduled) scheduledCount++;
      if (done) doneCount++;
      const future = iso > today;
      const cls = !scheduled ? 'off' : (done ? 'done' : '');
      cells.push(`<div class="heatmap-cell ${cls} ${iso === today ? 'is-today' : ''}" style="${done ? `background:${h.color}` : ''}" title="${day} ${HABIT_MONTH_NAMES[habitCalMonth]}${!scheduled ? ' — не запланировано' : future ? '' : done ? ' — выполнено' : ' — пропущено'}" data-habit="${h.id}" data-date="${iso}"></div>`);
    }
    block.innerHTML = `
      <div class="heatmap-habit-title"><span class="habit-dot" style="background:${h.color}"></span>${h.icon ? escapeHtml(h.icon) + ' ' : ''}${escapeHtml(h.title)} <span class="hint">(${doneCount}/${scheduledCount})</span> <span class="hint">🔥${computeStreak(h)} · лучший ${computeBestStreak(h)}</span></div>
      <div class="heatmap-grid">${cells.join('')}</div>
    `;
    habitHeatmapEl.appendChild(block);
  });

  habitHeatmapEl.querySelectorAll('.heatmap-cell:not(.off)').forEach(cell => {
    cell.addEventListener('click', () => toggleHabitDay(cell.dataset.habit, cell.dataset.date));
  });
}

// ---------- Notifications: remind about unchecked habits in the evening ----------
function checkHabitReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const hour = new Date().getHours();
  const reminderHour = parseInt(localStorage.getItem('goal-tracker-habit-reminder-hour'), 10) || 19;
  if (hour < reminderHour) return; // only remind in the evening
  const today = isoFromDate(new Date());
  const key = 'habit-reminder-sent-' + today;
  if (localStorage.getItem(key)) return;
  const pending = habits.filter(h => !h.archived && isScheduledOn(h, today) && !isHabitDoneOn(h, today));
  if (pending.length === 0) return;
  new Notification('Не забудьте про привычки', { body: `Сегодня ещё не отмечено: ${pending.map(h => h.title).join(', ')}` });
  localStorage.setItem(key, '1');
}

window.renderHabits = renderHabits;
window.isHabitDoneOn = isHabitDoneOn;
window.toggleHabitDay = toggleHabitDay;
renderHabits();
checkHabitReminders();
setInterval(checkHabitReminders, 30 * 60 * 1000);
