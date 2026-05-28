# 🌀 Labyrinthe App — Application Desktop Electron

Application desktop de création et résolution de labyrinthes, construite avec Electron, SQLite, bcryptjs et JWT.

---

## 📁 Structure du projet

```
projet_labyrinthe/
├── main.js          → Processus principal Electron (fenêtre + IPC)
├── preload.js       → Pont sécurisé entre renderer et main
├── auth.js          → Inscription / Connexion (bcrypt + JWT)
├── database.js      → Base de données SQLite (CRUD)
├── labyrinth.js     → Génération (DFS) et Résolution (BFS)
├── admin.js         → Fonctionnalités administrateur
├── package.json     → Dépendances et scripts
└── renderer/
    ├── index.html   → Structure HTML de l'interface
    ├── style.css    → Thème sombre élégant
    └── app.js       → Logique de l'interface
```

## 👥 Contributions
- **Minna** : `main.js`, `preload.js`, `auth.js`, `admin.js`,`database.js`
- **Mariam** : `labyrinth.js`, , `renderer/index.html`, `renderer/style.css`, `renderer/app.js`, `README.md`

---

## 🚀 Installation

### Prérequis
- [Node.js](https://nodejs.org/) v18 ou supérieur
- npm (inclus avec Node.js)

### Étapes

```bash
# 1. Cloner ou décompresser le projet
cd projet_labyrinthe

# 2. Installer les dépendances
npm install

# 3. Lancer l'application
npm start
```

### Compte admin par défaut
Au premier lancement, un compte administrateur est créé automatiquement :
- **Utilisateur :** `admin`
- **Mot de passe :** `admin123`

---

## 🎮 Utilisation

### Utilisateur standard
1. Crée un compte ou connecte-toi
2. Va dans **Créer / Générer** → choisis la taille et la difficulté → clique **Générer**
3. Clique **Résoudre** pour voir le chemin solution en surbrillance dorée
4. Clique **Sauvegarder** pour stocker le labyrinthe
5. Retrouve tes labyrinthes dans **Mes labyrinthes**

### Administrateur
- Accède à l'onglet **⚙️ Administration**
- Consulte les statistiques globales
- Crée / supprime des utilisateurs
- Supprime n'importe quel labyrinthe

---

## 🔧 Explications techniques

### Génération : Recursive Backtracking (DFS)
L'algorithme part d'une case (1,1), marque-la comme chemin, puis creuse des passages dans des directions aléatoires. Il garantit qu'il existe **toujours un chemin** entre l'entrée et la sortie.

```
1. Départ en (1,1)
2. Mélange les 4 directions au hasard
3. Pour chaque direction : si la case voisine est un mur → creuse et recommence
4. La difficulté ajoute des murs supplémentaires (culs-de-sac)
```

### Résolution : BFS (Breadth-First Search)
Le BFS explore les cases niveau par niveau depuis l'entrée. Quand il atteint la sortie, il retourne le **chemin le plus court**.

### Sécurité
- Mots de passe hashés avec **bcryptjs** (irréversible)
- Sessions gérées par **JWT** (token signé, expire en 7 jours)
- Communication renderer ↔ main via **contextBridge** (pas d'accès direct à Node.js)
- Requêtes SQL préparées (protection contre les injections SQL)

---

## 📦 Build (exécutable .exe)

```bash
npm run build
```
L'exécutable sera dans le dossier `dist/`.

---

## 📚 Sources utilisées

- [Documentation Electron](https://www.electronjs.org/docs)
- [Documentation better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Documentation bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- [Documentation jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- Algorithme DFS Maze Generation — [Wikipedia](https://en.wikipedia.org/wiki/Maze_generation_algorithm)
- Algorithme BFS — [Wikipedia](https://en.wikipedia.org/wiki/Breadth-first_search)
