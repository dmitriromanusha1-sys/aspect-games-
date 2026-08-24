// ---------- Storage ----------
const DEBTS_STORAGE_KEY = 'goal-tracker-debts-v1';

function loadDebts() {
  try {
    const raw = localStorage.getItem(DEBTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load debts', e);
    return [];
  }
}

function saveDebts(list) {
  localStorage.setItem(DEBTS_STORAGE_KEY, JSON.stringify(list));
}

let debts = loadDebts();
let editingDebtId = null;

function debtUid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- DOM ----------
const newDebtBtn = document.getElementById('newDebtBtn');
const debtModal = document.getElementById('debtModal');
const debtModalTitle = document.getElementById('debtModalTitle');
const closeDebtModalBtn = document.getElementById('closeDebtModalBtn');
const cancelDebtModalBtn = document.getElementById('cancelDebtModalBtn');
const saveDebtBtn = document.getElementById('saveDebtBtn');
const deleteDebtBtn = document.getElementById('deleteDebtBtn');

const debtType = document.getElementById('debtType');
const debtPerson = document.getElementById('debtPerson');
const debtAmount = document.getElementById('debtAmount');
const debtPaid = document.getElementById('debtPaid');
const debtDueDate = document.getElementById('debtDueDate');
const debtComment = document.getElementById('debtComment');

const debtsList = document.getElementById('debtsList');
const debtsEmptyState = document.getElementById('debtsEmptyState');
const debtsOwedToMe = document.getElementById('debtsOwedToMe');
const debtsIOwe = document.getElementById('debtsIOwe');
const debtPaymentBlock = document.getElementById('debtPaymentBlock');
const debtPaymentAmount = document.getElementById('debtPaymentAmount');
const debtPaymentBtn = document.getElementById('debtPaymentBtn');

newDebtBtn.addEventListener('click', () => openDebtModal(null));
closeDebtModalBtn.addEventListener('click', closeDebtModal);
cancelDebtModalBtn.addEventListener('click', closeDebtModal);
debtModal.addEventListener('click', (e) => { if (e.target === debtModal) closeDebtModal(); });

function openDebtModal(id) {
  editingDebtId = id;
  const existing = id ? debts.find(d => d.id === id) : null;
  debtModalTitle.textContent = existing ? 'Редактировать долг' : 'Новый долг';
  deleteDebtBtn.hidden = !existing;

  debtType.value = existing ? existing.type : 'owe';
  debtPerson.value = existing ? existing.person : '';
  debtAmount.value = existing ? existing.amount : '';
  debtPaid.value = existing ? existing.paid : 0;
  debtDueDate.value = existing ? (existing.dueDate || '') : '';
  debtComment.value = existing ? (existing.comment || '') : '';

  debtPaymentBlock.hidden = !existing;
  debtPaymentAmount.value = '';

  debtModal.hidden = false;
}

// Recording a payment both updates the debt's paid amount and creates a matching
// budget transaction, so debt repayments show up in the budget too.
debtPaymentBtn.addEventListener('click', () => {
  const debt = debts.find(d => d.id === editingDebtId);
  if (!debt) return;
  const payment = parseFloat(debtPaymentAmount.value);
  if (!payment || payment <= 0) { toast('Укажите сумму платежа больше нуля', 'error'); return; }

  debt.paid = Math.min(debt.amount, debt.paid + payment);
  saveDebts(debts);

  transactions.push({
    id: txUid(),
    type: debt.type === 'owe' ? 'expense' : 'income',
    amount: payment,
    category: 'Долги',
    description: `${debt.type === 'owe' ? 'Погашение долга' : 'Возврат долга'}: ${debt.person}`,
    date: todayISO(),
    goalId: '',
    recurring: false,
  });
  saveTx(transactions);

  debtPaid.value = debt.paid;
  debtPaymentAmount.value = '';
  toast(`Платёж ${formatMoney(payment)} добавлен в бюджет`, 'success');
  renderDebts();
  if (window.renderBudget) window.renderBudget();
  if (window.renderOverview) window.renderOverview();
});

function closeDebtModal() {
  debtModal.hidden = true;
  editingDebtId = null;
}

saveDebtBtn.addEventListener('click', () => {
  const amount = parseFloat(debtAmount.value);
  const person = debtPerson.value.trim();
  if (!person) { toast('Укажите контрагента', 'error'); return; }
  if (!amount || amount <= 0) { toast('Укажите сумму больше нуля', 'error'); return; }
  const record = {
    id: editingDebtId || debtUid(),
    type: debtType.value,
    person,
    amount,
    paid: parseFloat(debtPaid.value) || 0,
    dueDate: debtDueDate.value || '',
    comment: debtComment.value.trim(),
  };
  const idx = debts.findIndex(d => d.id === record.id);
  if (idx >= 0) debts[idx] = record;
  else debts.push(record);
  saveDebts(debts);
  toast(idx >= 0 ? 'Долг обновлён' : 'Долг добавлен', 'success');
  closeDebtModal();
  renderDebts();
});

deleteDebtBtn.addEventListener('click', () => {
  debts = debts.filter(d => d.id !== editingDebtId);
  saveDebts(debts);
  closeDebtModal();
  renderDebts();
});

function renderDebts() {
  debtsEmptyState.hidden = debts.length > 0;
  debtsList.innerHTML = '';

  const owedToMe = debts.filter(d => d.type === 'owed').reduce((s, d) => s + (d.amount - d.paid), 0);
  const iOwe = debts.filter(d => d.type === 'owe').reduce((s, d) => s + (d.amount - d.paid), 0);
  debtsOwedToMe.textContent = formatMoney(owedToMe);
  debtsIOwe.textContent = formatMoney(iOwe);

  debts.slice().sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).forEach(d => {
    const remaining = d.amount - d.paid;
    const isPaidOff = remaining <= 0;
    const isOverdue = !isPaidOff && d.dueDate && d.dueDate < todayISO();
    const pct = d.amount > 0 ? Math.min(100, Math.round((d.paid / d.amount) * 100)) : 0;
    const row = document.createElement('div');
    row.className = 'tx-row' + (isPaidOff ? ' archived' : '');
    row.innerHTML = `
      <div class="tx-row-main">
        <span class="tx-sign ${d.type === 'owed' ? 'income' : 'expense'}">${d.type === 'owed' ? '←' : '→'}</span>
        <div>
          <div class="tx-category">${escapeHtml(d.person)} ${d.type === 'owed' ? '(мне должны)' : '(я должен)'} ${isPaidOff ? '<span class="badge badge-status-done">Погашен</span>' : isOverdue ? '<span class="badge badge-status-overdue">Просрочен</span>' : ''}</div>
          ${d.comment ? `<div class="tx-desc">${escapeHtml(d.comment)}</div>` : ''}
          <div class="progress-bar-track" style="max-width:200px;margin-top:4px;"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
      <div class="tx-row-right">
        <div class="tx-amount ${d.type === 'owed' ? 'income' : 'expense'}">${formatMoney(Math.max(remaining, 0))} <span class="hint">ост.</span></div>
        <div class="tx-date">${d.dueDate ? 'до ' + formatDate(d.dueDate) : ''}</div>
      </div>
    `;
    row.addEventListener('click', () => openDebtModal(d.id));
    debtsList.appendChild(row);
  });

  if (window.renderFinanceOverview) window.renderFinanceOverview();
}

window.renderDebts = renderDebts;
renderDebts();
