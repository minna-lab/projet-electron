// ============================================================
// database.js — Base de données avec sql.js (100% JavaScript)
// sql.js = SQLite compilé en WebAssembly → pas besoin de Visual Studio !
// On sauvegarde manuellement le fichier .db sur le disque
// ============================================================

const path = require('path');
const fs   = require('fs');
const { app } = require('electron');

const DB_PATH = path.join(app.getPath('userData'), 'labyrinthe.db');

let db;
let SQL;

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function init() {
  const wasmPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const initSqlJs = require('sql.js');

  SQL = await initSqlJs({ locateFile: () => wasmPath });

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT    UNIQUE NOT NULL,
      password   TEXT    NOT NULL,
      role       TEXT    DEFAULT 'user',
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS labyrinths (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      name       TEXT    NOT NULL,
      data       TEXT    NOT NULL,
      size       TEXT    DEFAULT 'medium',
      difficulty INTEGER DEFAULT 5,
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  const result = db.exec('SELECT COUNT(*) as c FROM users');
  const count  = result[0]?.values[0][0] || 0;
  if (count === 0) {
    const bcrypt = require('bcryptjs');
    const hash   = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')`, ['admin', hash]);
    save();
    console.log('✅ Admin créé : admin / admin123');
  }
}

function query(sql, params = []) {
  const stmt    = db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
  const r = queryOne('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: r?.id };
}

function createUser(username, hashedPassword, role = 'user') {
  const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) return { success: false, error: "Ce nom d'utilisateur est déjà pris." };
  const result = run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
  return { success: true, id: result.lastInsertRowid };
}

function getUserByUsername(username) {
  return queryOne('SELECT * FROM users WHERE username = ?', [username]);
}

function getUserById(id) {
  return queryOne('SELECT id, username, role, created_at FROM users WHERE id = ?', [id]);
}

function getAllUsers() {
  return query('SELECT id, username, role, created_at FROM users ORDER BY id');
}

function deleteUser(id) {
  run('DELETE FROM labyrinths WHERE user_id = ?', [id]);
  run('DELETE FROM users WHERE id = ?', [id]);
  return { success: true };
}

function createLabyrinthe(userId, name, data, size, difficulty) {
  const result = run(
    'INSERT INTO labyrinths (user_id, name, data, size, difficulty) VALUES (?, ?, ?, ?, ?)',
    [userId, name, JSON.stringify(data), size, difficulty]
  );
  return { success: true, id: result.lastInsertRowid };
}

function getLabyrinthesByUser(userId) {
  const rows = query('SELECT * FROM labyrinths WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  return rows.map(row => ({ ...row, data: JSON.parse(row.data) }));
}

function getLabyrintheById(id) {
  const row = queryOne('SELECT * FROM labyrinths WHERE id = ?', [id]);
  if (!row) return null;
  return { ...row, data: JSON.parse(row.data) };
}

function updateLabyrinthe(id, name, data) {
  run('UPDATE labyrinths SET name = ?, data = ? WHERE id = ?', [name, JSON.stringify(data), id]);
  return { success: true };
}

function deleteLabyrinthe(id, userId) {
  run('DELETE FROM labyrinths WHERE id = ? AND user_id = ?', [id, userId]);
  return { success: true };
}

function getAllLabyrinths() {
  const rows = query(`
    SELECT l.id, l.name, l.data, l.size, l.difficulty, l.created_at, u.username
    FROM labyrinths l
    JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC
  `);
  return rows.map(row => ({ ...row, data: JSON.parse(row.data) }));
}

function deleteLabyrinthAdmin(id) {
  run('DELETE FROM labyrinths WHERE id = ?', [id]);
  return { success: true };
}

function getStats() {
  const totalUsers  = queryOne('SELECT COUNT(*) as c FROM users').c;
  const totalLabs   = queryOne('SELECT COUNT(*) as c FROM labyrinths').c;
  const labsPerUser = query(`
    SELECT u.username, COUNT(l.id) as count
    FROM users u
    LEFT JOIN labyrinths l ON l.user_id = u.id
    GROUP BY u.id
    ORDER BY count DESC
  `);
  return { totalUsers, totalLabs, labsPerUser };
}

module.exports = {
  init,
  createUser, getUserByUsername, getUserById, getAllUsers, deleteUser,
  createLabyrinthe, getLabyrinthesByUser, getLabyrintheById,
  updateLabyrinthe, deleteLabyrinthe, getAllLabyrinths, deleteLabyrinthAdmin,
  getStats
};
