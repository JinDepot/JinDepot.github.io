// ── Config ───────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL    = 'https://script.google.com/macros/s/AKfycbwh1sZVt_gSfV4Uo5vZAE6DP0mzQ5ssyzaZpi2JRVSENXWLD4jLna04yGcuP7FTq9o/exec';
const APPS_SCRIPT_SECRET = '8aa9e3b8642204f98a98d86f390858f5f6b91f99';
const AUTHORIZED_USER    = 'JinDepot';

// ── Auth state ───────────────────────────────────────────────────────────────
let authenticated = false;

async function verifyPAT(pat) {
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${pat}` }
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.login === AUTHORIZED_USER;
}

async function initAuth() {
  const stored = localStorage.getItem('cr_pat');
  if (stored) {
    const valid = await verifyPAT(stored).catch(() => false);
    if (valid) {
      authenticated = true;
      return;
    }
    localStorage.removeItem('cr_pat');
  }
  showAuthModal();
}

function showAuthModal() {
  document.getElementById('auth-modal').style.display = 'flex';
}

function hideAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

async function submitPAT() {
  const input = document.getElementById('pat-input');
  const error = document.getElementById('auth-error');
  const btn   = document.getElementById('auth-submit');
  const pat   = input.value.trim();

  if (!pat) return;

  btn.disabled = true;
  btn.textContent = '확인 중...';
  error.textContent = '';

  const valid = await verifyPAT(pat).catch(() => false);

  if (valid) {
    localStorage.setItem('cr_pat', pat);
    authenticated = true;
    hideAuthModal();
    // Re-enable draw button if a section is already selected
    if (selectedSection) {
      document.getElementById('draw-btn').disabled = false;
    }
  } else {
    error.textContent = 'JinDepot 계정의 유효한 PAT이 아닙니다.';
    btn.disabled = false;
    btn.textContent = '확인';
    input.value = '';
  }
}

// ── Poisson sampler (Knuth algorithm) ────────────────────────────────────────
function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function draw30() {
  const draws = Array.from({ length: 30 }, () => poissonSample(11.1));
  const average = +(draws.reduce((a, b) => a + b, 0) / 30).toFixed(2);
  return { draws, average };
}

// ── localStorage helpers ──────────────────────────────────────────────────────
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadHistory(i) {
  return JSON.parse(localStorage.getItem(`draws_${i}`) || '[]');
}

function saveHistory(i, history) {
  localStorage.setItem(`draws_${i}`, JSON.stringify(history));
}

// ── Google Sheets sync ────────────────────────────────────────────────────────
function syncToSheet(section, date, draws, average) {
  const syncStatus = document.getElementById('sync-status');
  syncStatus.textContent = '⏳ 구글 시트 저장 중...';
  syncStatus.className = 'sync-status syncing';

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ section, date, draws, average, token: APPS_SCRIPT_SECRET }),
    redirect: 'follow'
  })
    .then(() => {
      syncStatus.textContent = '✓ 구글 시트에 저장됨';
      syncStatus.className = 'sync-status success';
    })
    .catch(() => {
      syncStatus.textContent = '✗ 구글 시트 저장 실패';
      syncStatus.className = 'sync-status error';
    });
}

// ── State ─────────────────────────────────────────────────────────────────────
let selectedSection = null;

// ── UI actions ────────────────────────────────────────────────────────────────
function selectSection(i) {
  selectedSection = i;

  document.querySelectorAll('.section-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === i);
  });
  document.getElementById('selected-label').textContent = `선택된 분반: ${i}`;

  // Only enable draw button if authenticated
  if (authenticated) {
    document.getElementById('draw-btn').disabled = false;
  }

  document.getElementById('cards-section').style.display = 'none';
  renderHistory(i);
}

function runDraw() {
  if (!authenticated || !selectedSection) return;

  const { draws, average } = draw30();
  const history = loadHistory(selectedSection);
  history.push({ date: getToday(), draws, average });
  saveHistory(selectedSection, history);

  renderCards(draws, average, selectedSection);
  renderHistory(selectedSection);
  syncToSheet(selectedSection, getToday(), draws, average);
}

// ── Renderers ─────────────────────────────────────────────────────────────────
function cardColor(value) {
  // Gradient centered on λ=11.1; white at 11, blue below, orange above
  if (value <= 5)   return '#90c8f0';
  if (value === 6)  return '#aad4f5';
  if (value === 7)  return '#c4e1f8';
  if (value === 8)  return '#daeeff';
  if (value === 9)  return '#edf6ff';
  if (value === 10) return '#f7fbff';
  if (value === 11) return '#ffffff';  // mean ≈ 11.1
  if (value === 12) return '#fff8f0';
  if (value === 13) return '#ffecd8';
  if (value === 14) return '#ffdfc0';
  if (value === 15) return '#ffd0a0';
  if (value === 16) return '#ffbc78';
  if (value === 17) return '#ffa550';
  return '#ff8c30';
}

function renderCards(draws, average, i) {
  const grid = document.getElementById('card-grid');
  grid.innerHTML = '';

  draws.forEach((val, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${idx * 40}ms`;
    card.style.backgroundColor = cardColor(val);
    card.innerHTML = `
      <span class="card-index">${idx + 1}</span>
      <span class="card-value">${val}</span>
    `;
    grid.appendChild(card);
  });

  document.getElementById('cards-section-num').textContent = i;
  document.getElementById('avg-display').textContent = average;
  document.getElementById('cards-section').style.display = 'block';
}

function renderHistory(i) {
  const history = loadHistory(i);
  const tbody = document.getElementById('history-body');
  tbody.innerHTML = '';

  if (history.length === 0) {
    document.getElementById('history-section').style.display = 'none';
    return;
  }

  [...history].reverse().forEach((row, idx) => {
    const tr = document.createElement('tr');
    const rowNum = history.length - idx;
    tr.innerHTML = `<td>${rowNum}</td><td>${row.date}</td><td>${row.average}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('history-section-num').textContent = i;
  document.getElementById('history-section').style.display = 'block';
}


// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitPAT();
  });
  initAuth();
});
