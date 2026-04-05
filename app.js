/* ─── config ──────────────────────────────────────────── */
const BASE_BUDGET = 50;

const CATS = [
  { name: 'Nourriture', color: '#34d399', pct: 0.25 },
  { name: 'Loisirs',    color: '#60a5fa', pct: 0.30 },
  { name: 'Matériel',   color: '#f59e0b', pct: 0.30 },
  { name: 'Épargne',    color: '#a3e635', pct: 0.15 },
];

function getCurrentMonthKey() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1);
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr);
  return d.getFullYear() + '-' + (d.getMonth() + 1);
}

function getAlloc(cat) {
  return Math.round(getBudget() * cat.pct * 100) / 100;
}

/* ─── state ───────────────────────────────────────────── */
let expenses = [];
let incomes  = [];
try { expenses = JSON.parse(localStorage.getItem('budget_v4') || '[]'); } catch(e) {}
try { incomes  = JSON.parse(localStorage.getItem('budget_inc') || '[]'); } catch(e) {}

function save() {
  try {
    localStorage.setItem('budget_v4',  JSON.stringify(expenses));
    localStorage.setItem('budget_inc', JSON.stringify(incomes));
  } catch(e) {}
}

function getBudget() {
  const currentMonth = getCurrentMonthKey();
  const extra = incomes
    .filter(i => getMonthKey(i.date) === currentMonth)
    .reduce((a, b) => a + b.amount, 0);

  return BASE_BUDGET + extra;
}

/* ─── utils ───────────────────────────────────────────── */
function fmt(n) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' €';
}

function getTotals() {
  const t = {};
  const currentMonth = getCurrentMonthKey();

  CATS.forEach(c => t[c.name] = 0);

  expenses.forEach(e => {
    if (getMonthKey(e.date) !== currentMonth) return;
    if (t[e.cat] !== undefined) t[e.cat] += e.amount;
  });

  return t;
}

function getMonth() {
  return new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/* ─── chart ───────────────────────────────────────────── */
let chart = null;

function buildChart(totals, BUDGET) {
  const spent  = CATS.map(c => totals[c.name]);
  const remain = CATS.map((c, i) => Math.max(getAlloc(c) - spent[i], 0));
  const totalSpent = spent.reduce((a, b) => a + b, 0);
  const totalLeft  = Math.max(BUDGET - totalSpent, 0);
  const hasSpent   = totalSpent > 0;

  const colors      = CATS.map(c => c.color);
  const lightColors = CATS.map(c => c.color + '30');

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById('donut').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: CATS.map(c => c.name),
      datasets: [
        {
          data: CATS.map(c => getAlloc(c)),
          backgroundColor: hasSpent ? lightColors : colors,
          borderWidth: 0,
          weight: 1,
        },
        ...(hasSpent ? [{
          data: remain,
          backgroundColor: colors,
          borderWidth: 0,
          weight: 0.45,
        }] : []),
      ],
    },
    options: {
      responsive: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1f',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#f0ede8',
          bodyColor: '#6b6a6f',
          padding: 12,
          callbacks: {
            label: ctx => {
              const cat = CATS[ctx.dataIndex];
              return ` ${fmt(totals[cat.name])} / ${fmt(getAlloc(cat))}`;
            }
          }
        }
      },
      animation: { duration: 700, easing: 'easeInOutQuart' },
    }
  });

  document.getElementById('chart-center-val').textContent = fmt(totalLeft);
}

/* ─── render ──────────────────────────────────────────── */
function render() {
  const BUDGET     = getBudget();
  const totals     = getTotals();
  const totalSpent = Object.values(totals).reduce((a, b) => a + b, 0);
  const totalLeft  = Math.max(BUDGET - totalSpent, 0);
  const pct        = Math.min((totalSpent / BUDGET) * 100, 100);

  /* hero */
  const heroEl = document.getElementById('hero-left');
  heroEl.textContent = fmt(totalLeft);
  heroEl.className = 'hero-amount' + (pct >= 100 ? ' danger' : pct >= 75 ? ' warning' : '');

  const barEl = document.getElementById('hero-bar');
  barEl.style.width = pct.toFixed(1) + '%';
  barEl.className = 'hero-bar' + (pct >= 100 ? ' danger' : pct >= 75 ? ' warning' : '');

  document.getElementById('stat-budget').textContent = fmt(BUDGET);
  document.getElementById('stat-spent').textContent  = fmt(totalSpent);
  document.getElementById('stat-saved').textContent  = fmt(totals['Épargne'] || 0);

  /* chart */
  buildChart(totals, BUDGET);

  /* legend */
  const legendEl = document.getElementById('legend');
  legendEl.innerHTML = '';
  CATS.forEach(c => {
    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `
      <div class="legend-dot" style="background:${c.color}"></div>
      <span class="legend-name">${c.name}</span>
      <div class="legend-vals">
        <span class="legend-spent">${fmt(totals[c.name])}</span>
        <span class="legend-alloc">sur ${fmt(getAlloc(c))}</span>
      </div>
    `;
    legendEl.appendChild(li);
  });

  /* envelopes */
  const envEl = document.getElementById('env-grid');
  envEl.innerHTML = '';
  CATS.forEach(c => {
    const s    = totals[c.name];
    const alloc = getAlloc(c);
    const pctC = Math.min((s / alloc) * 100, 100).toFixed(1);
    const left = Math.max(alloc - s, 0);
    const over = s > alloc;
    const card = document.createElement('div');
    card.className = 'env-card';
    card.innerHTML = `
      <div class="env-top">
        <div class="env-icon" style="background:${c.color}"></div>
        <span class="env-name">${c.name}</span>
        <span class="env-amount">${fmt(alloc)}</span>
      </div>
      <div class="env-bar-bg">
        <div class="env-bar" style="background:${over ? '#f87171' : c.color}" data-width="${pctC}"></div>
      </div>
      <div class="env-footer">
        <span>${fmt(s)} dépensé</span>
        <span class="${over ? 'over' : ''}">${over ? '−'+fmt(s - alloc) : fmt(left)+' reste'}</span>
      </div>
    `;
    envEl.appendChild(card);
  });

  /* animate env bars after paint */
  requestAnimationFrame(() => {
    document.querySelectorAll('.env-bar[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  });

  /* history */
  renderHistory();
  renderStats();
}

function renderHistory() {
  const el = document.getElementById('hist-list');
  const currentMonth = getCurrentMonthKey();

  const all = [
    ...expenses
      .filter(e => getMonthKey(e.date) === currentMonth)
      .map(e => ({ ...e, type: 'expense' })),
    ...incomes
      .filter(i => getMonthKey(i.date) === currentMonth)
      .map(i => ({ ...i, type: 'income' })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!all.length) {
    el.innerHTML = '<div class="hist-empty">aucune entrée enregistrée</div>';
    return;
  }

  el.innerHTML = '';

  all.forEach((e, ri) => {
    const isIncome = e.type === 'income';
    const cat = isIncome ? null : CATS.find(c => c.name === e.cat) || CATS[0];
    const color = isIncome ? '#a3e635' : cat.color;

    const realIdx = isIncome
      ? incomes.findIndex(i => i.date === e.date && i.name === e.name)
      : expenses.findIndex(x => x.date === e.date && x.name === e.name);

    const item = document.createElement('div');
    item.className = 'hist-item';
    item.style.animationDelay = (ri * 40) + 'ms';

    item.innerHTML = `
      <div class="hist-dot" style="background:${color}"></div>
      <div class="hist-info">
        <div class="hist-name">${e.name}</div>
        <div class="hist-cat">${isIncome ? 'revenu' : e.cat}</div>
      </div>
      <span class="hist-amount" style="color:${isIncome ? '#a3e635' : ''}">
        ${isIncome ? '+' : '−'}${fmt(e.amount)}
      </span>
      <button class="hist-edit" data-type="${e.type}" data-i="${realIdx}">✎</button>
      <button class="hist-del" data-type="${e.type}" data-i="${realIdx}">×</button>
    `;

    el.appendChild(item);
  });

  // DELETE
  el.querySelectorAll('.hist-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.i;
      if (btn.dataset.type === 'income') incomes.splice(i, 1);
      else expenses.splice(i, 1);
      save();
      render();
    });
  });

  // EDIT
  el.querySelectorAll('.hist-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.i;
      const type = btn.dataset.type;

      const item = type === 'income' ? incomes[i] : expenses[i];

      const newName = prompt('Nom :', item.name);
      if (!newName) return;

      const newAmount = parseFloat(prompt('Montant :', item.amount));
      if (isNaN(newAmount) || newAmount <= 0) return;

      item.name = newName;
      item.amount = newAmount;

      if (type === 'expense') {
        const newCat = prompt('Catégorie :', item.cat);
        if (newCat) item.cat = newCat;
      }

      save();
      render();
    });
  });
}
  
/* ─── form — dépense ──────────────────────────────────── */
function buildSelect() {
  const sel = document.getElementById('dep-cat');
  CATS.forEach(c => {
    const o = document.createElement('option');
    o.value = c.name;
    o.textContent = c.name;
    sel.appendChild(o);
  });
}

document.getElementById('add-btn').addEventListener('click', () => {
  const name   = document.getElementById('dep-name').value.trim();
  const amount = parseFloat(document.getElementById('dep-amount').value);
  const cat    = document.getElementById('dep-cat').value;
  if (!name || isNaN(amount) || amount <= 0) { document.getElementById('dep-name').focus(); return; }
  expenses.push({ name, amount, cat, date: new Date().toISOString() });
  save();
  document.getElementById('dep-name').value   = '';
  document.getElementById('dep-amount').value = '';
  render();
});

['dep-name','dep-amount'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('add-btn').click();
  });
});

/* ─── form — revenu ───────────────────────────────────── */
document.getElementById('inc-btn').addEventListener('click', () => {
  const name   = document.getElementById('inc-name').value.trim();
  const amount = parseFloat(document.getElementById('inc-amount').value);
  if (!name || isNaN(amount) || amount <= 0) { document.getElementById('inc-name').focus(); return; }
  incomes.push({ name, amount, date: new Date().toISOString() });
  save();
  document.getElementById('inc-name').value   = '';
  document.getElementById('inc-amount').value = '';
  render();
});

['inc-name','inc-amount'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('inc-btn').click();
  });
});

/* ─── clear history ───────────────────────────────────── */
document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('Effacer tout l\'historique ?')) return;
  expenses = [];
  incomes  = [];
  save();
  render();
});

/* ─── entrance animations ─────────────────────────────── */
function setupAnimations() {
  const els = document.querySelectorAll('[data-anim="fade-up"]');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => entry.target.classList.add('visible'), +delay);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

function renderStats() {
  const el = document.getElementById('stats');
  const currentMonth = getCurrentMonthKey();

  const monthExpenses = expenses.filter(e => getMonthKey(e.date) === currentMonth);

  if (!monthExpenses.length) {
    el.innerHTML = '<div class="stat-card">aucune donnée</div>';
    return;
  }

  // total
  const total = monthExpenses.reduce((a, b) => a + b.amount, 0);

  // catégorie max
  const byCat = {};
  monthExpenses.forEach(e => {
    byCat[e.cat] = (byCat[e.cat] || 0) + e.amount;
  });

  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  // moyenne par jour
  const days = new Date().getDate();
  const avg = total / days;

  el.innerHTML = `
    <div class="stat-card">
      catégorie principale : <strong>${topCat[0]}</strong> (${fmt(topCat[1])})
    </div>
    <div class="stat-card">
      dépense moyenne / jour : <strong>${fmt(avg)}</strong>
    </div>
    <div class="stat-card">
      total ce mois : <strong>${fmt(total)}</strong>
    </div>
  `;
}
/* ─── init ────────────────────────────────────────────── */
document.getElementById('month-label').textContent = getMonth();
buildSelect();
render();
setupAnimations();

