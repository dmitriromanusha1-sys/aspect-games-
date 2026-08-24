// ---------- Global search across all modules ----------
const globalSearchInput = document.getElementById('globalSearch');
const globalSearchResults = document.getElementById('globalSearchResults');

function runGlobalSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results = [];

  goals.forEach(g => {
    if (g.title.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)) {
      results.push({ type: 'Цель', icon: '🎯', label: g.title || '(без названия)', action: () => { document.querySelector('.side-nav-btn[data-section="goals"]').click(); openGoalModal(g.id); } });
    }
    (g.notes || []).forEach(n => {
      if (n.text.toLowerCase().includes(q)) {
        results.push({ type: 'Заметка цели', icon: '📝', label: `${g.title}: ${n.text.slice(0, 40)}`, action: () => { document.querySelector('.side-nav-btn[data-section="goals"]').click(); openGoalModal(g.id); } });
      }
    });
  });

  transactions.forEach(t => {
    if ((t.description || '').toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) {
      results.push({ type: 'Операция', icon: '💰', label: `${t.category}${t.description ? ' — ' + t.description : ''} (${formatMoney(t.amount)})`, action: () => { document.querySelector('.side-nav-btn[data-section="finance"]').click(); switchFinTab('transactions'); openTxModal(t.id); } });
    }
  });

  habits.forEach(h => {
    if (h.title.toLowerCase().includes(q)) {
      results.push({ type: 'Привычка', icon: '✅', label: h.title, action: () => { document.querySelector('.side-nav-btn[data-section="habits"]').click(); openHabitModal(h.id); } });
    }
  });

  debts.forEach(d => {
    if (d.person.toLowerCase().includes(q) || (d.comment || '').toLowerCase().includes(q)) {
      results.push({ type: 'Долг', icon: '🤝', label: `${d.person} (${formatMoney(d.amount)})`, action: () => { document.querySelector('.side-nav-btn[data-section="finance"]').click(); switchFinTab('debts'); openDebtModal(d.id); } });
    }
  });

  return results.slice(0, 20);
}

function renderGlobalSearchResults(query) {
  const results = runGlobalSearch(query);
  if (results.length === 0) {
    globalSearchResults.hidden = query.trim() === '';
    globalSearchResults.innerHTML = query.trim() ? '<div class="search-result-empty">Ничего не найдено</div>' : '';
    return;
  }
  globalSearchResults.hidden = false;
  globalSearchResults.innerHTML = results.map((r, i) => `
    <div class="search-result-item" data-idx="${i}">
      <span>${r.icon}</span>
      <div>
        <div class="search-result-type">${r.type}</div>
        <div class="search-result-label">${escapeHtml(r.label)}</div>
      </div>
    </div>
  `).join('');
  globalSearchResults.querySelectorAll('.search-result-item').forEach((el, i) => {
    el.addEventListener('click', () => {
      results[i].action();
      globalSearchInput.value = '';
      globalSearchResults.hidden = true;
    });
  });
}

globalSearchInput.addEventListener('input', () => renderGlobalSearchResults(globalSearchInput.value));
globalSearchInput.addEventListener('focus', () => { if (globalSearchInput.value.trim()) renderGlobalSearchResults(globalSearchInput.value); });
document.addEventListener('click', (e) => {
  if (!e.target.closest('.sidebar-search')) globalSearchResults.hidden = true;
});

// ---------- Keyboard shortcuts ----------
document.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    globalSearchInput.focus();
    return;
  }

  if (typing) return;

  if (e.key.toLowerCase() === 'n') {
    const activeSection = document.querySelector('.app-section.active');
    if (!activeSection) return;
    if (activeSection.id === 'section-goals') { e.preventDefault(); openGoalModal(null); }
    else if (activeSection.id === 'section-habits') { e.preventDefault(); openHabitModal(null); }
    else if (activeSection.id === 'section-finance') {
      const activeFinTab = document.querySelector('.fin-hub-tab.active')?.dataset.fintab;
      if (activeFinTab === 'transactions') { e.preventDefault(); openTxModal(null); }
      else if (activeFinTab === 'debts') { e.preventDefault(); openDebtModal(null); }
    }
  }

  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(m => m.hidden = true);
    globalSearchResults.hidden = true;
  }
});
