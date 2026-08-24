// ---------- Simple inline-SVG charts (no external libraries) ----------
function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

function drawBarChart(container, labels, values, opts) {
  opts = opts || {};
  const w = 640, h = 220, padL = 40, padB = 28, padT = 10, padR = 10;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxVal = Math.max(1, ...values.map(v => Math.abs(v)));
  const zeroY = padT + chartH * (opts.allowNegative ? (Math.max(...values, 0)) / (maxVal * 2 || 1) : 1);

  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart-svg' });
  const barW = chartW / values.length * 0.6;
  const gap = chartW / values.length;

  // baseline
  const baseline = opts.allowNegative ? zeroY : (padT + chartH);
  svg.appendChild(svgEl('line', { x1: padL, y1: baseline, x2: w - padR, y2: baseline, stroke: 'var(--border)', 'stroke-width': 1 }));

  values.forEach((v, i) => {
    const barH = Math.abs(v) / maxVal * (opts.allowNegative ? chartH / 2 : chartH);
    const x = padL + i * gap + (gap - barW) / 2;
    const y = v >= 0 ? baseline - barH : baseline;
    const color = v >= 0 ? (opts.positiveColor || 'var(--success)') : (opts.negativeColor || 'var(--danger)');
    const rect = svgEl('rect', { x, y, width: barW, height: Math.max(barH, 1), fill: color, rx: 3 });
    const title = svgEl('title', {});
    title.textContent = `${labels[i]}: ${opts.formatValue ? opts.formatValue(v) : v}`;
    rect.appendChild(title);
    svg.appendChild(rect);

    if (labels[i] !== undefined) {
      const text = svgEl('text', { x: x + barW / 2, y: h - 8, 'text-anchor': 'middle', class: 'chart-axis-label' });
      text.textContent = labels[i];
      svg.appendChild(text);
    }
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

function drawGroupedBarChart(container, labels, seriesA, seriesB, opts) {
  opts = opts || {};
  const w = 640, h = 220, padL = 40, padB = 28, padT = 10, padR = 10;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxVal = Math.max(1, ...seriesA, ...seriesB);
  const gap = chartW / labels.length;
  const barW = gap * 0.32;

  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart-svg' });
  const baseline = padT + chartH;
  svg.appendChild(svgEl('line', { x1: padL, y1: baseline, x2: w - padR, y2: baseline, stroke: 'var(--border)', 'stroke-width': 1 }));

  labels.forEach((label, i) => {
    const groupX = padL + i * gap + gap / 2;
    [[seriesA[i], opts.colorA || 'var(--success)', -1], [seriesB[i], opts.colorB || 'var(--danger)', 1]].forEach(([v, color, dir]) => {
      const barH = (v / maxVal) * chartH;
      const x = groupX + dir * (barW * 0.55);
      const rect = svgEl('rect', { x: dir < 0 ? x - barW : x, y: baseline - barH, width: barW, height: Math.max(barH, 1), fill: color, rx: 2 });
      const title = svgEl('title', {});
      title.textContent = `${label}: ${opts.formatValue ? opts.formatValue(v) : v}`;
      rect.appendChild(title);
      svg.appendChild(rect);
    });
    const text = svgEl('text', { x: groupX, y: h - 8, 'text-anchor': 'middle', class: 'chart-axis-label' });
    text.textContent = label;
    svg.appendChild(text);
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

function drawLineChart(container, labels, values, opts) {
  opts = opts || {};
  const w = 640, h = 220, padL = 34, padB = 28, padT = 14, padR = 14;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;
  const maxVal = Math.max(1, ...values);
  const stepX = values.length > 1 ? chartW / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = padL + i * stepX;
    const y = padT + chartH - (v / maxVal) * chartH;
    return [x, y];
  });

  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart-svg' });
  svg.appendChild(svgEl('line', { x1: padL, y1: padT + chartH, x2: w - padR, y2: padT + chartH, stroke: 'var(--border)', 'stroke-width': 1 }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  svg.appendChild(svgEl('path', { d: pathD, fill: 'none', stroke: opts.color || 'var(--primary)', 'stroke-width': 2.5 }));

  points.forEach(([x, y], i) => {
    const circle = svgEl('circle', { cx: x, cy: y, r: 3.5, fill: opts.color || 'var(--primary)' });
    const title = svgEl('title', {});
    title.textContent = `${labels[i]}: ${opts.formatValue ? opts.formatValue(values[i]) : values[i]}`;
    circle.appendChild(title);
    svg.appendChild(circle);

    if (labels[i] !== undefined) {
      const text = svgEl('text', { x, y: h - 8, 'text-anchor': 'middle', class: 'chart-axis-label' });
      text.textContent = labels[i];
      svg.appendChild(text);
    }
  });

  container.innerHTML = '';
  container.appendChild(svg);
}

// ---------- Data preparation ----------
function lastNMonths(n) {
  const result = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    result.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

const SHORT_MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

let balanceRangeMonths = 12;

function renderMonthlyBalanceChart() {
  const months = lastNMonths(balanceRangeMonths);
  const values = months.map(m => transactions.filter(t => t.date.startsWith(m)).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0));
  const labels = months.map(m => SHORT_MONTHS[parseInt(m.split('-')[1], 10) - 1]);
  const container = document.getElementById('chartMonthlyBalance');
  if (transactions.length === 0) {
    container.innerHTML = '<p class="hint">Пока нет операций.</p>';
    return;
  }
  drawBarChart(container, labels, values, { allowNegative: true, formatValue: formatMoney });
}

document.querySelectorAll('#balanceRangePicker .range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#balanceRangePicker .range-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    balanceRangeMonths = +btn.dataset.range;
    renderMonthlyBalanceChart();
  });
});

function renderIncomeExpenseChart() {
  const months = lastNMonths(6);
  const labels = months.map(m => SHORT_MONTHS[parseInt(m.split('-')[1], 10) - 1]);
  const income = months.map(m => transactions.filter(t => t.type === 'income' && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0));
  const expense = months.map(m => transactions.filter(t => t.type === 'expense' && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0));
  const container = document.getElementById('chartIncomeExpense');
  if (transactions.length === 0) {
    container.innerHTML = '<p class="hint">Пока нет операций.</p>';
    return;
  }
  drawGroupedBarChart(container, labels, income, expense, { formatValue: formatMoney });
}

function renderTopCategoriesChart() {
  const container = document.getElementById('chartTopCategories');
  const months = lastNMonths(6);
  const byCategory = {};
  transactions.filter(t => t.type === 'expense' && months.some(m => t.date.startsWith(m))).forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (entries.length === 0) {
    container.innerHTML = '<p class="hint">Нет расходов за последние 6 месяцев.</p>';
    return;
  }
  const maxVal = entries[0][1];
  container.innerHTML = entries.map(([cat, val]) => `
    <div class="cat-bar-row">
      <div class="cat-bar-label">${escapeHtml(cat)}</div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(val / maxVal * 100)}%;background:var(--danger)"></div></div>
      <div class="cat-bar-value">${formatMoney(val)}</div>
    </div>
  `).join('');
}

function renderHabitTrendChart() {
  const container = document.getElementById('chartHabitTrend');
  const activeHabits = habits.filter(h => !h.archived);
  if (activeHabits.length === 0) {
    container.innerHTML = '<p class="hint">Пока нет привычек.</p>';
    return;
  }
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    weeks.push(getWeekDays(-i));
  }
  const labels = weeks.map((days) => {
    const d = new Date(days[0] + 'T00:00:00');
    return `${d.getDate()}.${d.getMonth() + 1}`;
  });
  const values = weeks.map(days => {
    let scheduled = 0, done = 0;
    days.forEach(d => activeHabits.forEach(h => {
      if (isScheduledOn(h, d)) { scheduled++; if (isHabitDoneOn(h, d)) done++; }
    }));
    return scheduled ? Math.round((done / scheduled) * 100) : 0;
  });
  drawLineChart(container, labels, values, { formatValue: (v) => `${v}%` });
}

function renderSavingsGoalsChart() {
  const container = document.getElementById('chartSavingsGoals');
  const withSavings = goals.filter(g => !g.archived && g.savingsGoal && g.savingsGoal.enabled && g.savingsGoal.target > 0);
  if (withSavings.length === 0) {
    container.innerHTML = '<p class="hint">Нет целей с отслеживанием накоплений. Включите его во вкладке «Связи» цели.</p>';
    return;
  }
  container.innerHTML = withSavings.map(g => {
    const saved = getGoalSavedAmount(g.id);
    const pct = Math.min(100, Math.max(0, Math.round((saved / g.savingsGoal.target) * 100)));
    return `
      <div class="cat-bar-row">
        <div class="cat-bar-label">${escapeHtml(g.title)}</div>
        <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${pct}%"></div></div>
        <div class="cat-bar-value">${pct}% (${formatMoney(saved)} / ${formatMoney(g.savingsGoal.target)})</div>
      </div>
    `;
  }).join('');
}

function renderHabitsLeaderboard() {
  const container = document.getElementById('habitsLeaderboard');
  const active = habits.filter(h => !h.archived);
  if (active.length === 0) {
    container.innerHTML = '<p class="hint">Пока нет привычек.</p>';
    return;
  }
  const rows = active
    .map(h => ({ h, streak: computeStreak(h), best: computeBestStreak(h), rate: completionRate(h, 30) }))
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1));

  container.innerHTML = `
    <table class="leaderboard-table">
      <thead><tr><th>Привычка</th><th>Стрик</th><th>Лучший</th><th>Выполнение 30д</th></tr></thead>
      <tbody>
        ${rows.map(({ h, streak, best, rate }) => `
          <tr>
            <td class="leaderboard-name"><span class="habit-dot" style="background:${h.color}"></span>${h.icon ? escapeHtml(h.icon) + ' ' : ''}${escapeHtml(h.title)}</td>
            <td>🔥 ${streak}</td>
            <td>${best}</td>
            <td>
              <div class="cat-bar-row leaderboard-rate-row">
                <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${rate ?? 0}%"></div></div>
                <div class="cat-bar-value">${rate === null ? '—' : rate + '%'}</div>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderGoalsBreakdownCharts() {
  const active = goals.filter(g => !g.archived);
  const priorityContainer = document.getElementById('chartGoalsPriority');
  const termContainer = document.getElementById('chartGoalsTerm');

  if (active.length === 0) {
    priorityContainer.innerHTML = '<p class="hint">Пока нет целей.</p>';
    termContainer.innerHTML = '<p class="hint">Пока нет целей.</p>';
    return;
  }

  const byPriority = { high: 0, medium: 0, low: 0 };
  active.forEach(g => { byPriority[g.priority || 'medium']++; });
  const priorityMax = Math.max(1, ...Object.values(byPriority));
  const priorityLabels = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };
  const priorityColors = { high: 'var(--danger)', medium: 'var(--long)', low: 'var(--text-muted)' };
  priorityContainer.innerHTML = Object.entries(byPriority).map(([k, v]) => `
    <div class="cat-bar-row">
      <div class="cat-bar-label">${priorityLabels[k]}</div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(v / priorityMax * 100)}%;background:${priorityColors[k]}"></div></div>
      <div class="cat-bar-value">${v}</div>
    </div>
  `).join('');

  const byTerm = { short: 0, mid: 0, long: 0 };
  active.forEach(g => { byTerm[g.term]++; });
  const termMax = Math.max(1, ...Object.values(byTerm));
  const termLabels2 = { short: 'Краткосрочная', mid: 'Среднесрочная', long: 'Долгосрочная' };
  const termColors = { short: 'var(--short)', mid: 'var(--mid)', long: 'var(--long)' };
  termContainer.innerHTML = Object.entries(byTerm).map(([k, v]) => `
    <div class="cat-bar-row">
      <div class="cat-bar-label">${termLabels2[k]}</div>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${(v / termMax * 100)}%;background:${termColors[k]}"></div></div>
      <div class="cat-bar-value">${v}</div>
    </div>
  `).join('');
}

// ---------- KPI summary ----------
function renderAnalyticsKpis() {
  const months6 = lastNMonths(6);
  const totalExpense6 = transactions.filter(t => t.type === 'expense' && months6.some(m => t.date.startsWith(m))).reduce((s, t) => s + t.amount, 0);
  const avgMonthlyExpense = Math.round(totalExpense6 / 6);

  const byCategory = {};
  transactions.filter(t => t.type === 'expense' && months6.some(m => t.date.startsWith(m))).forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const topCategoryEntry = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const activeHabits = habits.filter(h => !h.archived);
  const mostConsistent = activeHabits
    .map(h => ({ h, rate: completionRate(h, 30) }))
    .filter(x => x.rate !== null)
    .sort((a, b) => b.rate - a.rate)[0];

  const onTimeRate = goalsClosedOnTimeRate();

  document.getElementById('analyticsKpiStats').innerHTML = `
    <div class="stat-card"><div class="stat-label">Средний расход/мес (6 мес)</div><div class="stat-value">${formatMoney(avgMonthlyExpense)}</div></div>
    <div class="stat-card"><div class="stat-label">Топ категория расходов</div><div class="stat-value fin-kpi-text">${topCategoryEntry ? escapeHtml(topCategoryEntry[0]) : '—'}</div></div>
    <div class="stat-card"><div class="stat-label">Самая стабильная привычка</div><div class="stat-value fin-kpi-text">${mostConsistent ? (mostConsistent.h.icon ? mostConsistent.h.icon + ' ' : '') + escapeHtml(mostConsistent.h.title) : '—'}</div></div>
    <div class="stat-card"><div class="stat-label">Цели закрыты в срок</div><div class="stat-value">${onTimeRate === null ? '—' : onTimeRate + '%'}</div></div>
  `;
}

// ---------- Export report ----------
document.getElementById('exportReportBtn').addEventListener('click', () => {
  const lines = [];
  lines.push('ОТЧЁТ — Личный трекер', `Сформирован: ${new Date().toLocaleString('ru-RU')}`, '');

  lines.push('=== БЮДЖЕТ (последние 6 месяцев) ===');
  lastNMonths(6).forEach(m => {
    const monthTx = transactions.filter(t => t.date.startsWith(m));
    const inc = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    lines.push(`${m}: доход ${formatMoney(inc)}, расход ${formatMoney(exp)}, баланс ${formatMoney(inc - exp)}`);
  });
  lines.push('');

  lines.push('=== ТОП КАТЕГОРИЙ РАСХОДОВ (6 мес) ===');
  const byCategory = {};
  const months6 = lastNMonths(6);
  transactions.filter(t => t.type === 'expense' && months6.some(m => t.date.startsWith(m))).forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  Object.entries(byCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, val]) => lines.push(`${cat}: ${formatMoney(val)}`));
  lines.push('');

  lines.push('=== ДОЛГИ ===');
  lines.push(`Мне должны: ${formatMoney(debts.filter(d => d.type === 'owed').reduce((s, d) => s + Math.max(0, d.amount - d.paid), 0))}`);
  lines.push(`Я должен: ${formatMoney(debts.filter(d => d.type === 'owe').reduce((s, d) => s + Math.max(0, d.amount - d.paid), 0))}`);
  lines.push('');

  lines.push('=== ЦЕЛИ ===');
  const activeGoals = goals.filter(g => !g.archived);
  lines.push(`Всего активных: ${activeGoals.length}`);
  lines.push(`Закрыто в срок: ${goalsClosedOnTimeRate() ?? '—'}%`);
  activeGoals.forEach(g => lines.push(`- [${statusLabel(computeStatus(g))}] ${g.title} (${termLabel(g.term)}, приоритет: ${priorityLabel(g.priority)})`));
  lines.push('');

  lines.push('=== ПРИВЫЧКИ ===');
  habits.filter(h => !h.archived).forEach(h => {
    lines.push(`- ${h.title}: текущий стрик ${computeStreak(h)}, лучший ${computeBestStreak(h)}, выполнение 30д ${completionRate(h, 30) ?? '—'}%`);
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finance-report-${todayISO()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Отчёт скачан', 'success');
});

// ---------- Yearly report ----------
const reportYearSelect = document.getElementById('reportYearSelect');

function populateReportYears() {
  const years = new Set([new Date().getFullYear()]);
  goals.forEach(g => { if (g.createdAt) years.add(new Date(g.createdAt).getFullYear()); });
  transactions.forEach(t => years.add(parseInt(t.date.slice(0, 4), 10)));
  const sorted = [...years].sort((a, b) => b - a);
  const prev = reportYearSelect.value;
  reportYearSelect.innerHTML = sorted.map(y => `<option value="${y}">${y}</option>`).join('');
  reportYearSelect.value = sorted.includes(+prev) ? prev : String(new Date().getFullYear());
}

function renderYearlyReport() {
  const year = reportYearSelect.value || String(new Date().getFullYear());
  const el = document.getElementById('yearlyReport');

  const goalsCreated = goals.filter(g => g.createdAt && new Date(g.createdAt).getFullYear() === +year).length;
  const goalsClosed = goals.filter(g => g.closedAt && new Date(g.closedAt).getFullYear() === +year).length;

  const monthsOfYear = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const monthNets = monthsOfYear.map(m => ({
    m,
    net: transactions.filter(t => t.date.startsWith(m)).reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0),
  })).filter(x => transactions.some(t => t.date.startsWith(x.m)));

  let best = null, worst = null;
  monthNets.forEach(x => {
    if (!best || x.net > best.net) best = x;
    if (!worst || x.net < worst.net) worst = x;
  });

  el.innerHTML = `
    <div class="stat-card"><div class="stat-label">Целей создано</div><div class="stat-value">${goalsCreated}</div></div>
    <div class="stat-card"><div class="stat-label">Целей закрыто</div><div class="stat-value">${goalsClosed}</div></div>
    <div class="stat-card"><div class="stat-label">Лучший месяц (бюджет)</div><div class="stat-value">${best ? SHORT_MONTHS[+best.m.split('-')[1] - 1] : '—'}</div></div>
    <div class="stat-card"><div class="stat-label">Худший месяц (бюджет)</div><div class="stat-value">${worst ? SHORT_MONTHS[+worst.m.split('-')[1] - 1] : '—'}</div></div>
  `;
}

reportYearSelect.addEventListener('change', renderYearlyReport);

function renderAnalytics() {
  renderAnalyticsKpis();
  populateReportYears();
  renderMonthlyBalanceChart();
  renderIncomeExpenseChart();
  renderTopCategoriesChart();
  renderHabitTrendChart();
  renderSavingsGoalsChart();
  renderHabitsLeaderboard();
  renderGoalsBreakdownCharts();
  renderYearlyReport();
}

window.renderAnalytics = renderAnalytics;
renderAnalytics();
