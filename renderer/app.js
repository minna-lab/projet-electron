// app.js — Logique principale de l'interface

const state = {
  user: null, token: null, labs: [],
  currentLab: null, currentGrid: null,
  adminGrid: null, adminCurrentLab: null  // état admin séparé
};

// ---- UTILITAIRES ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-view="${id}"]`);
  if (btn) btn.classList.add('active');
}
function showAdminPanel(id) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-panel="${id}"]`).classList.add('active');
}
function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function diffClass(d) { return d <= 3 ? 'diff-low' : d <= 6 ? 'diff-mid' : 'diff-high'; }
function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function normalizeLab(data) {
  const grid = data.grid;
  const rows = data.rows || grid.length;
  const cols = data.cols || grid[0].length;
  return { grid, rows, cols, start: data.start || {r:0,c:1}, end: data.end || {r:rows-1,c:cols-2} };
}

// ---- TOAST (remplace alert — ne vole pas le focus) ----
function toast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast toast-' + type + ' show';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

// ---- COMPTES (page de connexion) ----
async function refreshAccountsList() {
  const users = await window.api.adminGetUsers();
  const container = document.getElementById('accounts-list');
  if (!users?.length) { container.innerHTML = '<p class="accounts-empty">Aucun compte pour l\'instant...</p>'; return; }
  container.innerHTML = users.map(u => `
    <div class="account-card">
      <div class="account-avatar role-${u.role}">${u.username.charAt(0).toUpperCase()}</div>
      <div class="account-info">
        <div class="account-name">${escapeHtml(u.username)}</div>
        <div class="account-meta">Inscrit le ${formatDate(u.created_at)}</div>
      </div>
      <span class="account-badge role-${u.role}">${u.role === 'admin' ? '⚙️ Admin' : '👤 User'}</span>
    </div>`).join('');
}

// ---- AUTHENTIFICATION ----
async function checkAutoLogin() {
  // Anime la barre de chargement de la splash screen
  const TOTAL_CELLS = 12;
  const statusEl    = document.getElementById('splash-status');
  const steps = [
    { cell: 1,  msg: '🧱 Construction des murs...' },
    { cell: 3,  msg: '🐀 Lâcher des souris dans le labyrinthe...' },
    { cell: 5,  msg: '🗺️ Calcul des chemins sans issue...' },
    { cell: 7,  msg: '🔦 Allumage des torches...' },
    { cell: 9,  msg: '🧩 Derniers pièges en place...' },
    { cell: 11, msg: '🎉 Bonne chance pour sortir !' },
    { cell: 12, msg: '✅ Prêt !' }
  ];

  // Remplit les cases une par une
  function fillCells(upTo, activeIdx) {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      const el = document.getElementById('sc-' + i);
      if (!el) continue;
      el.className = 'splash-cell';
      if (i < upTo)     el.classList.add('filled');
      if (i === activeIdx) el.classList.add('active');
    }
  }

  for (const step of steps) {
    await new Promise(r => setTimeout(r, 380));
    fillCells(step.cell - 1, step.cell - 1);
    if (statusEl) {
      statusEl.style.opacity = '0';
      await new Promise(r => setTimeout(r, 100));
      statusEl.textContent = step.msg;
      statusEl.style.opacity = '1';
    }
  }
  // Rempli tout en doré à la fin
  await new Promise(r => setTimeout(r, 300));
  fillCells(TOTAL_CELLS, -1);
  await new Promise(r => setTimeout(r, 400));

  const token = localStorage.getItem('token');
  if (!token) { await refreshAccountsList(); showScreen('screen-auth'); return; }
  const result = await window.api.verifyToken(token);
  if (result.success) {
    state.user = result.user; state.token = token;
    result.user.role === 'admin' ? onAdminLoginSuccess() : onLoginSuccess();
  } else {
    localStorage.removeItem('token');
    await refreshAccountsList(); showScreen('screen-auth');
  }
}
async function onLoginSuccess() {
  document.getElementById('user-display').textContent = '👤 ' + state.user.username;
  await refreshLabs(); showScreen('screen-app'); showView('dashboard'); updateDashboard();
}
async function onAdminLoginSuccess() {
  document.getElementById('admin-user-display').textContent = '⚙️ ' + state.user.username;
  showScreen('screen-admin-app'); await loadAdminView();
}

document.getElementById('btn-login').addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  const result = await window.api.login({ username, password });
  if (result.success) {
    if (result.user.role === 'admin') { errEl.textContent = 'Utilisez le panneau Administrateur.'; return; }
    state.user = result.user; state.token = result.token;
    localStorage.setItem('token', result.token); onLoginSuccess();
  } else { errEl.textContent = result.error; }
});

document.getElementById('btn-register').addEventListener('click', async () => {
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';
  const result = await window.api.register({ username, password });
  if (result.success) {
    state.user = result.user; state.token = result.token;
    localStorage.setItem('token', result.token);
    await refreshAccountsList(); onLoginSuccess();
  } else { errEl.textContent = result.error; }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  state.user = null; state.token = null; state.labs = [];
  localStorage.removeItem('token'); await refreshAccountsList(); showScreen('screen-auth');
});
document.getElementById('btn-go-admin').addEventListener('click', () => showScreen('screen-admin-auth'));
document.getElementById('btn-back-to-user').addEventListener('click', async () => {
  await refreshAccountsList(); showScreen('screen-auth');
});
document.getElementById('btn-admin-login').addEventListener('click', async () => {
  const username = document.getElementById('admin-login-username').value.trim();
  const password = document.getElementById('admin-login-password').value;
  const errEl = document.getElementById('admin-login-error');
  errEl.textContent = '';
  const result = await window.api.login({ username, password });
  if (result.success) {
    if (result.user.role !== 'admin') { errEl.textContent = 'Pas les droits administrateur.'; return; }
    state.user = result.user; state.token = result.token;
    localStorage.setItem('token', result.token); onAdminLoginSuccess();
  } else { errEl.textContent = result.error; }
});
document.getElementById('btn-admin-logout').addEventListener('click', async () => {
  state.user = null; state.token = null;
  localStorage.removeItem('token'); await refreshAccountsList(); showScreen('screen-auth');
});
document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
}));

// ---- NAVIGATION UTILISATEUR ----
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => {
  const view = btn.dataset.view;
  showView(view);
  if (view === 'my-labs') refreshLabs().then(renderLabsList);
  if (view === 'dashboard') updateDashboard();
}));

// ---- NAVIGATION ADMIN ----
document.querySelectorAll('.admin-nav-btn').forEach(btn => btn.addEventListener('click', () => {
  showAdminPanel(btn.dataset.panel);
  if (btn.dataset.panel === 'users' || btn.dataset.panel === 'labs') loadAdminView();
}));

// ---- DASHBOARD ----
function updateDashboard() {
  document.getElementById('stat-total').textContent = state.labs.length;
  document.getElementById('stat-easy').textContent  = state.labs.filter(l => l.difficulty <= 3).length;
  document.getElementById('stat-hard').textContent  = state.labs.filter(l => l.difficulty >= 7).length;
}

// ---- LABYRINTHES CRUD (utilisateur) ----
async function refreshLabs() { state.labs = await window.api.getAllLabs(state.user.id); }

function renderLabsList() {
  const container = document.getElementById('labs-list');
  if (!state.labs.length) {
    container.innerHTML = '<p class="empty-state">Aucun labyrinthe.<br>Va dans <strong>Créer / Générer</strong> !</p>';
    return;
  }
  container.innerHTML = state.labs.map(lab => `
    <div class="lab-card" data-id="${lab.id}">
      <div class="lab-card-name">${escapeHtml(lab.name)}</div>
      <div class="lab-card-meta">
        📐 ${lab.size === 'small' ? 'Petite' : lab.size === 'medium' ? 'Moyenne' : 'Grande'} — 📅 ${formatDate(lab.created_at)}
      </div>
      <span class="lab-card-diff ${diffClass(lab.difficulty)}">Difficulté ${lab.difficulty}</span>
    </div>`).join('');
  container.querySelectorAll('.lab-card').forEach(card =>
    card.addEventListener('click', () => openLabDetail(parseInt(card.dataset.id)))
  );
}

async function openLabDetail(id) {
  const lab = await window.api.getOneLab(id);
  if (!lab) return;
  lab.data = normalizeLab(lab.data); state.currentLab = lab;
  document.getElementById('detail-title').textContent = lab.name;
  document.getElementById('detail-info').innerHTML =
    `📐 <strong>${lab.size}</strong> — 🎯 Difficulté <strong>${lab.difficulty}/10</strong> — 📅 <strong>${formatDate(lab.created_at)}</strong>`;
  showView('lab-detail');
  document.getElementById('detail-canvas').style.display = 'block';
  drawMaze('detail-canvas', lab.data, null);
}

document.getElementById('btn-back-labs').addEventListener('click', () => showView('my-labs'));
document.getElementById('btn-solve-detail').addEventListener('click', async () => {
  if (!state.currentLab) return;
  const labData = normalizeLab(state.currentLab.data);
  const result  = await window.api.solveLab(labData);
  if (result.success) drawMaze('detail-canvas', labData, result.path);
});
document.getElementById('btn-delete-lab').addEventListener('click', async () => {
  if (!state.currentLab || !confirm('Supprimer ce labyrinthe ?')) return;
  await window.api.deleteLab({ id: state.currentLab.id, userId: state.user.id });
  await refreshLabs(); showView('my-labs'); renderLabsList(); updateDashboard();
});

// ---- GÉNÉRATION UTILISATEUR ----
document.getElementById('lab-difficulty').addEventListener('input', e =>
  document.getElementById('diff-display').textContent = e.target.value
);
document.getElementById('btn-generate').addEventListener('click', async () => {
  const size = document.getElementById('lab-size').value;
  const difficulty = parseInt(document.getElementById('lab-difficulty').value);
  state.currentGrid = normalizeLab(await window.api.generateLab({ size, difficulty }));
  document.getElementById('canvas-hint').style.display = 'none';
  document.getElementById('lab-canvas').style.display  = 'block';
  drawMaze('lab-canvas', state.currentGrid, null);
  document.getElementById('btn-solve').disabled = false;
  document.getElementById('btn-save').disabled  = false;
});
document.getElementById('btn-solve').addEventListener('click', async () => {
  if (!state.currentGrid) return;
  const result = await window.api.solveLab(state.currentGrid);
  if (result.success) drawMaze('lab-canvas', state.currentGrid, result.path);
});
document.getElementById('btn-reset').addEventListener('click', () => {
  document.getElementById('lab-name').value = '';
  document.getElementById('lab-size').value = 'medium';
  document.getElementById('lab-difficulty').value = '5';
  document.getElementById('diff-display').textContent = '5';
  const canvas = document.getElementById('lab-canvas');
  canvas.style.display = 'none';
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('canvas-hint').style.display = 'block';
  document.getElementById('btn-solve').disabled = true;
  document.getElementById('btn-save').disabled  = true;
  state.currentGrid = null;
});
document.getElementById('btn-save').addEventListener('click', async () => {
  if (!state.currentGrid) return;
  await window.api.createLab({
    userId: state.user.id,
    name: document.getElementById('lab-name').value.trim() || 'Mon labyrinthe',
    data: state.currentGrid,
    size: document.getElementById('lab-size').value,
    difficulty: parseInt(document.getElementById('lab-difficulty').value)
  });
  await refreshLabs(); updateDashboard();
  // Réinitialise le formulaire après sauvegarde
  document.getElementById('lab-name').value           = '';
  document.getElementById('lab-size').value           = 'medium';
  document.getElementById('lab-difficulty').value     = '5';
  document.getElementById('diff-display').textContent = '5';
  const canvas = document.getElementById('lab-canvas');
  canvas.style.display = 'none';
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('canvas-hint').style.display = 'block';
  document.getElementById('btn-solve').disabled = true;
  document.getElementById('btn-save').disabled  = true;
  state.currentGrid = null;
  toast('✅ Labyrinthe sauvegardé !');
});

// ---- GÉNÉRATION ADMIN ----
document.getElementById('admin-lab-difficulty').addEventListener('input', e =>
  document.getElementById('admin-diff-display').textContent = e.target.value
);
document.getElementById('btn-admin-generate').addEventListener('click', async () => {
  const size = document.getElementById('admin-lab-size').value;
  const difficulty = parseInt(document.getElementById('admin-lab-difficulty').value);
  state.adminGrid = normalizeLab(await window.api.generateLab({ size, difficulty }));
  document.getElementById('admin-canvas-hint').style.display = 'none';
  document.getElementById('admin-create-canvas').style.display = 'block';
  drawMaze('admin-create-canvas', state.adminGrid, null);
  document.getElementById('btn-admin-solve-create').disabled = false;
  document.getElementById('btn-admin-save').disabled = false;
});
document.getElementById('btn-admin-solve-create').addEventListener('click', async () => {
  if (!state.adminGrid) return;
  const result = await window.api.solveLab(state.adminGrid);
  if (result.success) drawMaze('admin-create-canvas', state.adminGrid, result.path);
});
document.getElementById('btn-admin-save').addEventListener('click', async () => {
  if (!state.adminGrid) return;
  await window.api.createLab({
    userId: state.user.id,
    name: document.getElementById('admin-lab-name').value.trim() || 'Labyrinthe admin',
    data: state.adminGrid,
    size: document.getElementById('admin-lab-size').value,
    difficulty: parseInt(document.getElementById('admin-lab-difficulty').value)
  });
  await loadAdminView(); toast('✅ Labyrinthe sauvegardé !');
});
document.getElementById('btn-admin-reset').addEventListener('click', () => {
  document.getElementById('admin-lab-name').value = '';
  document.getElementById('admin-lab-size').value = 'medium';
  document.getElementById('admin-lab-difficulty').value = '5';
  document.getElementById('admin-diff-display').textContent = '5';
  const canvas = document.getElementById('admin-create-canvas');
  canvas.style.display = 'none';
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('admin-canvas-hint').style.display = 'block';
  document.getElementById('btn-admin-solve-create').disabled = true;
  document.getElementById('btn-admin-save').disabled = true;
  state.adminGrid = null;
});

// ---- MODAL VISUALISATION LABYRINTHE (admin) ----
async function adminViewLab(id) {
  const lab = await window.api.getOneLab(id);
  if (!lab) return;
  lab.data = normalizeLab(lab.data); state.adminCurrentLab = lab;
  document.getElementById('admin-modal-title').textContent = lab.name;
  document.getElementById('admin-lab-canvas').style.display = 'block';
  drawMaze('admin-lab-canvas', lab.data, null);
  document.getElementById('admin-lab-modal').classList.remove('hidden');
}
document.getElementById('btn-close-modal').addEventListener('click', () =>
  document.getElementById('admin-lab-modal').classList.add('hidden')
);
document.getElementById('btn-admin-solve').addEventListener('click', async () => {
  if (!state.adminCurrentLab) return;
  const labData = normalizeLab(state.adminCurrentLab.data);
  const result  = await window.api.solveLab(labData);
  if (result.success) drawMaze('admin-lab-canvas', labData, result.path);
});

// ---- DESSIN CANVAS ----
function drawMaze(canvasId, labData, solutionPath) {
  const canvas = document.getElementById(canvasId);
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const { grid, rows, cols, start, end } = labData;
  const cell = Math.min(Math.floor(640 / Math.max(rows, cols)), 24);
  canvas.width = cols * cell; canvas.height = rows * cell;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = grid[r][c] === 1 ? '#0d0e17' : '#1e2135';
      ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  if (solutionPath?.length) {
    ctx.fillStyle = 'rgba(240,192,64,0.5)';
    solutionPath.forEach(({ r, c }) => ctx.fillRect(c * cell, r * cell, cell, cell));
  }
  ctx.fillStyle = '#3de8c8'; ctx.fillRect(start.c * cell, start.r * cell, cell, cell);
  ctx.fillStyle = '#f0c040'; ctx.fillRect(end.c   * cell, end.r   * cell, cell, cell);
}

// ---- ADMIN : utilisateurs & labyrinthes ----
async function loadAdminView() {
  const stats = await window.api.adminGetStats();
  document.getElementById('admin-stats-bar').innerHTML = `
    <div class="admin-stat-item"><span class="admin-stat-num">${stats.totalUsers}</span><span class="admin-stat-label">Utilisateurs</span></div>
    <div class="admin-stat-item"><span class="admin-stat-num">${stats.totalLabs}</span><span class="admin-stat-label">Labyrinthes</span></div>
    <div class="admin-stat-item"><span class="admin-stat-num">${stats.labsPerUser[0]?.count||0}</span><span class="admin-stat-label">Max (${escapeHtml(stats.labsPerUser[0]?.username||'—')})</span></div>`;

  const users = await window.api.adminGetUsers();
  document.querySelector('#users-table tbody').innerHTML = users.map(u => `
    <tr><td>${u.id}</td><td><strong>${escapeHtml(u.username)}</strong></td>
    <td><span class="badge-${u.role}">${u.role}</span></td><td>${formatDate(u.created_at)}</td>
    <td>${u.id !== state.user.id
      ? `<button class="btn-danger btn-sm" onclick="adminDeleteUser(${u.id})">Supprimer</button>`
      : '<span style="color:var(--text-dim)">Vous</span>'}</td></tr>`).join('');

  const labs = await window.api.adminGetLabs();
  document.querySelector('#all-labs-table tbody').innerHTML = labs.map(l => `
    <tr><td>${l.id}</td><td>${escapeHtml(l.name)}</td><td>${escapeHtml(l.username)}</td>
    <td>${l.size}</td><td>${l.difficulty}/10</td>
    <td>
      <button class="btn-secondary btn-sm" onclick="adminViewLab(${l.id})">👁 Voir</button>
      <button class="btn-danger btn-sm" onclick="adminDeleteLab(${l.id})">Supprimer</button>
    </td></tr>`).join('');
}

async function adminDeleteUser(id) {
  if (!confirm('Supprimer cet utilisateur et tous ses labyrinthes ?')) return;
  const r = await window.api.adminDeleteUser(id);
  r.success ? loadAdminView() : toast(r.error, 'error');
}
async function adminDeleteLab(id) {
  if (!confirm('Supprimer ce labyrinthe ?')) return;
  await window.api.adminDeleteLab(id); loadAdminView();
}

document.getElementById('btn-show-create-user').addEventListener('click', () =>
  document.getElementById('create-user-form').classList.toggle('hidden')
);
document.getElementById('btn-create-user').addEventListener('click', async () => {
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;
  const role     = document.getElementById('new-role').value;
  if (!username || !password) { toast('Remplis tous les champs.', 'error'); return; }
  const r = await window.api.adminCreateUser({ username, password, role });
  if (r.success) {
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('create-user-form').classList.add('hidden');
    loadAdminView();
  } else { toast(r.error, 'error'); }
});

// ---- DÉMARRAGE ----
checkAutoLogin();
