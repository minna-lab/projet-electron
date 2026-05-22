// ============================================================
// admin.js — Fonctionnalités réservées à l'administrateur
// Ce module fait appel à database.js pour les opérations
// ============================================================

const db = require('./database');
const bcrypt = require('bcryptjs');

function getAllUsers() {
  return db.getAllUsers();
}

function deleteUser(userId) {
  // Sécurité : on ne peut pas supprimer l'admin principal (id=1)
  if (userId === 1) {
    return { success: false, error: 'Impossible de supprimer l\'administrateur principal.' };
  }
  return db.deleteUser(userId);
}

function getAllLabyrinths() {
  return db.getAllLabyrinths();
}

function deleteLabyrinth(labId) {
  return db.deleteLabyrinthAdmin(labId);
}

function getStats() {
  return db.getStats();
}

async function createUser(username, password, role = 'user') {
  if (!username || !password) {
    return { success: false, error: 'Champs requis.' };
  }
  const hashed = await bcrypt.hash(password, 10);
  return db.createUser(username, hashed, role);
}

module.exports = { getAllUsers, deleteUser, getAllLabyrinths, deleteLabyrinth, getStats, createUser };
