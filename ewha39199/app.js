// ── Config ───────────────────────────────────────────────────────────────────
const APPS_SCRIPT_URL    = 'https://script.google.com/macros/s/AKfycbwLetf7VWjQezpHnfi-ezLuHl_r81vUPL6eCO5Yjley86O6ygdAxP4l6CpIFhjJ_XbC/exec';
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

// ── State ─────────────────────────────────────────────────────────────────────
let selectedSection = null;
let displayedDrawDate = null;

// ── UI actions ────────────────────────────────────────────────────────────────
function selectSection(i) {
  selectedSection = i;

  document.querySelectorAll('.section-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === i);
  });
  document.getElementById('selected-label').textContent = `선택된 분반: ${i}`;

  if (authenticated) {
    document.getElementById('draw-btn').disabled = false;
  }

  document.getElementById('cards-section').style.display = 'none';
  renderHistory(i);
  renderFlush(i);
  loadFromSheet(i);
}

async function loadFromSheet(i) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'read', section: i, token: APPS_SCRIPT_SECRET }),
      redirect: 'follow'
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (_) { json = null; }
    if (!json || json.ok === false) return;
    saveHistory(i, json.records);
    if (selectedSection === i) {
      renderHistory(i);
      renderFlush(i);
    }
  } catch (_) {}
}

async function runDraw() {
  if (!authenticated || !selectedSection) return;

  const drawBtn = document.getElementById('draw-btn');
  const syncStatus = document.getElementById('sync-status');
  drawBtn.disabled = true;
  syncStatus.textContent = '⏳ 뽑는 중...';
  syncStatus.className = 'sync-status syncing';

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'draw', section: selectedSection, date: getToday(), token: APPS_SCRIPT_SECRET }),
      redirect: 'follow'
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (_) { json = null; }
    if (!json || json.ok === false) throw new Error(json?.error || 'unknown');

    const { draws, average } = json;
    const history = loadHistory(selectedSection);
    history.push({ date: getToday(), draws, average });
    saveHistory(selectedSection, history);

    renderCards(draws, average, selectedSection);
    renderHistory(selectedSection);
    renderFlush(selectedSection);
    syncStatus.textContent = '✓ 구글 시트에 저장됨';
    syncStatus.className = 'sync-status success';
  } catch (_) {
    syncStatus.textContent = '✗ 뽑기 실패 — 다시 시도하세요';
    syncStatus.className = 'sync-status error';
  } finally {
    drawBtn.disabled = false;
  }
}

// ── Renderers ─────────────────────────────────────────────────────────────────
const PASTEL_COLORS = [
  '#FFB3C1', '#FFDAB9', '#FFFACD', '#B5EAD7', '#C9B1FF',
  '#BAD7F2', '#C8F0C8', '#FFCBA4', '#DDA0DD', '#AED6F1',
  '#FFC8DD', '#BDE0FE', '#CDB4DB', '#FDFFB6', '#B9FBC0'
];

function randomPastel() {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

function renderCards(draws, average, i) {
  const grid = document.getElementById('card-grid');
  grid.innerHTML = '';

  draws.forEach((val, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${idx * 40}ms`;
    card.style.backgroundColor = randomPastel();
    card.innerHTML = `
      <span class="card-index">${idx + 1}</span>
      <span class="card-value">${val.toFixed(2)}</span>
    `;
    grid.appendChild(card);
  });

  document.getElementById('cards-section-num').textContent = i;
  document.getElementById('avg-display').textContent = average.toFixed(2);
  document.getElementById('cards-section').style.display = 'block';
  displayedDrawDate = getToday();
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
    tr.innerHTML = `<td>${rowNum}</td><td>${row.date}</td><td>${Number(row.average).toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('history-section-num').textContent = i;
  document.getElementById('history-section').style.display = 'block';
}


// ── Flush ────────────────────────────────────────────────────────────────────
function renderFlush(i) {
  const history = loadHistory(i);
  const select = document.getElementById('flush-date');
  const btn = document.getElementById('flush-btn');
  const status = document.getElementById('flush-status');

  select.innerHTML = '<option value="">날짜를 선택하세요</option>';
  status.textContent = '';
  btn.disabled = true;

  // Get unique dates (most recent first)
  const dates = [...new Set(history.map(h => h.date))].reverse();
  dates.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });

  document.getElementById('flush-section').style.display = dates.length > 0 ? 'block' : 'none';
}

function onFlushDateChange() {
  const val = document.getElementById('flush-date').value;
  document.getElementById('flush-btn').disabled = !val;
}

function runFlush() {
  if (!selectedSection) return;
  const select = document.getElementById('flush-date');
  const date = select.value;
  if (!date) return;

  if (!confirm(`분반 ${selectedSection}의 "${date}" 기록을 삭제하시겠습니까?`)) return;

  const status = document.getElementById('flush-status');
  const flushBtn = document.getElementById('flush-btn');
  status.textContent = '삭제 중...';
  status.className = 'flush-status syncing';
  flushBtn.disabled = true;

  // Save backup for rollback
  const backup = loadHistory(selectedSection);
  const filtered = backup.filter(h => h.date !== date);
  saveHistory(selectedSection, filtered);
  renderHistory(selectedSection);
  renderFlush(selectedSection);

  // Only hide cards if the flushed date matches the currently displayed draw
  if (displayedDrawDate === date) {
    document.getElementById('cards-section').style.display = 'none';
    displayedDrawDate = null;
  }

  // Remove from Google Sheet
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'flush', section: selectedSection, date: date, token: APPS_SCRIPT_SECRET }),
    redirect: 'follow'
  })
    .then(res => res.text())
    .then(text => {
      try { var json = JSON.parse(text); } catch (_) { json = null; }
      if (json && json.ok === false) throw new Error(json.error || 'unknown');
      status.textContent = '삭제 완료';
      status.className = 'flush-status success';
    })
    .catch(() => {
      // Rollback local data
      saveHistory(selectedSection, backup);
      renderHistory(selectedSection);
      renderFlush(selectedSection);
      status.textContent = '시트 삭제 실패 — 로컬 복원됨';
      status.className = 'flush-status error';
    });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitPAT();
  });
  document.getElementById('flush-date').addEventListener('change', onFlushDateChange);
  initAuth();
});
