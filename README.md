# LabyX — Application de Labyrinthes

Application desktop de création et de résolution de labyrinthes,
développée avec **Electron + SQLite + JWT**.

---

## Structure du projet

```
labyx/
├── main.js            ← Processus principal Electron
├── preload.js         ← Bridge contextIsolation
├── package.json       ← Dépendances + scripts npm
│
├── renderer/          ← Pages HTML (Mariam)
│   ├── login.html     ← Connexion / Inscription
│   ├── app.html       ← App principale + labyrinthes
│   ├── admin.html     ← Interface admin + stats
│   └── labyrinth.js   ← Génération canvas + BFS
│
└── backend/           ← Logique serveur (Binôme)
    ├── auth.js        ← Inscription, login, JWT, bcrypt
    ├── database.js    ← SQLite CRUD
    └── labyx.db       ← Base de données (auto-générée)
```

---

## Installation

```bash
# 1. Cloner le projet
git clone https://github.com/ton-compte/labyx.git
cd labyx

# 2. Installer les dépendances
npm install

# 3. Lancer en développement
npm run dev

# 4. Créer le .exe (Windows)
npm run build:win
```

---

## Dépendances

| Package           | Utilité                     |
|-------------------|-----------------------------|
| `electron`        | Application desktop         |
| `better-sqlite3`  | Base de données SQLite      |
| `jsonwebtoken`    | Authentification JWT        |
| `bcryptjs`        | Hashage des mots de passe   |
| `electron-builder`| Packaging .exe / .dmg       |

---

## Schéma de la base de données

```sql
CREATE TABLE users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  password  TEXT NOT NULL,        -- hashé avec bcrypt
  role      TEXT DEFAULT 'user'   -- 'user', 'admin', 'banned'
);

CREATE TABLE labyrinths (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER,
  name      TEXT NOT NULL,
  cols      INTEGER,
  rows      INTEGER,
  seed      INTEGER,
  grid_data TEXT                  -- tableau JSON
);
```

---

## Canaux IPC (communication Electron)

| Canal                | Paramètres                            | Retour              |
|----------------------|---------------------------------------|---------------------|
| `login`              | `{ email, password }`                 | `{ user, token }`   |
| `register`           | `{ username, email, password }`       | `{ message }`       |
| `get-labyrinths`     | `userId`                              | `[labyrinths]`      |
| `save-labyrinth`     | `{ userId, name, cols, rows, seed, gridData }` | `{ message }` |
| `delete-labyrinth`   | `id`                                  | `{ message }`       |
| `get-all-users`      | —                                     | `[users]`           |
| `delete-user`        | `id`                                  | `{ message }`       |

---

## Comptes de test (navigateur)

| Email                | Mot de passe | Rôle  |
|----------------------|--------------|-------|
| mariam@labyx.fr      | 1234         | admin |
| younes@labyx.fr      | 1234         | user  |

---

## Scripts npm

```json
"dev":        "electron ."
"build:win":  "electron-builder --win --x64"
"build:mac":  "electron-builder --mac"
"build:linux":"electron-builder --linux"
```

---

## Auteurs

| Développeur | Fichiers                                      |
|-------------|-----------------------------------------------|
| **Mariam**  | login.html, app.html, admin.html, labyrinth.js |
| **Minna**  | main.js, preload.js, auth.js, database.js      |

---
*Projet scolaire — LabyX 2026*
