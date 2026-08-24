// ---------- Overview dashboard ----------
const ovActiveGoals = document.getElementById('ovActiveGoals');
const ovOnTimeRate = document.getElementById('ovOnTimeRate');
const ovBalance = document.getElementById('ovBalance');
const ovHabitsToday = document.getElementById('ovHabitsToday');
const ovDeadlines = document.getElementById('ovDeadlines');
const ovHabitsList = document.getElementById('ovHabitsList');

function renderOverview() {
  const activeGoals = goals.filter(g => !g.archived && computeStatus(g) === 'active');
  ovActiveGoals.textContent = activeGoals.length;

  const rate = goalsClosedOnTimeRate();
  ovOnTimeRate.textContent = rate === null ? '—' : `${rate}%`;

  const totalBalance = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  ovBalance.textContent = formatMoney(totalBalance);

  const today = isoFromDate(new Date());
  const activeHabits = habits.filter(h => !h.archived);
  const dueTodayHabits = activeHabits.filter(h => isScheduledOn(h, today));
  const doneToday = dueTodayHabits.filter(h => isHabitDoneOn(h, today)).length;
  ovHabitsToday.textContent = `${doneToday}/${dueTodayHabits.length}`;

  document.getElementById('ovPomoToday').textContent = localStorage.getItem('pomodoro-count-' + today) || '0';
  try {
    const eisenTasks = JSON.parse(localStorage.getItem('goal-tracker-eisenhower')) || [];
    document.getElementById('ovUrgentTasks').textContent = eisenTasks.filter(t => t.quad === 'do' && !t.done).length;
  } catch (e) {
    document.getElementById('ovUrgentTasks').textContent = '0';
  }

  // Upcoming deadlines: active goals sorted by closest deadline, within 30 days or overdue
  const upcoming = goals
    .filter(g => !g.archived && !g.manuallyClosed && g.closeDate)
    .map(g => ({ g, d: daysUntil(g.closeDate) }))
    .filter(x => x.d !== null && x.d <= 30)
    .sort((a, b) => a.d - b.d)
    .slice(0, 8);

  ovDeadlines.innerHTML = upcoming.length === 0
    ? '<p class="hint">Нет целей с приближающимся дедлайном.</p>'
    : upcoming.map(({ g, d }) => `
        <div class="overview-item" data-goal="${g.id}">
          <span class="badge badge-term-${g.term}">${termLabel(g.term)}</span>
          <span class="overview-item-title">${escapeHtml(g.title)}</span>
          <span class="overview-item-meta ${d < 0 ? 'overdue-text' : ''}">${d < 0 ? `Просрочено на ${-d} дн.` : d === 0 ? 'Сегодня' : `через ${d} дн.`}</span>
        </div>
      `).join('');
  ovDeadlines.querySelectorAll('.overview-item').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelector('.side-nav-btn[data-section="goals"]').click();
      openGoalModal(el.dataset.goal);
    });
  });

  ovHabitsList.innerHTML = dueTodayHabits.length === 0
    ? '<p class="hint">На сегодня привычек не запланировано.</p>'
    : dueTodayHabits.map(h => {
        const done = isHabitDoneOn(h, today);
        return `
        <div class="overview-item habit-overview-item">
          <span class="habit-dot" style="background:${h.color}"></span>
          <span class="overview-item-title">${h.icon ? escapeHtml(h.icon) + ' ' : ''}${escapeHtml(h.title)}</span>
          <button class="habit-check ${done ? 'checked' : ''}" data-habit="${h.id}" style="${done ? `background:${h.color};border-color:${h.color}` : ''}">${done ? '✓' : ''}</button>
        </div>
      `;
      }).join('');
  ovHabitsList.querySelectorAll('.habit-check').forEach(btn => {
    btn.addEventListener('click', () => { toggleHabitDay(btn.dataset.habit, today); renderOverview(); });
  });
}

document.querySelectorAll('.stat-card-clickable[data-goto]').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelector(`.side-nav-btn[data-section="${card.dataset.goto}"]`).click();
    if (card.id === 'ovPomoCard') document.querySelector('#section-tools .tab-btn[data-tool="pomodoro"]')?.click();
    if (card.id === 'ovUrgentCard') document.querySelector('#section-tools .tab-btn[data-tool="eisenhower"]')?.click();
  });
});

window.renderOverview = renderOverview;
renderOverview();

// ---------- Quick-add widgets ----------
document.getElementById('qaTxAddBtn').addEventListener('click', () => {
  const type = document.getElementById('qaTxType').value;
  const amount = parseFloat(document.getElementById('qaTxAmount').value);
  const category = document.getElementById('qaTxCategory').value.trim();
  if (!amount || amount <= 0) { alert('Укажите сумму больше нуля'); return; }
  transactions.push({
    id: txUid(),
    type,
    amount,
    category: category || 'Без категории',
    description: '',
    date: todayISO(),
    goalId: '',
    recurring: false,
  });
  saveTx(transactions);
  document.getElementById('qaTxAmount').value = '';
  document.getElementById('qaTxCategory').value = '';
  renderOverview();
  if (window.renderBudget) renderBudget();
});

document.getElementById('qaGoalAddBtn').addEventListener('click', () => {
  const title = document.getElementById('qaGoalTitle').value.trim();
  const deadline = document.getElementById('qaGoalDeadline').value;
  if (!title) { alert('Укажите название цели'); return; }
  quickAddGoal(title, deadline);
  document.getElementById('qaGoalTitle').value = '';
  document.getElementById('qaGoalDeadline').value = '';
  renderOverview();
});

// ---------- Backup reminder banner ----------
const BACKUP_KEY = 'goal-tracker-last-backup';
const BACKUP_DISMISS_KEY = 'goal-tracker-backup-dismiss';

function checkBackupReminder() {
  const banner = document.getElementById('backupBanner');
  const lastBackup = localStorage.getItem(BACKUP_KEY);
  const dismissedOn = localStorage.getItem(BACKUP_DISMISS_KEY);
  const today = todayISO();
  if (dismissedOn === today) { banner.hidden = true; return; }
  const threshold = parseInt(localStorage.getItem('goal-tracker-backup-threshold'), 10) || 7;
  const daysSince = lastBackup ? Math.floor((new Date(today) - new Date(lastBackup)) / 86400000) : Infinity;
  banner.hidden = daysSince < threshold;
}

document.getElementById('backupBannerBtn').addEventListener('click', () => {
  if (window.exportAllData) window.exportAllData();
});
document.getElementById('backupBannerDismiss').addEventListener('click', () => {
  localStorage.setItem(BACKUP_DISMISS_KEY, todayISO());
  document.getElementById('backupBanner').hidden = true;
});

window.checkBackupReminder = checkBackupReminder;
checkBackupReminder();
