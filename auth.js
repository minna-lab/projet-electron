// ============================================================
// auth.js — Authentification : inscription, connexion, JWT
// bcryptjs : hashage du mot de passe (sens unique, sécurisé)
// jsonwebtoken : crée un "ticket" signé pour rester connecté
// ============================================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');

// Clé secrète pour signer les JWT (en prod, mettre dans .env)
const JWT_SECRET = 'labyrinthe_secret_key_2024';
const JWT_EXPIRES = '7d'; // Le token dure 7 jours

// --- Inscription ---
async function register(username, password) {
  // Vérifie que les champs ne sont pas vides
  if (!username || !password) {
    return { success: false, error: 'Nom d\'utilisateur et mot de passe requis.' };
  }
  if (password.length < 4) {
    return { success: false, error: 'Le mot de passe doit faire au moins 4 caractères.' };
  }

  // Hash le mot de passe (10 = nombre de "tours" de hachage, bon équilibre sécurité/vitesse)
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crée l'utilisateur en base
  const result = db.createUser(username, hashedPassword);
  if (!result.success) return result;

  // Connexion automatique après inscription : on crée directement le token
  const user = db.getUserByUsername(username);
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { success: true, token, user: { id: user.id, username: user.username, role: user.role } };
}

// --- Connexion ---
async function login(username, password) {
  if (!username || !password) {
    return { success: false, error: 'Champs requis.' };
  }

  // Cherche l'utilisateur en base
  const user = db.getUserByUsername(username);
  if (!user) {
    return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect.' };
  }

  // Compare le mot de passe saisi avec le hash stocké
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { success: false, error: 'Nom d\'utilisateur ou mot de passe incorrect.' };
  }

  // Crée le token JWT
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return { success: true, token, user: { id: user.id, username: user.username, role: user.role } };
}

// --- Vérification du token ---
// Appelé au démarrage pour reconnecter automatiquement l'utilisateur
function verifyToken(token) {
  if (!token) return { success: false };
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, user: { id: decoded.id, username: decoded.username, role: decoded.role } };
  } catch (err) {
    return { success: false, error: 'Token invalide ou expiré.' };
  }
}

module.exports = { register, login, verifyToken };
