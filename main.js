// ============================================================
// main.js — Processus principal Electron
// C'est le "chef d'orchestre" : il crée la fenêtre et gère
// la communication entre l'interface (renderer) et Node.js
// ============================================================

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// On importe nos modules métier
const db = require('./database');
const auth = require('./auth');
const labyrinth = require('./labyrinth');
const admin = require('./admin');

let mainWindow;

// --- Création de la fenêtre principale ---
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      // preload.js fait le pont entre renderer et main
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // Sécurité : isole le contexte
      nodeIntegration: false    // Sécurité : pas d'accès direct à Node
    },
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    titleBarStyle: 'default',
    show: false // On attend que la page soit prête
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Affiche la fenêtre quand tout est chargé (évite l'écran blanc)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  db.init(); // Initialise la base de données au démarrage
  createWindow();
});

// Ferme l'app quand toutes les fenêtres sont fermées (sauf macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ============================================================
// IPC HANDLERS — Communication renderer ↔ main
// Le renderer envoie un message, le main répond
// ============================================================

// --- AUTHENTIFICATION ---

ipcMain.handle('auth:register', async (event, { username, password }) => {
  return auth.register(username, password);
});

ipcMain.handle('auth:login', async (event, { username, password }) => {
  return auth.login(username, password);
});

ipcMain.handle('auth:verify', async (event, token) => {
  return auth.verifyToken(token);
});

// --- LABYRINTHES (CRUD) ---

ipcMain.handle('lab:getAll', async (event, userId) => {
  return db.getLabyrinthesByUser(userId);
});

ipcMain.handle('lab:create', async (event, { userId, name, data, size, difficulty }) => {
  return db.createLabyrinthe(userId, name, data, size, difficulty);
});

ipcMain.handle('lab:update', async (event, { id, name, data }) => {
  return db.updateLabyrinthe(id, name, data);
});

ipcMain.handle('lab:delete', async (event, { id, userId }) => {
  return db.deleteLabyrinthe(id, userId);
});

ipcMain.handle('lab:getOne', async (event, id) => {
  return db.getLabyrintheById(id);
});

// --- GÉNÉRATION & RÉSOLUTION ---

ipcMain.handle('lab:generate', async (event, { size, difficulty }) => {
  return labyrinth.generate(size, difficulty);
});

ipcMain.handle('lab:solve', async (event, grid) => {
  return labyrinth.solve(grid);
});

// --- ADMIN ---

ipcMain.handle('admin:getAllUsers', async () => {
  return admin.getAllUsers();
});

ipcMain.handle('admin:deleteUser', async (event, userId) => {
  return admin.deleteUser(userId);
});

ipcMain.handle('admin:getAllLabs', async () => {
  return admin.getAllLabyrinths();
});

ipcMain.handle('admin:deleteLab', async (event, labId) => {
  return admin.deleteLabyrinth(labId);
});

ipcMain.handle('admin:getStats', async () => {
  return admin.getStats();
});

ipcMain.handle('admin:createUser', async (event, { username, password, role }) => {
  return admin.createUser(username, password, role);
});
