// ---------- Finance hub: tab switching between Overview / Transactions / Debts / Calculator ----------
const finHubTabs = document.querySelectorAll('#section-finance .fin-hub-tab');
const finTabPanels = document.querySelectorAll('.fin-tab-panel');

function switchFinTab(tab) {
  finHubTabs.forEach(b => b.classList.toggle('active', b.dataset.fintab === tab));
  finTabPanels.forEach(p => p.classList.toggle('active', p.id === 'finPanel' + tab.charAt(0).toUpperCase() + tab.slice(1)));
  if (tab === 'overview') renderFinanceOverview();
}

finHubTabs.forEach(btn => btn.addEventListener('click', () => switchFinTab(btn.dataset.fintab)));

// ---------- Net worth dashboard ----------
function renderFinanceOverview() {
  const cashBalance = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  const iOwe = debts.filter(d => d.type === 'owe').reduce((s, d) => s + Math.max(0, d.amount - d.paid), 0);
  const owedToMe = debts.filter(d => d.type === 'owed').reduce((s, d) => s + Math.max(0, d.amount - d.paid), 0);
  const netWorth = cashBalance + owedToMe - iOwe;

  const allocatedToGoals = goals
    .filter(g => !g.archived && g.savingsGoal && g.savingsGoal.enabled)
    .reduce((s, g) => s + Math.max(0, getGoalSavedAmount(g.id)), 0);

  const overdueDebts = debts.filter(d => {
    const remaining = d.amount - d.paid;
    return remaining > 0 && d.dueDate && d.dueDate < todayISO();
  }).length;

  const curMonth = currentMonthISO();
  const overLimitCount = Object.entries(categoryLimits).filter(([cat, limit]) => {
    const spent = transactions.filter(t => t.type === 'expense' && t.category === cat && t.date.startsWith(curMonth)).reduce((s, t) => s + t.amount, 0);
    return spent > limit;
  }).length;

  document.getElementById('finNetWorthStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Наличный баланс</div><div class="stat-value">${formatMoney(cashBalance)}</div></div>
    <div class="stat-card fin-networth-card"><div class="stat-label">Чистая стоимость</div><div class="stat-value ${netWorth < 0 ? 'negative' : 'positive'}">${formatMoney(netWorth)}</div></div>
    <div class="stat-card"><div class="stat-label">Отложено на цели</div><div class="stat-value">${formatMoney(allocatedToGoals)}</div></div>
    <div class="stat-card"><div class="stat-label">Просрочено долгов</div><div class="stat-value ${overdueDebts > 0 ? 'negative' : ''}">${overdueDebts}</div></div>
    <div class="stat-card"><div class="stat-label">Превышено лимитов</div><div class="stat-value ${overLimitCount > 0 ? 'negative' : ''}">${overLimitCount}</div></div>
  `;

  // Monthly balance chart (reuses the chart helpers defined in analytics.js)
  const months = lastNMonths(12);
  const values = months.map(m => transactions.filter(t => t.date.startsWith(m)).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
  const labels = months.map(m => SHORT_MONTHS[parseInt(m.split('-')[1], 10) - 1]);
  const chartEl = document.getElementById('finOverviewChart');
  if (transactions.length === 0) {
    chartEl.innerHTML = '<p class="hint">Пока нет операций.</p>';
  } else {
    drawBarChart(chartEl, labels, values, { allowNegative: true, formatValue: formatMoney });
  }

  // Financial health notes
  const curMonthTx = transactions.filter(t => t.date.startsWith(curMonth));
  const income = curMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = curMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : null;

  const notes = [];
  if (savingsRate === null) {
    notes.push('Нет доходов за этот месяц — добавьте операцию, чтобы увидеть норму сбережений.');
  } else if (savingsRate < 0) {
    notes.push(`⚠️ Расходы превышают доходы на ${formatMoney(expense - income)} за этот месяц.`);
  } else {
    notes.push(`Вы сохраняете <strong>${savingsRate}%</strong> дохода за этот месяц.`);
  }
  if (iOwe > owedToMe && iOwe > 0) notes.push(`Долгов на вас больше, чем вам должны, на ${formatMoney(iOwe - owedToMe)}.`);
  if (overdueDebts > 0) notes.push(`У вас ${overdueDebts} просроченных долгов — загляните во вкладку «Долги».`);
  if (overLimitCount > 0) notes.push(`Превышено лимитов по категориям: ${overLimitCount}. Проверьте «Операции → Лимиты категорий».`);
  if (notes.length === 1 && savingsRate !== null && savingsRate >= 0 && iOwe <= owedToMe && overdueDebts === 0 && overLimitCount === 0) {
    notes.push('Никаких тревожных сигналов — финансы в порядке. 👍');
  }

  document.getElementById('finHealthBox').innerHTML = notes.map(n => `<p class="hint fin-health-note">${n}</p>`).join('');

  // Recent transactions
  const recentTx = transactions.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const finRecentTx = document.getElementById('finRecentTx');
  finRecentTx.innerHTML = recentTx.length === 0
    ? '<p class="hint">Операций пока нет.</p>'
    : recentTx.map(t => `
        <div class="tx-row" data-id="${t.id}">
          <div class="tx-row-main">
            <span class="tx-sign ${t.type}">${t.type === 'income' ? '+' : '−'}</span>
            <div><div class="tx-category">${escapeHtml(t.category)}</div>${t.description ? `<div class="tx-desc">${escapeHtml(t.description)}</div>` : ''}</div>
          </div>
          <div class="tx-row-right">
            <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
            <div class="tx-date">${formatDate(t.date)}</div>
          </div>
        </div>
      `).join('');
  finRecentTx.querySelectorAll('.tx-row').forEach(row => {
    row.addEventListener('click', () => { switchFinTab('transactions'); openTxModal(row.dataset.id); });
  });

  // Debts summary (top 5 by remaining amount)
  const debtsSummary = debts
    .map(d => ({ ...d, remaining: d.amount - d.paid }))
    .filter(d => d.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 5);
  const finDebtsSummaryList = document.getElementById('finDebtsSummaryList');
  finDebtsSummaryList.innerHTML = debtsSummary.length === 0
    ? '<p class="hint">Активных долгов нет.</p>'
    : debtsSummary.map(d => `
        <div class="tx-row" data-id="${d.id}">
          <div class="tx-row-main">
            <span class="tx-sign ${d.type === 'owed' ? 'income' : 'expense'}">${d.type === 'owed' ? '←' : '→'}</span>
            <div class="tx-category">${escapeHtml(d.person)}</div>
          </div>
          <div class="tx-row-right"><div class="tx-amount ${d.type === 'owed' ? 'income' : 'expense'}">${formatMoney(d.remaining)}</div></div>
        </div>
      `).join('');
  finDebtsSummaryList.querySelectorAll('.tx-row').forEach(row => {
    row.addEventListener('click', () => { switchFinTab('debts'); openDebtModal(row.dataset.id); });
  });
}

window.renderFinanceOverview = renderFinanceOverview;
window.switchFinTab = switchFinTab;
renderFinanceOverview();
