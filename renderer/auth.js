const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

const JWT_SECRET = 'labyrinthe_secret_key_2024';

// ─── INSCRIPTION ─────────────────────────────────────────────
function register(username, password) {
  return new Promise((resolve, reject) => {

    // Vérifier si l'utilisateur existe déjà
    db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, row) => {
      if (err) return reject('Erreur base de données.');
      if (row) return reject('Ce nom d\'utilisateur est déjà pris.');

      // Hasher le mot de passe
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Insérer l'utilisateur
      db.run(
        `INSERT INTO users (username, password, role) VALUES (?, ?, ?)`,
        [username, hashedPassword, 'user'],
        function (err) {
          if (err) return reject('Erreur lors de l\'inscription.');

          // Générer le token JWT
          const token = jwt.sign(
            { id: this.lastID, username, role: 'user' },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          resolve({ token, user: { id: this.lastID, username, role: 'user' } });
        }
      );
    });
  });
}

// ─── CONNEXION ───────────────────────────────────────────────
function login(username, password) {
  return new Promise((resolve, reject) => {

    // Chercher l'utilisateur
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
      if (err) return reject('Erreur base de données.');
      if (!user) return reject('Utilisateur introuvable.');

      // Vérifier le mot de passe
      const isValid = bcrypt.compareSync(password, user.password);
      if (!isValid) return reject('Mot de passe incorrect.');

      // Générer le token JWT
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      resolve({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
  });
}

// ─── VÉRIFIER TOKEN ──────────────────────────────────────────
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { register, login, verifyToken };