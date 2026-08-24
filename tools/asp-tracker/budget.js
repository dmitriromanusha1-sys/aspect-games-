// ---------- Storage ----------
const TX_STORAGE_KEY = 'goal-tracker-transactions-v1';
const LIMITS_STORAGE_KEY = 'goal-tracker-limits-v1';

function loadTx() {
  try {
    const raw = localStorage.getItem(TX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load transactions', e);
    return [];
  }
}

function saveTx(list) {
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(list));
}

function loadLimits() {
  try {
    const raw = localStorage.getItem(LIMITS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveLimits(limits) {
  localStorage.setItem(LIMITS_STORAGE_KEY, JSON.stringify(limits));
}

let transactions = loadTx();
let categoryLimits = loadLimits(); // { categoryName: monthlyLimitAmount }
let editingTxId = null;

function txUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatMoney(n) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' ₽';
}

function currentMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---------- Recurring transactions ----------
// A transaction with recurring:true acts as a template. On load, generate any
// missing monthly occurrences (as regular, non-recurring copies) up to today.
function generateRecurringOccurrences() {
  const today = todayISO();
  const templates = transactions.filter(t => t.recurring);
  let changed = false;

  templates.forEach(tpl => {
    let cursor = new Date(tpl.date + 'T00:00:00');
    cursor.setMonth(cursor.getMonth() + 1);
    while (isoFromLocalDate(cursor) <= today) {
      const occurDate = isoFromLocalDate(cursor);
      const exists = transactions.some(t => t.recurringSourceId === tpl.id && t.date === occurDate);
      if (!exists) {
        transactions.push({
          id: txUid(),
          type: tpl.type,
          amount: tpl.amount,
          category: tpl.category,
          description: tpl.description,
          date: occurDate,
          goalId: tpl.goalId || '',
          recurring: false,
          recurringSourceId: tpl.id,
        });
        changed = true;
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  });

  if (changed) saveTx(transactions);
}

function isoFromLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO() {
  return isoFromLocalDate(new Date());
}

// ---------- DOM ----------
const newTxBtn = document.getElementById('newTxBtn');
const txModal = document.getElementById('txModal');
const txModalTitle = document.getElementById('txModalTitle');
const closeTxModalBtn = document.getElementById('closeTxModalBtn');
const cancelTxModalBtn = document.getElementById('cancelTxModalBtn');
const saveTxBtn = document.getElementById('saveTxBtn');
const deleteTxBtn = document.getElementById('deleteTxBtn');

const txType = document.getElementById('txType');
const txAmount = document.getElementById('txAmount');
const txCategory = document.getElementById('txCategory');
const txCategoryList = document.getElementById('txCategoryList');
const txDescription = document.getElementById('txDescription');
const txDate = document.getElementById('txDate');
const txGoal = document.getElementById('txGoal');
const txRecurring = document.getElementById('txRecurring');

const txSearch = document.getElementById('txSearch');
const txTypeFilter = document.getElementById('txTypeFilter');
const txCategoryFilter = document.getElementById('txCategoryFilter');
const txMonthFilter = document.getElementById('txMonthFilter');

const txListEl = document.getElementById('txList');
const txEmptyState = document.getElementById('txEmptyState');
const categoryChartEl = document.getElementById('categoryChart');
const budgetBalanceEl = document.getElementById('budgetBalance');
const budgetIncomeEl = document.getElementById('budgetIncome');
const budgetExpenseEl = document.getElementById('budgetExpense');

const exportCsvBtn = document.getElementById('exportCsvBtn');
const manageLimitsBtn = document.getElementById('manageLimitsBtn');
const limitsModal = document.getElementById('limitsModal');
const closeLimitsModalBtn = document.getElementById('closeLimitsModalBtn');
const closeLimitsModalBtn2 = document.getElementById('closeLimitsModalBtn2');
const limitsListEl = document.getElementById('limitsList');
const newLimitCategory = document.getElementById('newLimitCategory');
const newLimitAmount = document.getElementById('newLimitAmount');
const addLimitBtn = document.getElementById('addLimitBtn');

newTxBtn.addEventListener('click', () => openTxModal(null));
closeTxModalBtn.addEventListener('click', closeTxModal);
cancelTxModalBtn.addEventListener('click', closeTxModal);
txModal.addEventListener('click', (e) => { if (e.target === txModal) closeTxModal(); });

[txSearch, txTypeFilter, txCategoryFilter, txMonthFilter].forEach(el => {
  el.addEventListener('input', renderBudget);
  el.addEventListener('change', renderBudget);
});

function populateGoalSelect() {
  const activeGoals = (typeof goals !== 'undefined' ? goals : []).filter(g => !g.archived);
  txGoal.innerHTML = '<option value="">— не привязано —</option>' +
    activeGoals.map(g => `<option value="${g.id}">${escapeHtml(g.title || '(без названия)')}</option>`).join('');
}

function openTxModal(id) {
  editingTxId = id;
  const existing = id ? transactions.find(t => t.id === id) : null;
  txModalTitle.textContent = existing ? 'Редактировать операцию' : 'Новая операция';
  deleteTxBtn.hidden = !existing;

  txType.value = existing ? existing.type : 'expense';
  txAmount.value = existing ? existing.amount : '';
  txCategory.value = existing ? existing.category : '';
  txDescription.value = existing ? existing.description : '';
  txDate.value = existing ? existing.date : todayISO();
  txRecurring.checked = existing ? !!existing.recurring : false;

  populateCategoryDatalist();
  populateGoalSelect();
  txGoal.value = existing ? (existing.goalId || '') : '';

  txModal.hidden = false;
}

function closeTxModal() {
  txModal.hidden = true;
  editingTxId = null;
}

function populateCategoryDatalist() {
  const cats = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort();
  txCategoryList.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
}

saveTxBtn.addEventListener('click', () => {
  const amount = parseFloat(txAmount.value);
  if (!amount || amount <= 0) {
    alert('Укажите сумму больше нуля');
    return;
  }
  if (!txDate.value) {
    alert('Укажите дату');
    return;
  }
  const record = {
    id: editingTxId || txUid(),
    type: txType.value,
    amount,
    category: txCategory.value.trim() || 'Без категории',
    description: txDescription.value.trim(),
    date: txDate.value,
    goalId: txGoal.value || '',
    recurring: txRecurring.checked,
  };
  const idx = transactions.findIndex(t => t.id === record.id);
  const wasNew = idx < 0;
  if (idx >= 0) transactions[idx] = record;
  else transactions.push(record);
  saveTx(transactions);
  generateRecurringOccurrences();
  closeTxModal();
  renderBudget();
  if (window.renderOverview) window.renderOverview();
  toast(wasNew ? 'Операция добавлена' : 'Операция сохранена', 'success');
});

deleteTxBtn.addEventListener('click', () => {
  transactions = transactions.filter(t => t.id !== editingTxId && t.recurringSourceId !== editingTxId);
  saveTx(transactions);
  closeTxModal();
  renderBudget();
});

function getFilteredTx() {
  const q = txSearch.value.trim().toLowerCase();
  const type = txTypeFilter.value;
  const cat = txCategoryFilter.value;
  const month = txMonthFilter.value;

  return transactions.filter(t => {
    if (type && t.type !== type) return false;
    if (cat && t.category !== cat) return false;
    if (month && !t.date.startsWith(month)) return false;
    if (q && !((t.description || '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

function renderBudget() {
  generateRecurringOccurrences();

  // populate category filter
  const cats = [...new Set(transactions.map(t => t.category).filter(Boolean))].sort();
  const prevCat = txCategoryFilter.value;
  txCategoryFilter.innerHTML = '<option value="">Все категории</option>' + cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  txCategoryFilter.value = cats.includes(prevCat) ? prevCat : '';

  const list = getFilteredTx();
  txListEl.innerHTML = '';
  txEmptyState.hidden = list.length > 0;

  list.forEach(t => {
    const row = document.createElement('div');
    row.className = 'tx-row';
    const linkedGoal = t.goalId && typeof goals !== 'undefined' ? goals.find(g => g.id === t.goalId) : null;
    row.innerHTML = `
      <div class="tx-row-main">
        <span class="tx-sign ${t.type}">${t.type === 'income' ? '+' : '−'}</span>
        <div>
          <div class="tx-category">${escapeHtml(t.category)} ${t.recurring ? '<span class="tag-chip">🔁</span>' : ''}</div>
          ${t.description ? `<div class="tx-desc">${escapeHtml(t.description)}</div>` : ''}
          ${linkedGoal ? `<div class="tx-desc">🎯 ${escapeHtml(linkedGoal.title)}</div>` : ''}
        </div>
      </div>
      <div class="tx-row-right">
        <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}</div>
        <div class="tx-date">${formatDate(t.date)}</div>
      </div>
    `;
    row.addEventListener('click', () => openTxModal(t.id));
    txListEl.appendChild(row);
  });

  // Monthly summary (always current calendar month, independent from filters)
  const curMonth = currentMonthISO();
  const monthTx = transactions.filter(t => t.date.startsWith(curMonth));
  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalBalance = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);

  budgetBalanceEl.textContent = formatMoney(totalBalance);
  budgetIncomeEl.textContent = formatMoney(income);
  budgetExpenseEl.textContent = formatMoney(expense);

  // Category breakdown chart (expenses, current month) with limits
  const byCategory = {};
  monthTx.filter(t => t.type === 'expense').forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
  });
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const maxVal = entries.length ? Math.max(...entries.map(([, v]) => v), ...Object.values(categoryLimits)) : 0;

  categoryChartEl.innerHTML = entries.length === 0
    ? '<p class="hint">Нет расходов в этом месяце</p>'
    : entries.map(([cat, val]) => {
        const limit = categoryLimits[cat];
        const overLimit = limit && val > limit;
        return `
        <div class="cat-bar-row">
          <div class="cat-bar-label">${escapeHtml(cat)}${overLimit ? ' ⚠️' : ''}</div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill ${overLimit ? 'over-limit' : ''}" style="width:${maxVal ? (val / maxVal * 100) : 0}%"></div>
            ${limit ? `<div class="cat-bar-limit-mark" style="left:${maxVal ? (limit / maxVal * 100) : 0}%"></div>` : ''}
          </div>
          <div class="cat-bar-value">${formatMoney(val)}${limit ? ` / ${formatMoney(limit)}` : ''}</div>
        </div>
      `;
      }).join('');

  if (window.renderFinanceOverview) window.renderFinanceOverview();
}

// ---------- Category limits modal ----------
manageLimitsBtn.addEventListener('click', () => { renderLimitsList(); limitsModal.hidden = false; });
closeLimitsModalBtn.addEventListener('click', () => { limitsModal.hidden = true; renderBudget(); });
closeLimitsModalBtn2.addEventListener('click', () => { limitsModal.hidden = true; renderBudget(); });
limitsModal.addEventListener('click', (e) => { if (e.target === limitsModal) { limitsModal.hidden = true; renderBudget(); } });

function renderLimitsList() {
  const entries = Object.entries(categoryLimits);
  limitsListEl.innerHTML = entries.length === 0
    ? '<p class="hint">Лимиты пока не заданы.</p>'
    : entries.map(([cat, amount]) => `
        <div class="limit-row">
          <span>${escapeHtml(cat)}</span>
          <span>${formatMoney(amount)}</span>
          <button class="remove-step" data-cat="${escapeHtml(cat)}">✕</button>
        </div>
      `).join('');
  limitsListEl.querySelectorAll('.remove-step').forEach(btn => {
    btn.addEventListener('click', () => {
      delete categoryLimits[btn.dataset.cat];
      saveLimits(categoryLimits);
      renderLimitsList();
    });
  });
}

addLimitBtn.addEventListener('click', () => {
  const cat = newLimitCategory.value.trim();
  const amount = parseFloat(newLimitAmount.value);
  if (!cat || !amount || amount <= 0) {
    alert('Укажите категорию и лимит больше нуля');
    return;
  }
  categoryLimits[cat] = amount;
  saveLimits(categoryLimits);
  newLimitCategory.value = '';
  newLimitAmount.value = '';
  renderLimitsList();
});

// ---------- CSV export ----------
exportCsvBtn.addEventListener('click', () => {
  const header = ['Дата', 'Тип', 'Категория', 'Сумма', 'Описание'];
  const rows = transactions.slice().sort((a, b) => a.date.localeCompare(b.date)).map(t => [
    t.date,
    t.type === 'income' ? 'Доход' : 'Расход',
    t.category,
    t.amount,
    (t.description || '').replace(/"/g, '""'),
  ]);
  const csv = [header, ...rows]
    .map(row => row.map(cell => `"${String(cell)}"`).join(';'))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `budget-${todayISO()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

window.renderBudget = renderBudget;
renderBudget();
