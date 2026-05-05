# LabyX — Application de Labyrinthes Electron

> Application desktop multiplateforme pour créer, jouer et résoudre des labyrinthes.
> Développée en 5 jours avec Electron, SQLite, JWT et canvas HTML5.

---

## Structure du projet

```
labyx/
├── main.js               ← Processus principal Electron (IPC, fenêtres)
├── preload.js            ← Bridge contextIsolation
├── package.json
│
├── renderer/             ← Tout ce que Mariam a fait 🎨
│   ├── login.html        ← Page connexion / inscription
│   ├── app.html          ← App principale (navigation + affichage labyrinthes)
│   ├── admin.html        ← Interface admin + stats
│   └── labyrinth.js      ← Génération canvas + résolution BFS
│
└── backend/              ← Tout ce que le binôme a fait ⚙️
    ├── auth.js           ← Inscription, login, JWT, bcrypt
    ├── database.js       ← SQLite CRUD labyrinthes
    └── db.sqlite         ← Base de données (générée automatiquement)
```

---

## Installation

```bash
# Cloner le repo
git clone https://github.com/ton-compte/labyx.git
cd labyx

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Packager en .exe (Windows)
npm run build:win
```

---

## Dépendances principales

| Package           | Version | Usage                          |
|-------------------|---------|--------------------------------|
| `electron`        | ^30     | Application desktop            |
| `better-sqlite3`  | ^9      | Base de données SQLite         |
| `jsonwebtoken`    | ^9      | Authentification JWT           |
| `bcryptjs`        | ^2      | Hashage des mots de passe      |
| `electron-builder`| ^24     | Packaging .exe / .dmg / .AppImage |

---

## Fichiers de Mariam — description technique

### `login.html`
Page d'authentification avec deux formulaires :
- **Connexion** : email + mot de passe → `ipcRenderer.invoke('login', { email, pwd })`
- **Inscription** : nom + email + mot de passe (×2) + CGU → `ipcRenderer.invoke('register', { name, email, pwd })`
- Indicateur de force du mot de passe (faible → très fort)
- Validation front-end avant envoi

### `app.html`
Application principale après connexion :
- **Sidebar** : navigation entre les pages (Dashboard, Labyrinthes, Jouer, Profil)
- **Dashboard** : stats personnelles + 4 labyrinthes récents
- **Mes labyrinthes** : grille complète avec filtres (difficulté) + recherche
- **Jouer** : sélection d'un labyrinthe → modal d'aperçu canvas
- **Modal** : aperçu du labyrinthe + boutons Jouer / Résoudre (BFS)
- Chaque labyrinthe est rendu via `labyrinth.js` sur un `<canvas>`

### `labyrinth.js`
Module JS standalone (compatible Electron `require` + `<script src>`).

**Génération** — Recursive Backtracking (DFS iteratif) :
```javascript
const lab = new Labyrinth({ cols: 20, rows: 20, seed: 42 });
lab.generate();
lab.render(document.getElementById('mon-canvas'));
```

**Résolution BFS** :
```javascript
const path = lab.solve(); // [{x,y}, {x,y}, ...]
lab.render(canvas);       // affiche le chemin en overlay
```

**Animation pas-à-pas** :
```javascript
lab.startSolveAnimation(canvas, { stepMs: 30 }, () => {
  console.log('Résolution terminée !');
});
```

**Persistance SQLite** :
```javascript
const json = lab.toJSON();             // → stocké dans DB
const lab2 = Labyrinth.fromJSON(json); // → rechargé depuis DB
```

### `admin.html`
Tableau de bord administrateur :
- **KPI** : utilisateurs total, labyrinthes créés, parties actives, bannis
- **Graphiques canvas** : inscriptions/semaine, parties/semaine, répartition difficultés, tailles populaires
- **Gestion utilisateurs** : tableau paginé, recherche, actions (voir / modifier / bannir / supprimer)
- **Gestion labyrinthes** : tableau paginé, recherche, suppression
- **Journal d'activité** : log temps réel des événements
- **Configuration** : paramètres système (taille max, expiration JWT…)

---

## IPC — Canaux Electron

| Canal (invoke)          | Paramètres                      | Retour                    |
|-------------------------|---------------------------------|---------------------------|
| `login`                 | `{ email, pwd }`                | `{ token, user }` ou err  |
| `register`              | `{ name, email, pwd }`          | `{ token, user }` ou err  |
| `get-labyrinths`        | `{ userId? }`                   | `[Labyrinth]`             |
| `save-labyrinth`        | `{ userId, labJSON, name }`     | `{ id }`                  |
| `delete-labyrinth`      | `{ id }`                        | `{ ok }`                  |
| `get-all-users`         | —                               | `[User]` (admin only)     |
| `ban-user`              | `{ userId }`                    | `{ ok }` (admin only)     |
| `save-config`           | `{ config }`                    | `{ ok }` (admin only)     |

---

## Schéma SQLite

```sql
CREATE TABLE users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT NOT NULL UNIQUE,
  email     TEXT NOT NULL UNIQUE,
  password  TEXT NOT NULL,          -- bcrypt hash
  role      TEXT DEFAULT 'user',    -- 'user' | 'admin' | 'banned'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE labyrinths (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  cols      INTEGER NOT NULL,
  rows      INTEGER NOT NULL,
  seed      INTEGER NOT NULL,
  grid_data TEXT NOT NULL,          -- JSON Uint8Array
  plays     INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Scripts npm

```json
{
  "scripts": {
    "dev":       "electron .",
    "build:win": "electron-builder --win --x64",
    "build:mac": "electron-builder --mac",
    "build:linux":"electron-builder --linux"
  }
}
```

---

## Auteurs

| Développeur | Tâches                                                  |
|-------------|---------------------------------------------------------|
| **Mariam**  | UI/UX (login, app, admin), labyrinth.js canvas + BFS    |
| **Minna**  | Electron main, SQLite, auth.js JWT/bcrypt, IPC, packaging |

---

*LabyX — Projet scolaire 5 jours — Mai 2026*