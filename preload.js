// ============================================================
// preload.js — Pont sécurisé entre renderer et main
// Expose uniquement les fonctions nécessaires via contextBridge
// Le renderer ne peut appeler QUE ce qui est listé ici
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {

  // --- Auth ---
  register: (data) => ipcRenderer.invoke('auth:register', data),
  login: (data) => ipcRenderer.invoke('auth:login', data),
  verifyToken: (token) => ipcRenderer.invoke('auth:verify', token),

  // --- Labyrinthes ---
  getAllLabs: (userId) => ipcRenderer.invoke('lab:getAll', userId),
  createLab: (data) => ipcRenderer.invoke('lab:create', data),
  updateLab: (data) => ipcRenderer.invoke('lab:update', data),
  deleteLab: (data) => ipcRenderer.invoke('lab:delete', data),
  getOneLab: (id) => ipcRenderer.invoke('lab:getOne', id),

  // --- Génération / Résolution ---
  generateLab: (data) => ipcRenderer.invoke('lab:generate', data),
  solveLab: (grid) => ipcRenderer.invoke('lab:solve', grid),

  // --- Admin ---
  adminGetUsers: () => ipcRenderer.invoke('admin:getAllUsers'),
  adminDeleteUser: (id) => ipcRenderer.invoke('admin:deleteUser', id),
  adminGetLabs: () => ipcRenderer.invoke('admin:getAllLabs'),
  adminDeleteLab: (id) => ipcRenderer.invoke('admin:deleteLab', id),
  adminGetStats: () => ipcRenderer.invoke('admin:getStats'),
  adminCreateUser: (data) => ipcRenderer.invoke('admin:createUser', data),
});
