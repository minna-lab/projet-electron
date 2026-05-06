const Database = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const DB_PATH = path.join(__dirname, '..', 'labyrinthe.db');

const db = new Database.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erreur connexion DB :', err.message);
  } else {
    console.log('Base de données connectée.');
    initDatabase();
  }
});

function initDatabase() {
  // Table utilisateurs
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table labyrinthes
  db.run(`
    CREATE TABLE IF NOT EXISTS labyrinths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      size TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      grid TEXT NOT NULL,
      solution TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Tables initialisées.');
}

module.exports = db;