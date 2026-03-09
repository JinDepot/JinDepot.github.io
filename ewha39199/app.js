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

// ── Exponential sampler (inverse CDF, mean parameterization) ─────────────────
function exponentialSample(mean) {
  return -mean * Math.log(Math.random());
}

function draw30() {
  const rawDraws = Array.from({ length: 30 }, () => exponentialSample(11.1));
  const average = rawDraws.reduce((a, b) => a + b, 0) / 30;
  // Store raw values; round only at display time
  return { draws: rawDraws, average };
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

  if (authenticated) {
    document.getElementById('draw-btn').disabled = false;
  }

  document.getElementById('cards-section').style.display = 'none';
  renderHistory(i);
  renderFlush(i);
}

function runDraw() {
  if (!authenticated || !selectedSection) return;

  const { draws, average } = draw30();
  const history = loadHistory(selectedSection);
  history.push({ date: getToday(), draws, average });
  saveHistory(selectedSection, history);

  renderCards(draws, average, selectedSection);
  renderHistory(selectedSection);
  renderFlush(selectedSection);
  syncToSheet(selectedSection, getToday(), draws, average);
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
  status.textContent = '삭제 중...';
  status.className = 'flush-status syncing';

  // Remove from localStorage
  const history = loadHistory(selectedSection);
  const filtered = history.filter(h => h.date !== date);
  saveHistory(selectedSection, filtered);
  renderHistory(selectedSection);
  renderFlush(selectedSection);

  // Hide cards section since flushed data may have been displayed
  document.getElementById('cards-section').style.display = 'none';

  // Remove from Google Sheet
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'flush', section: selectedSection, date: date, token: APPS_SCRIPT_SECRET }),
    redirect: 'follow'
  })
    .then(() => {
      status.textContent = '삭제 완료';
      status.className = 'flush-status success';
    })
    .catch(() => {
      status.textContent = '시트 삭제 실패';
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
