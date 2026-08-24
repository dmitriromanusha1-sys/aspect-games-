// ---------- Finance calculator tabs ----------
const fcalcTabBtns = document.querySelectorAll('#section-finance .tab-btn');
const fcalcViews = document.querySelectorAll('.fcalc-view');

fcalcTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    fcalcTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    fcalcViews.forEach(v => v.classList.remove('active'));
    document.querySelector(`.fcalc-view[data-fcalc-view="${btn.dataset.fcalc}"]`).classList.add('active');
  });
});

function fmtMoney(n) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' ₽';
}

// ---------- Savings goal calculator ----------
document.getElementById('sCalcBtn').addEventListener('click', () => {
  const target = parseFloat(document.getElementById('sTarget').value) || 0;
  const current = parseFloat(document.getElementById('sCurrent').value) || 0;
  const months = parseInt(document.getElementById('sMonths').value, 10) || 1;
  const annualRate = parseFloat(document.getElementById('sRate').value) || 0;
  const monthlyRate = annualRate / 100 / 12;

  const resultEl = document.getElementById('sResult');
  const remaining = target - current;

  if (remaining <= 0) {
    resultEl.innerHTML = `<div class="result-box success">Цель уже достигнута! У вас накоплено ${fmtMoney(current)} при цели ${fmtMoney(target)}.</div>`;
    return;
  }

  let monthlyContribution;
  if (monthlyRate === 0) {
    monthlyContribution = remaining / months;
  } else {
    // Future value of annuity: FV = current*(1+r)^n + PMT * (((1+r)^n - 1) / r)
    const growthCurrent = current * Math.pow(1 + monthlyRate, months);
    const neededFromContributions = target - growthCurrent;
    const factor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    monthlyContribution = neededFromContributions / factor;
  }

  if (monthlyContribution <= 0) {
    resultEl.innerHTML = `<div class="result-box success">При такой доходности накопленная сумма сама достигнет цели за ${months} мес. без дополнительных взносов.</div>`;
    return;
  }

  const totalContributed = monthlyContribution * months;
  const totalInterest = target - current - totalContributed;

  resultEl.innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Откладывать в месяц:</span><strong>${fmtMoney(monthlyContribution)}</strong></div>
      <div class="result-row"><span>Всего взносов за срок:</span><strong>${fmtMoney(totalContributed)}</strong></div>
      ${monthlyRate > 0 ? `<div class="result-row"><span>Доход от процентов:</span><strong>${fmtMoney(Math.max(totalInterest, 0))}</strong></div>` : ''}
      <div class="result-row total"><span>Итог к сроку:</span><strong>${fmtMoney(target)}</strong></div>
    </div>
  `;
  document.getElementById('sCreateGoalBtn').hidden = false;
});

// ---------- Create a goal directly from the savings calculation ----------
document.getElementById('sCreateGoalBtn').addEventListener('click', () => {
  const target = parseFloat(document.getElementById('sTarget').value) || 0;
  const months = parseInt(document.getElementById('sMonths').value, 10) || 1;
  if (target <= 0) return;

  const closeDate = new Date();
  closeDate.setMonth(closeDate.getMonth() + months);
  const closeDateISO = closeDate.toISOString().slice(0, 10);

  document.querySelector('.side-nav-btn[data-section="goals"]').click();
  openGoalModal(null);
  document.getElementById('fTitle').value = `Накопить ${fmtMoney(target)}`;
  document.getElementById('fCloseDate').value = closeDateISO;
  document.getElementById('fTerm').value = months <= 3 ? 'short' : months <= 12 ? 'mid' : 'long';
  document.getElementById('fSavingsEnabled').checked = true;
  document.getElementById('fSavingsEnabled').dispatchEvent(new Event('change'));
  document.getElementById('fSavingsTarget').value = target;
});

// ---------- Loan calculator (annuity) ----------
document.getElementById('lCalcBtn').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('lAmount').value) || 0;
  const annualRate = parseFloat(document.getElementById('lRate').value) || 0;
  const months = parseInt(document.getElementById('lMonths').value, 10) || 1;
  const monthlyRate = annualRate / 100 / 12;

  const resultEl = document.getElementById('lResult');

  let payment;
  if (monthlyRate === 0) {
    payment = amount / months;
  } else {
    payment = amount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
  }

  const totalPaid = payment * months;
  const overpayment = totalPaid - amount;

  resultEl.innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Ежемесячный платёж:</span><strong>${fmtMoney(payment)}</strong></div>
      <div class="result-row"><span>Общая сумма выплат:</span><strong>${fmtMoney(totalPaid)}</strong></div>
      <div class="result-row"><span>Переплата по процентам:</span><strong>${fmtMoney(overpayment)}</strong></div>
    </div>
  `;
  document.getElementById('lAddDebtBtn').hidden = false;
});

// ---------- Create a debt directly from the loan calculation ----------
document.getElementById('lAddDebtBtn').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('lAmount').value) || 0;
  if (amount <= 0) return;
  switchFinTab('debts');
  openDebtModal(null);
  document.getElementById('debtType').value = 'owe';
  document.getElementById('debtAmount').value = amount;
  document.getElementById('debtComment').value = 'Кредит (из калькулятора)';
});

// ---------- Deposit calculator ----------
document.getElementById('dCalcBtn').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('dAmount').value) || 0;
  const annualRate = parseFloat(document.getElementById('dRate').value) || 0;
  const months = parseInt(document.getElementById('dMonths').value, 10) || 1;
  const capPerYear = parseInt(document.getElementById('dCapitalization').value, 10) || 1;

  const resultEl = document.getElementById('dResult');

  const periodsTotal = months / (12 / capPerYear);
  const ratePerPeriod = (annualRate / 100) / capPerYear;
  const finalAmount = amount * Math.pow(1 + ratePerPeriod, periodsTotal);
  const profit = finalAmount - amount;

  resultEl.innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Итоговая сумма:</span><strong>${fmtMoney(finalAmount)}</strong></div>
      <div class="result-row"><span>Доход по процентам:</span><strong>${fmtMoney(profit)}</strong></div>
      <div class="result-row total"><span>Эффективная доходность:</span><strong>${((profit / amount) * 100 || 0).toFixed(2)}%</strong></div>
    </div>
  `;
});
