// ── Poisson sampler (Knuth algorithm) ──────────────────────────────────────
function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function draw30() {
  const draws = Array.from({ length: 30 }, () => poissonSample(10));
  const average = +(draws.reduce((a, b) => a + b, 0) / 30).toFixed(2);
  return { draws, average };
}

// ── localStorage helpers ────────────────────────────────────────────────────
function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function loadHistory(i) {
  return JSON.parse(localStorage.getItem(`draws_${i}`) || '[]');
}

function saveHistory(i, history) {
  localStorage.setItem(`draws_${i}`, JSON.stringify(history));
}

// ── State ───────────────────────────────────────────────────────────────────
let selectedSection = null;

// ── UI actions ──────────────────────────────────────────────────────────────
function selectSection(i) {
  selectedSection = i;

  document.querySelectorAll('.section-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === i);
  });
  document.getElementById('selected-label').textContent = `선택된 분반: ${i}`;
  document.getElementById('draw-btn').disabled = false;

  // Hide previous draw panel; show history for this section
  document.getElementById('cards-section').style.display = 'none';
  renderHistory(i);
}

function runDraw() {
  if (!selectedSection) return;

  const { draws, average } = draw30();
  const history = loadHistory(selectedSection);
  history.push({ date: getToday(), draws, average });
  saveHistory(selectedSection, history);

  renderCards(draws, average, selectedSection);
  renderHistory(selectedSection);
}

// ── Renderers ───────────────────────────────────────────────────────────────
function cardColor(value) {
  // Cool tint for low values, warm tint for high values, neutral near λ=10
  if (value <= 5)  return '#ddeeff';   // deep below mean → light blue
  if (value <= 7)  return '#eef4ff';   // below mean → pale blue
  if (value <= 13) return '#ffffff';   // near mean → white
  if (value <= 16) return '#fff4e8';   // above mean → pale orange
  return '#ffe4d0';                    // well above mean → light red-orange
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
  document.getElementById('export-btn').onclick = () => exportCSV(i);
}

function renderHistory(i) {
  const history = loadHistory(i);
  const tbody = document.getElementById('history-body');
  tbody.innerHTML = '';

  if (history.length === 0) {
    document.getElementById('history-section').style.display = 'none';
    return;
  }

  // Most recent first
  [...history].reverse().forEach((row, idx) => {
    const tr = document.createElement('tr');
    const rowNum = history.length - idx;
    tr.innerHTML = `<td>${rowNum}</td><td>${row.date}</td><td>${row.average}</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('history-section-num').textContent = i;
  document.getElementById('history-section').style.display = 'block';
}

// ── CSV export ──────────────────────────────────────────────────────────────
function exportCSV(i) {
  const history = loadHistory(i);
  if (history.length === 0) return;

  const header = ['draw_date', ...Array.from({ length: 30 }, (_, k) => `draw_${k + 1}`), 'average'];
  const rows = history.map(r => [r.date, ...r.draws, r.average]);
  const csv = [header, ...rows].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `f${i}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
