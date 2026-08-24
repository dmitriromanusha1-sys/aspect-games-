// ---------- Lightweight toast notifications (non-blocking, replaces alert() for success feedback) ----------
let toastContainer;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function toast(message, type) {
  const container = ensureToastContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type || 'default'}`;
  el.textContent = message;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
  }, 2600);
}

window.toast = toast;
