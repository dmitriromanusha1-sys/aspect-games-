// ---------- Tools section: tab switching ----------
const toolTabBtns = document.querySelectorAll('#section-tools .tab-btn');
const toolViews = document.querySelectorAll('.tool-view');

toolTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    toolTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    toolViews.forEach(v => v.classList.remove('active'));
    document.querySelector(`.tool-view[data-tool-view="${btn.dataset.tool}"]`).classList.add('active');
    if (btn.dataset.tool === 'pomodoro' && window.renderPomoHabitOptions) window.renderPomoHabitOptions();
    if (btn.dataset.tool === 'worldclock') renderWorldClock();
  });
});

function toolMoney(n) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n) + ' ₽';
}

// ---------- Search across tool groups ----------
const toolSearchInput = document.getElementById('toolSearch');
toolSearchInput.addEventListener('input', () => {
  const q = toolSearchInput.value.trim().toLowerCase();
  document.querySelectorAll('.tool-group').forEach(group => {
    let anyVisible = false;
    group.querySelectorAll('.tab-btn').forEach(btn => {
      const match = !q || btn.textContent.toLowerCase().includes(q) || group.dataset.group.toLowerCase().includes(q);
      btn.hidden = !match;
      if (match) anyVisible = true;
    });
    group.hidden = !anyVisible;
  });
});

// ---------- Auto-persist tool inputs so values survive switching tabs / reloads ----------
function autoPersistToolInputs() {
  const PREFIX = 'tool-input-';
  const skip = new Set(['pwdResult']); // never persist generated secrets
  document.querySelectorAll('#section-tools .tool-view input[id], #section-tools .tool-view select[id]').forEach(el => {
    if (skip.has(el.id) || el.type === 'file') return;
    const key = PREFIX + el.id;
    if (el.type === 'checkbox') {
      const saved = localStorage.getItem(key);
      if (saved !== null) el.checked = saved === '1';
      el.addEventListener('change', () => localStorage.setItem(key, el.checked ? '1' : '0'));
    } else {
      const saved = localStorage.getItem(key);
      if (saved !== null) el.value = saved;
      el.addEventListener('input', () => localStorage.setItem(key, el.value));
      el.addEventListener('change', () => localStorage.setItem(key, el.value));
    }
  });
}
autoPersistToolInputs();

// ================= BMI =================
document.getElementById('bmiCalcBtn').addEventListener('click', () => {
  const heightCm = parseFloat(document.getElementById('bmiHeight').value) || 0;
  const weight = parseFloat(document.getElementById('bmiWeight').value) || 0;
  const resultEl = document.getElementById('bmiResult');
  if (heightCm <= 0 || weight <= 0) { resultEl.innerHTML = '<div class="result-box">Заполните рост и вес.</div>'; return; }

  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  let category, advice;
  if (bmi < 18.5) { category = 'Недостаточный вес'; advice = 'ниже нормы'; }
  else if (bmi < 25) { category = 'Норма'; advice = 'в пределах нормы'; }
  else if (bmi < 30) { category = 'Избыточный вес'; advice = 'выше нормы'; }
  else { category = 'Ожирение'; advice = 'значительно выше нормы'; }

  const normalMinWeight = 18.5 * heightM * heightM;
  const normalMaxWeight = 24.9 * heightM * heightM;

  resultEl.innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>ИМТ:</span><strong>${bmi.toFixed(1)}</strong></div>
      <div class="result-row"><span>Категория:</span><strong>${category}</strong></div>
      <div class="result-row total"><span>Норма веса при вашем росте:</span><strong>${normalMinWeight.toFixed(1)}–${normalMaxWeight.toFixed(1)} кг</strong></div>
    </div>
    <p class="hint">ИМТ — приблизительный показатель, не учитывает состав тела (мышцы/жир). Не является медицинской рекомендацией.</p>
  `;
});

// ================= Calories / macros =================
document.getElementById('calCalcBtn').addEventListener('click', () => {
  const gender = document.getElementById('calGender').value;
  const age = parseFloat(document.getElementById('calAge').value) || 0;
  const heightCm = parseFloat(document.getElementById('calHeight').value) || 0;
  const weight = parseFloat(document.getElementById('calWeight').value) || 0;
  const activity = parseFloat(document.getElementById('calActivity').value);
  const goal = document.getElementById('calGoal').value;
  const resultEl = document.getElementById('calResult');

  if (!age || !heightCm || !weight) { resultEl.innerHTML = '<div class="result-box">Заполните все поля.</div>'; return; }

  // Mifflin-St Jeor
  let bmr = 10 * weight + 6.25 * heightCm - 5 * age + (gender === 'male' ? 5 : -161);
  let tdee = bmr * activity;
  let target = tdee;
  if (goal === 'lose') target = tdee - 500;
  if (goal === 'gain') target = tdee + 300;

  const proteinG = weight * (goal === 'gain' ? 2 : 1.8);
  const fatG = target * 0.27 / 9;
  const carbsG = (target - proteinG * 4 - fatG * 9) / 4;

  resultEl.innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Базовый метаболизм (BMR):</span><strong>${Math.round(bmr)} ккал</strong></div>
      <div class="result-row"><span>Поддержание (TDEE):</span><strong>${Math.round(tdee)} ккал</strong></div>
      <div class="result-row total"><span>Целевая норма:</span><strong>${Math.round(target)} ккал</strong></div>
      <div class="result-row"><span>Белки:</span><strong>${Math.round(proteinG)} г</strong></div>
      <div class="result-row"><span>Жиры:</span><strong>${Math.round(fatG)} г</strong></div>
      <div class="result-row"><span>Углеводы:</span><strong>${Math.max(0, Math.round(carbsG))} г</strong></div>
    </div>
    <p class="hint">Ориентировочный расчёт по формуле Миффлина-Сан Жеора. Не является медицинской рекомендацией.</p>
  `;
});

// ================= Unit converter =================
const UNIT_DEFS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254 },
  weight: { kg: 1, g: 0.001, mg: 0.000001, ton: 1000, lb: 0.453592, oz: 0.0283495 },
  volume: { l: 1, ml: 0.001, m3: 1000, gallon: 3.78541, pint: 0.473176 },
};
const UNIT_LABELS = {
  m: 'метры', km: 'километры', cm: 'сантиметры', mm: 'миллиметры', mile: 'мили', yard: 'ярды', foot: 'футы', inch: 'дюймы',
  kg: 'килограммы', g: 'граммы', mg: 'миллиграммы', ton: 'тонны', lb: 'фунты', oz: 'унции',
  l: 'литры', ml: 'миллилитры', m3: 'куб. метры', gallon: 'галлоны', pint: 'пинты',
};

function renderUnitConverterBody() {
  const category = document.getElementById('unitCategory').value;
  const body = document.getElementById('unitConverterBody');
  document.getElementById('unitResult').innerHTML = '';

  if (category === 'currency') {
    body.innerHTML = `
      <label>Сумма <input id="curAmount" type="number" min="0" value="100" /></label>
      <label>Курс (1 ед. валюты А = X валюты Б) <input id="curRate" type="number" min="0" step="0.0001" value="1" /></label>
      <label>Название валюты А <input id="curFromName" type="text" value="USD" /></label>
      <label>Название валюты Б <input id="curToName" type="text" value="RUB" /></label>
    `;
    document.getElementById('unitConvertBtn')?.remove();
    const btn = document.createElement('button');
    btn.id = 'unitConvertBtn';
    btn.className = 'primary-btn';
    btn.textContent = 'Конвертировать';
    btn.addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('curAmount').value) || 0;
      const rate = parseFloat(document.getElementById('curRate').value) || 0;
      const fromName = document.getElementById('curFromName').value.trim() || 'A';
      const toName = document.getElementById('curToName').value.trim() || 'B';
      document.getElementById('unitResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>${amount} ${fromName} =</span><strong>${(amount * rate).toLocaleString('ru-RU', { maximumFractionDigits: 4 })} ${toName}</strong></div></div>`;
    });
    body.after(btn);
    return;
  }

  document.getElementById('unitConvertBtn')?.remove();
  const units = Object.keys(UNIT_DEFS[category]);
  body.innerHTML = `
    <label>Значение <input id="unitValue" type="number" min="0" value="1" /></label>
    <label>Из <select id="unitFrom">${units.map(u => `<option value="${u}">${UNIT_LABELS[u]}</option>`).join('')}</select></label>
    <label>В <select id="unitTo">${units.map((u, i) => `<option value="${u}" ${i === 1 ? 'selected' : ''}>${UNIT_LABELS[u]}</option>`).join('')}</select></label>
  `;
  const btn = document.createElement('button');
  btn.id = 'unitConvertBtn';
  btn.className = 'primary-btn';
  btn.textContent = 'Конвертировать';
  btn.addEventListener('click', () => {
    const value = parseFloat(document.getElementById('unitValue').value) || 0;
    const from = document.getElementById('unitFrom').value;
    const to = document.getElementById('unitTo').value;
    const base = value * UNIT_DEFS[category][from];
    const converted = base / UNIT_DEFS[category][to];
    document.getElementById('unitResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>${value} ${UNIT_LABELS[from]} =</span><strong>${converted.toLocaleString('ru-RU', { maximumFractionDigits: 6 })} ${UNIT_LABELS[to]}</strong></div></div>`;
  });
  body.after(btn);
}

document.getElementById('unitCategory').addEventListener('change', renderUnitConverterBody);
renderUnitConverterBody();

// ================= Investment growth =================
document.getElementById('invCalcBtn').addEventListener('click', () => {
  const start = parseFloat(document.getElementById('invStart').value) || 0;
  const monthly = parseFloat(document.getElementById('invMonthly').value) || 0;
  const annualRate = parseFloat(document.getElementById('invRate').value) || 0;
  const years = parseInt(document.getElementById('invYears').value, 10) || 1;
  const monthlyRate = annualRate / 100 / 12;

  let balance = start;
  const yearlyBalances = [balance];
  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + monthlyRate) + monthly;
    if (m % 12 === 0) yearlyBalances.push(balance);
  }

  const totalContributed = start + monthly * years * 12;
  const totalInterest = balance - totalContributed;

  document.getElementById('invResult').innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Внесено всего:</span><strong>${toolMoney(totalContributed)}</strong></div>
      <div class="result-row"><span>Доход от процентов:</span><strong>${toolMoney(Math.max(totalInterest, 0))}</strong></div>
      <div class="result-row total"><span>Итоговый капитал:</span><strong>${toolMoney(balance)}</strong></div>
    </div>
  `;

  const labels = yearlyBalances.map((_, i) => `${i}г`);
  drawLineChart(document.getElementById('invChart'), labels, yearlyBalances, { formatValue: toolMoney });
});

// ================= Tax / NDFL =================
document.getElementById('taxCalcBtn').addEventListener('click', () => {
  const direction = document.getElementById('taxDirection').value;
  const amount = parseFloat(document.getElementById('taxAmount').value) || 0;
  const rate = (parseFloat(document.getElementById('taxRate').value) || 0) / 100;
  const resultEl = document.getElementById('taxResult');

  if (direction === 'grossToNet') {
    const tax = amount * rate;
    const net = amount - tax;
    resultEl.innerHTML = `<div class="result-box"><div class="result-row"><span>Налог:</span><strong>${toolMoney(tax)}</strong></div><div class="result-row total"><span>На руки:</span><strong>${toolMoney(net)}</strong></div></div>`;
  } else {
    const gross = amount / (1 - rate);
    const tax = gross - amount;
    resultEl.innerHTML = `<div class="result-box"><div class="result-row"><span>Налог:</span><strong>${toolMoney(tax)}</strong></div><div class="result-row total"><span>До налога (гросс):</span><strong>${toolMoney(gross)}</strong></div></div>`;
  }
});

// ================= Pomodoro =================
let pomoState = { running: false, phase: 'work', remaining: 25 * 60, intervalId: null };
const pomoTimeEl = document.getElementById('pomoTime');
const pomoPhaseEl = document.getElementById('pomoPhase');
const pomoStartBtn = document.getElementById('pomoStartBtn');
const pomoPauseBtn = document.getElementById('pomoPauseBtn');
const pomoResetBtn = document.getElementById('pomoResetBtn');
const pomoCountEl = document.getElementById('pomoCount');
const pomoWorkInput = document.getElementById('pomoWork');
const pomoBreakInput = document.getElementById('pomoBreak');
const pomoHabitLink = document.getElementById('pomoHabitLink');

function pomoCountKey() { return 'pomodoro-count-' + todayISO(); }
function updatePomoCountDisplay() { pomoCountEl.textContent = localStorage.getItem(pomoCountKey()) || '0'; }
updatePomoCountDisplay();

const POMO_HABIT_LINK_KEY = 'goal-tracker-pomo-habit-link';
function renderPomoHabitOptions() {
  const saved = localStorage.getItem(POMO_HABIT_LINK_KEY) || '';
  const activeHabits = habits.filter(h => !h.archived);
  pomoHabitLink.innerHTML = '<option value="">— не отмечать —</option>' +
    activeHabits.map(h => `<option value="${h.id}">${h.icon ? h.icon + ' ' : ''}${escapeHtml(h.title)}</option>`).join('');
  pomoHabitLink.value = activeHabits.some(h => h.id === saved) ? saved : '';
}
pomoHabitLink.addEventListener('change', () => localStorage.setItem(POMO_HABIT_LINK_KEY, pomoHabitLink.value));
renderPomoHabitOptions();
window.renderPomoHabitOptions = renderPomoHabitOptions;

function pomoRender() {
  const mm = String(Math.floor(pomoState.remaining / 60)).padStart(2, '0');
  const ss = String(pomoState.remaining % 60).padStart(2, '0');
  pomoTimeEl.textContent = `${mm}:${ss}`;
  pomoPhaseEl.textContent = pomoState.phase === 'work' ? 'Работа' : 'Отдых';
}

function pomoTick() {
  pomoState.remaining--;
  if (pomoState.remaining <= 0) {
    if (pomoState.phase === 'work') {
      const count = parseInt(localStorage.getItem(pomoCountKey()) || '0', 10) + 1;
      localStorage.setItem(pomoCountKey(), String(count));
      updatePomoCountDisplay();
      pomoState.phase = 'break';
      pomoState.remaining = (parseInt(pomoBreakInput.value, 10) || 5) * 60;
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Помидор завершён', { body: 'Время отдохнуть 🎉' });

      if (pomoHabitLink.value) {
        const habit = habits.find(h => h.id === pomoHabitLink.value);
        const today = todayISO();
        if (habit && !isHabitDoneOn(habit, today)) {
          setHabitDone(habit, today, true);
          saveHabits(habits);
          if (window.renderHabits) window.renderHabits();
          if (window.renderOverview) window.renderOverview();
          toast(`Привычка «${habit.title}» отмечена выполненной`, 'success');
        }
      } else {
        toast('Помидор завершён 🎉', 'success');
      }
    } else {
      pomoState.phase = 'work';
      pomoState.remaining = (parseInt(pomoWorkInput.value, 10) || 25) * 60;
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Отдых закончен', { body: 'Пора снова поработать 💪' });
    }
  }
  pomoRender();
}

pomoStartBtn.addEventListener('click', () => {
  if (pomoState.running) return;
  pomoState.running = true;
  pomoStartBtn.hidden = true;
  pomoPauseBtn.hidden = false;
  pomoState.intervalId = setInterval(pomoTick, 1000);
});

pomoPauseBtn.addEventListener('click', () => {
  pomoState.running = false;
  pomoStartBtn.hidden = false;
  pomoPauseBtn.hidden = true;
  clearInterval(pomoState.intervalId);
});

pomoResetBtn.addEventListener('click', () => {
  pomoState.running = false;
  clearInterval(pomoState.intervalId);
  pomoStartBtn.hidden = false;
  pomoPauseBtn.hidden = true;
  pomoState.phase = 'work';
  pomoState.remaining = (parseInt(pomoWorkInput.value, 10) || 25) * 60;
  pomoRender();
});

[pomoWorkInput, pomoBreakInput].forEach(inp => inp.addEventListener('change', () => {
  if (!pomoState.running) {
    pomoState.remaining = (pomoState.phase === 'work' ? parseInt(pomoWorkInput.value, 10) || 25 : parseInt(pomoBreakInput.value, 10) || 5) * 60;
    pomoRender();
  }
}));

pomoRender();

// ================= Date calculator =================
document.getElementById('dateCalcBtn').addEventListener('click', () => {
  const a = document.getElementById('dateA').value;
  const b = document.getElementById('dateB').value;
  const resultEl = document.getElementById('dateResult');
  if (!a || !b) { resultEl.innerHTML = '<div class="result-box">Заполните обе даты.</div>'; return; }
  const diffDays = Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  const weeks = Math.floor(Math.abs(diffDays) / 7);
  resultEl.innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Разница:</span><strong>${Math.abs(diffDays)} дн.</strong></div>
      <div class="result-row total"><span>Это примерно:</span><strong>${weeks} нед.</strong></div>
    </div>
  `;
});

// ================= Age calculator =================
document.getElementById('ageCalcBtn').addEventListener('click', () => {
  const birth = document.getElementById('birthDate').value;
  const resultEl = document.getElementById('ageResult');
  if (!birth) { resultEl.innerHTML = '<div class="result-box">Укажите дату рождения.</div>'; return; }
  const birthDate = new Date(birth + 'T00:00:00');
  const today = new Date();
  if (birthDate > today) { resultEl.innerHTML = '<div class="result-box">Дата рождения в будущем.</div>'; return; }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  }
  if (months < 0) { years--; months += 12; }
  const totalDays = Math.floor((today - birthDate) / 86400000);

  const nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (nextBirthday < today) nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  const daysToNext = Math.round((nextBirthday - today) / 86400000);

  resultEl.innerHTML = `
    <div class="result-box">
      <div class="result-row total"><span>Возраст:</span><strong>${years} лет, ${months} мес, ${days} дн.</strong></div>
      <div class="result-row"><span>Всего дней прожито:</span><strong>${totalDays.toLocaleString('ru-RU')}</strong></div>
      <div class="result-row"><span>До следующего дня рождения:</span><strong>${daysToNext === 0 ? 'сегодня! 🎉' : daysToNext + ' дн.'}</strong></div>
    </div>
  `;
});

// ================= Percentage calculator =================
document.getElementById('pctOfCalcBtn').addEventListener('click', () => {
  const a = parseFloat(document.getElementById('pctA').value) || 0;
  const b = parseFloat(document.getElementById('pctB').value) || 0;
  const value = (a / 100) * b;
  document.getElementById('pctOfResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>${a}% от ${b} =</span><strong>${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</strong></div></div>`;
});

document.getElementById('pctShareCalcBtn').addEventListener('click', () => {
  const x = parseFloat(document.getElementById('pctX').value) || 0;
  const y = parseFloat(document.getElementById('pctY').value) || 0;
  const pct = y === 0 ? 0 : (x / y) * 100;
  document.getElementById('pctShareResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>${x} — это</span><strong>${pct.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%</strong><span>от ${y}</span></div></div>`;
});

document.getElementById('pctChangeCalcBtn').addEventListener('click', () => {
  const from = parseFloat(document.getElementById('pctFrom').value) || 0;
  const to = parseFloat(document.getElementById('pctTo').value) || 0;
  const change = from === 0 ? 0 : ((to - from) / from) * 100;
  const sign = change >= 0 ? '+' : '';
  document.getElementById('pctChangeResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>Изменение:</span><strong class="${change >= 0 ? '' : 'negative-text'}">${sign}${change.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%</strong></div></div>`;
});

// ================= Bill splitter =================
document.getElementById('splitCalcBtn').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('splitAmount').value) || 0;
  const tipPct = parseFloat(document.getElementById('splitTip').value) || 0;
  const people = Math.max(1, parseInt(document.getElementById('splitPeople').value, 10) || 1);
  const tip = amount * (tipPct / 100);
  const total = amount + tip;
  const perPerson = total / people;
  document.getElementById('splitResult').innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Чаевые:</span><strong>${toolMoney(tip)}</strong></div>
      <div class="result-row"><span>Итого со счётом:</span><strong>${toolMoney(total)}</strong></div>
      <div class="result-row total"><span>С каждого (из ${people}):</span><strong>${toolMoney(perPerson)}</strong></div>
    </div>
  `;
});

// ================= Stopwatch & countdown timer =================
let stopwatchState = { running: false, elapsedMs: 0, startedAt: 0, intervalId: null };
const stopwatchTimeEl = document.getElementById('stopwatchTime');
const stopwatchStartBtn = document.getElementById('stopwatchStartBtn');
const stopwatchPauseBtn = document.getElementById('stopwatchPauseBtn');
const stopwatchResetBtn = document.getElementById('stopwatchResetBtn');

function formatStopwatch(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function stopwatchTick() {
  stopwatchTimeEl.textContent = formatStopwatch(stopwatchState.elapsedMs + (Date.now() - stopwatchState.startedAt));
}

stopwatchStartBtn.addEventListener('click', () => {
  stopwatchState.running = true;
  stopwatchState.startedAt = Date.now();
  stopwatchStartBtn.hidden = true;
  stopwatchPauseBtn.hidden = false;
  stopwatchState.intervalId = setInterval(stopwatchTick, 250);
});
stopwatchPauseBtn.addEventListener('click', () => {
  stopwatchState.running = false;
  stopwatchState.elapsedMs += Date.now() - stopwatchState.startedAt;
  clearInterval(stopwatchState.intervalId);
  stopwatchStartBtn.hidden = false;
  stopwatchPauseBtn.hidden = true;
});
stopwatchResetBtn.addEventListener('click', () => {
  stopwatchState = { running: false, elapsedMs: 0, startedAt: 0, intervalId: null };
  clearInterval(stopwatchState.intervalId);
  stopwatchStartBtn.hidden = false;
  stopwatchPauseBtn.hidden = true;
  stopwatchTimeEl.textContent = '00:00:00';
});

let countdownIntervalId = null;
document.getElementById('countdownStartBtn').addEventListener('click', () => {
  clearInterval(countdownIntervalId);
  let remaining = (parseInt(document.getElementById('countdownMinutes').value, 10) || 0) * 60;
  if (remaining <= 0) return;
  stopwatchStartBtn.hidden = true;
  stopwatchPauseBtn.hidden = true;
  const render = () => { stopwatchTimeEl.textContent = formatStopwatch(remaining * 1000); };
  render();
  countdownIntervalId = setInterval(() => {
    remaining--;
    render();
    if (remaining <= 0) {
      clearInterval(countdownIntervalId);
      stopwatchStartBtn.hidden = false;
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Время вышло', { body: 'Обратный отсчёт завершён' });
      else toast('Обратный отсчёт завершён', 'success');
    }
  }, 1000);
});

// ================= Color converter =================
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function runColorConvert(hex) {
  if (!/^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(hex)) {
    document.getElementById('colorResult').innerHTML = '<div class="result-box">Некорректный HEX-код.</div>';
    return;
  }
  const normalizedHex = hex.startsWith('#') ? hex : '#' + hex;
  const { r, g, b } = hexToRgb(normalizedHex);
  const { h, s, l } = rgbToHsl(r, g, b);
  document.getElementById('colorPicker').value = normalizedHex.length === 4
    ? '#' + [...normalizedHex.slice(1)].map(c => c + c).join('')
    : normalizedHex;
  document.getElementById('colorResult').innerHTML = `
    <div class="result-box">
      <div class="color-swatch" style="background:${normalizedHex}"></div>
      <div class="result-row"><span>HEX:</span><strong>${normalizedHex.toUpperCase()}</strong></div>
      <div class="result-row"><span>RGB:</span><strong>rgb(${r}, ${g}, ${b})</strong></div>
      <div class="result-row total"><span>HSL:</span><strong>hsl(${h}, ${s}%, ${l}%)</strong></div>
    </div>
  `;
}
document.getElementById('colorConvertBtn').addEventListener('click', () => runColorConvert(document.getElementById('colorHex').value.trim()));
document.getElementById('colorPicker').addEventListener('input', (e) => {
  document.getElementById('colorHex').value = e.target.value;
  runColorConvert(e.target.value);
});

// ================= Text tools =================
const textInputEl = document.getElementById('textInput');
function updateTextStats() {
  const text = textInputEl.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const lines = text ? text.split('\n').length : 0;
  document.getElementById('textStats').innerHTML = `
    <div class="result-box">
      <div class="result-row"><span>Символов:</span><strong>${chars}</strong></div>
      <div class="result-row"><span>Символов без пробелов:</span><strong>${charsNoSpaces}</strong></div>
      <div class="result-row"><span>Слов:</span><strong>${words}</strong></div>
      <div class="result-row total"><span>Строк:</span><strong>${lines}</strong></div>
    </div>
  `;
}
textInputEl.addEventListener('input', updateTextStats);
updateTextStats();

document.getElementById('textUpperBtn').addEventListener('click', () => { textInputEl.value = textInputEl.value.toUpperCase(); updateTextStats(); });
document.getElementById('textLowerBtn').addEventListener('click', () => { textInputEl.value = textInputEl.value.toLowerCase(); updateTextStats(); });
document.getElementById('textCapitalizeBtn').addEventListener('click', () => {
  textInputEl.value = textInputEl.value.replace(/\p{L}+/gu, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  updateTextStats();
});
document.getElementById('textCopyBtn').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(textInputEl.value); toast('Текст скопирован', 'success'); }
  catch (e) { toast('Не удалось скопировать', 'error'); }
});

// ================= Random generator =================
document.getElementById('randNumberBtn').addEventListener('click', () => {
  const min = parseInt(document.getElementById('randMin').value, 10) || 0;
  const max = parseInt(document.getElementById('randMax').value, 10) || 0;
  const lo = Math.min(min, max), hi = Math.max(min, max);
  const value = Math.floor(Math.random() * (hi - lo + 1)) + lo;
  document.getElementById('randResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>Результат:</span><strong>${value}</strong></div></div>`;
});
document.getElementById('randDiceBtn').addEventListener('click', () => {
  const value = Math.floor(Math.random() * 6) + 1;
  document.getElementById('randResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>🎲 Выпало:</span><strong>${value}</strong></div></div>`;
});
document.getElementById('randCoinBtn').addEventListener('click', () => {
  const value = Math.random() < 0.5 ? 'Орёл' : 'Решка';
  document.getElementById('randResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>🪙 Выпало:</span><strong>${value}</strong></div></div>`;
});
document.getElementById('randPickBtn').addEventListener('click', () => {
  const options = document.getElementById('randListInput').value.split('\n').map(s => s.trim()).filter(Boolean);
  if (options.length === 0) { document.getElementById('randPickResult').innerHTML = '<div class="result-box">Добавьте хотя бы один вариант.</div>'; return; }
  const pick = options[Math.floor(Math.random() * options.length)];
  document.getElementById('randPickResult').innerHTML = `<div class="result-box"><div class="result-row total"><span>Выбрано:</span><strong>${escapeHtml(pick)}</strong></div></div>`;
});

// ================= World clock =================
const WORLD_CLOCK_ZONES = [
  { label: 'Москва', tz: 'Europe/Moscow' },
  { label: 'Лондон', tz: 'Europe/London' },
  { label: 'Нью-Йорк', tz: 'America/New_York' },
  { label: 'Дубай', tz: 'Asia/Dubai' },
  { label: 'Токио', tz: 'Asia/Tokyo' },
  { label: 'Алматы', tz: 'Asia/Almaty' },
];
function renderWorldClock() {
  const container = document.getElementById('worldClockList');
  if (!container) return;
  container.innerHTML = WORLD_CLOCK_ZONES.map(z => {
    const time = new Intl.DateTimeFormat('ru-RU', { timeZone: z.tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    const date = new Intl.DateTimeFormat('ru-RU', { timeZone: z.tz, day: '2-digit', month: 'short' }).format(new Date());
    return `<div class="world-clock-item"><div class="world-clock-city">${z.label}</div><div class="world-clock-time">${time}</div><div class="world-clock-date">${date}</div></div>`;
  }).join('');
}
setInterval(() => { if (document.querySelector('.tool-view[data-tool-view="worldclock"]').classList.contains('active')) renderWorldClock(); }, 30000);
renderWorldClock();

// ================= Password generator =================
document.getElementById('pwdGenBtn').addEventListener('click', () => {
  const length = Math.min(64, Math.max(4, parseInt(document.getElementById('pwdLength').value, 10) || 16));
  const useUpper = document.getElementById('pwdUpper').checked;
  const useDigits = document.getElementById('pwdDigits').checked;
  const useSymbols = document.getElementById('pwdSymbols').checked;

  let chars = 'abcdefghijklmnopqrstuvwxyz';
  if (useUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (useDigits) chars += '0123456789';
  if (useSymbols) chars += '!@#$%^&*()-_=+[]{};:,.<>?';

  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  let password = '';
  for (let i = 0; i < length; i++) password += chars[randomValues[i] % chars.length];

  document.getElementById('pwdResult').innerHTML = `
    <div class="result-box">
      <div class="pwd-output" id="pwdOutputText">${escapeHtml(password)}</div>
      <button id="pwdCopyBtn" class="secondary-btn" style="margin-top:8px">Скопировать</button>
    </div>
  `;
  document.getElementById('pwdCopyBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(password);
      document.getElementById('pwdCopyBtn').textContent = 'Скопировано ✓';
      setTimeout(() => { document.getElementById('pwdCopyBtn').textContent = 'Скопировать'; }, 1500);
    } catch (e) {
      alert('Не удалось скопировать автоматически — выделите текст вручную.');
    }
  });
});

// ================= Rule of 72 =================
document.getElementById('r72CalcBtn').addEventListener('click', () => {
  const rate = parseFloat(document.getElementById('r72Rate').value) || 0;
  const resultEl = document.getElementById('r72Result');
  if (rate <= 0) { resultEl.innerHTML = '<div class="result-box">Укажите ставку больше нуля.</div>'; return; }
  const years = 72 / rate;
  resultEl.innerHTML = `<div class="result-box"><div class="result-row total"><span>Капитал удвоится примерно за:</span><strong>${years.toFixed(1)} лет</strong></div></div>`;
});

// ================= Wheel of Life =================
const WHEEL_KEY = 'goal-tracker-wheel-of-life';
const WHEEL_AREAS = ['Здоровье', 'Карьера', 'Финансы', 'Отношения', 'Личностный рост', 'Отдых', 'Окружение', 'Духовность'];

function loadWheel() {
  try {
    const raw = localStorage.getItem(WHEEL_KEY);
    return raw ? JSON.parse(raw) : WHEEL_AREAS.map(() => 5);
  } catch (e) { return WHEEL_AREAS.map(() => 5); }
}

let wheelValues = loadWheel();

function renderWheelSliders() {
  const container = document.getElementById('wheelSliders');
  container.innerHTML = WHEEL_AREAS.map((area, i) => `
    <label class="wheel-slider-row">
      <span>${area}</span>
      <input type="range" min="1" max="10" value="${wheelValues[i]}" data-idx="${i}" />
      <span class="wheel-value">${wheelValues[i]}</span>
      ${wheelValues[i] <= 4 ? `<button type="button" class="quick-goal-btn" data-area="${escapeHtml(area)}" title="Создать цель для этой сферы">🎯</button>` : '<span></span>'}
    </label>
  `).join('');
  container.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener('input', (e) => {
      wheelValues[+e.target.dataset.idx] = +e.target.value;
      localStorage.setItem(WHEEL_KEY, JSON.stringify(wheelValues));
      drawWheelChart();
      renderWheelSliders();
    });
  });
  container.querySelectorAll('.quick-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      quickAddGoal(`Улучшить сферу: ${btn.dataset.area}`, '');
      toast(`Цель для сферы «${btn.dataset.area}» создана`, 'success');
    });
  });
}

function drawWheelChart() {
  const container = document.getElementById('wheelChart');
  const size = 320, center = size / 2, maxR = size / 2 - 40;
  const padX = 60, padY = 20;
  const n = WHEEL_AREAS.length;
  const svg = svgEl('svg', { viewBox: `${-padX} ${-padY} ${size + padX * 2} ${size + padY * 2}`, class: 'chart-svg wheel-svg' });

  for (let ring = 2; ring <= 10; ring += 2) {
    const r = (ring / 10) * maxR;
    const points = Array.from({ length: n }, (_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
    svg.appendChild(svgEl('polygon', { points, fill: 'none', stroke: 'var(--border)', 'stroke-width': 1 }));
  }

  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x2 = center + maxR * Math.cos(angle);
    const y2 = center + maxR * Math.sin(angle);
    svg.appendChild(svgEl('line', { x1: center, y1: center, x2, y2, stroke: 'var(--border)', 'stroke-width': 1 }));
    const lx = center + (maxR + 18) * Math.cos(angle);
    const ly = center + (maxR + 18) * Math.sin(angle);
    const text = svgEl('text', { x: lx, y: ly, 'text-anchor': 'middle', class: 'chart-axis-label wheel-label' });
    text.textContent = WHEEL_AREAS[i];
    svg.appendChild(text);
  }

  const valuePoints = wheelValues.map((v, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (v / 10) * maxR;
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');
  svg.appendChild(svgEl('polygon', { points: valuePoints, fill: 'var(--primary)', 'fill-opacity': 0.35, stroke: 'var(--primary)', 'stroke-width': 2 }));

  container.innerHTML = '';
  container.appendChild(svg);
}

renderWheelSliders();
drawWheelChart();

// ================= SWOT =================
const SWOT_KEY = 'goal-tracker-swot';
function loadSwot() {
  try { return JSON.parse(localStorage.getItem(SWOT_KEY)) || { s: '', w: '', o: '', t: '' }; }
  catch (e) { return { s: '', w: '', o: '', t: '' }; }
}
let swotData = loadSwot();
['S', 'W', 'O', 'T'].forEach(key => {
  const el = document.getElementById('swot' + key);
  el.value = swotData[key.toLowerCase()] || '';
  el.addEventListener('input', () => {
    swotData[key.toLowerCase()] = el.value;
    localStorage.setItem(SWOT_KEY, JSON.stringify(swotData));
  });
});

// ================= Eisenhower matrix =================
const EISEN_KEY = 'goal-tracker-eisenhower';
function loadEisen() {
  try { return JSON.parse(localStorage.getItem(EISEN_KEY)) || []; }
  catch (e) { return []; }
}
function saveEisen() { localStorage.setItem(EISEN_KEY, JSON.stringify(eisenTasks)); }
let eisenTasks = loadEisen();

function renderEisenhower() {
  ['do', 'plan', 'delegate', 'drop'].forEach(quad => {
    const listEl = document.querySelector(`.eisen-list[data-quad="${quad}"]`);
    const tasks = eisenTasks.filter(t => t.quad === quad);
    const canBecomeGoal = quad === 'do' || quad === 'plan';
    listEl.innerHTML = tasks.map(t => `
      <div class="eisen-item ${t.done ? 'done' : ''}">
        <input type="checkbox" ${t.done ? 'checked' : ''} data-id="${t.id}" class="eisen-check" />
        <span>${escapeHtml(t.text)}</span>
        ${canBecomeGoal ? `<button class="eisen-to-goal" data-id="${t.id}" title="Превратить в цель">🎯</button>` : ''}
        <button class="eisen-remove" data-id="${t.id}">✕</button>
      </div>
    `).join('') || '<p class="hint">Пусто</p>';
  });

  document.querySelectorAll('.eisen-check').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const task = eisenTasks.find(t => t.id === e.target.dataset.id);
      if (task) { task.done = e.target.checked; saveEisen(); renderEisenhower(); }
    });
  });
  document.querySelectorAll('.eisen-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      eisenTasks = eisenTasks.filter(t => t.id !== e.target.dataset.id);
      saveEisen();
      renderEisenhower();
    });
  });
  document.querySelectorAll('.eisen-to-goal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const task = eisenTasks.find(t => t.id === e.target.dataset.id);
      if (!task) return;
      quickAddGoal(task.text, '');
      eisenTasks = eisenTasks.filter(t => t.id !== task.id);
      saveEisen();
      renderEisenhower();
      toast('Задача превращена в цель', 'success');
    });
  });
}

document.getElementById('eisenAddBtn').addEventListener('click', () => {
  const text = document.getElementById('eisenTaskText').value.trim();
  if (!text) return;
  eisenTasks.push({ id: txUid(), text, quad: document.getElementById('eisenTaskQuadrant').value, done: false });
  saveEisen();
  document.getElementById('eisenTaskText').value = '';
  renderEisenhower();
});

renderEisenhower();
