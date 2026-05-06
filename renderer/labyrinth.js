const db = require('./database');

// ─── TAILLES ─────────────────────────────────────────────────
const SIZES = {
  petite:  { rows: 10, cols: 10 },
  moyenne: { rows: 20, cols: 20 },
  grande:  { rows: 30, cols: 30 }
};

// ─── GÉNÉRATION (DFS Recursive Backtracker) ───────────────────
function generateLabyrinth(size, difficulty) {
  const { rows, cols } = SIZES[size] || SIZES['moyenne'];

  // Grille initiale : tous les murs fermés
  // Chaque cellule : { top, right, bottom, left } = true si mur présent
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { top: true, right: true, bottom: true, left: true, visited: false };
    }
  }

  // DFS pour creuser les passages
  function carve(r, c) {
    grid[r][c].visited = true;

    // Directions mélangées aléatoirement
    const directions = shuffle([
      { dr: -1, dc: 0, wall: 'top',    opposite: 'bottom' },
      { dr:  1, dc: 0, wall: 'bottom', opposite: 'top'    },
      { dr:  0, dc: -1, wall: 'left',  opposite: 'right'  },
      { dr:  0, dc:  1, wall: 'right', opposite: 'left'   }
    ]);

    for (const { dr, dc, wall, opposite } of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
        // Casser le mur entre les deux cellules
        grid[r][c][wall] = false;
        grid[nr][nc][opposite] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);

  // Appliquer la difficulté : reboucher des passages aléatoirement
  // Plus la difficulté est haute, plus on rebouche
  const wallsToClose = Math.floor((rows * cols * difficulty) / 50);
  for (let i = 0; i < wallsToClose; i++) {
    const r = Math.floor(Math.random() * (rows - 1));
    const c = Math.floor(Math.random() * (cols - 1));
    grid[r][c].bottom = true;
    grid[r + 1][c].top = true;
  }

  // Nettoyer la propriété visited avant de stocker
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      delete grid[r][c].visited;

  return { grid, rows, cols };
}

// ─── RÉSOLUTION (BFS) ─────────────────────────────────────────
function solveLabyrinth(grid, rows, cols) {
  const start = { r: 0, c: 0 };
  const end   = { r: rows - 1, c: cols - 1 };

  const queue   = [start];
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent  = Array.from({ length: rows }, () => Array(cols).fill(null));

  visited[0][0] = true;

  const directions = [
    { dr: -1, dc: 0, wall: 'top'    },
    { dr:  1, dc: 0, wall: 'bottom' },
    { dr:  0, dc: -1, wall: 'left'  },
    { dr:  0, dc:  1, wall: 'right' }
  ];

  while (queue.length > 0) {
    const { r, c } = queue.shift();

    // Arrivée trouvée
    if (r === end.r && c === end.c) {
      return reconstructPath(parent, end);
    }

    for (const { dr, dc, wall } of directions) {
      const nr = r + dr;
      const nc = c + dc;

      if (
        nr >= 0 && nr < rows &&
        nc >= 0 && nc < cols &&
        !visited[nr][nc] &&
        !grid[r][c][wall]   // pas de mur dans cette direction
      ) {
        visited[nr][nc] = true;
        parent[nr][nc]  = { r, c };
        queue.push({ r: nr, c: nc });
      }
    }
  }

  return []; // pas de solution
}

// Reconstituer le chemin depuis l'arrivée jusqu'au départ
function reconstructPath(parent, end) {
  const path = [];
  let current = end;

  while (current !== null) {
    path.unshift(current);
    current = parent[current.r][current.c];
  }

  return path;
}

// ─── CRUD LABYRINTHES ─────────────────────────────────────────
function createLabyrinth(userId, name, size, difficulty) {
  return new Promise((resolve, reject) => {
    const { grid, rows, cols } = generateLabyrinth(size, difficulty);
    const solution = solveLabyrinth(grid, rows, cols);

    db.run(
      `INSERT INTO labyrinths (user_id, name, size, difficulty, grid, solution)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, name, size, difficulty, JSON.stringify({ grid, rows, cols }), JSON.stringify(solution)],
      function (err) {
        if (err) return reject('Erreur création labyrinthe.');
        resolve({ id: this.lastID, name, size, difficulty, grid, rows, cols, solution });
      }
    );
  });
}

function getLabyrinthsByUser(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM labyrinths WHERE user_id = ? ORDER BY created_at DESC`,
      [userId],
      (err, rows) => {
        if (err) return reject('Erreur récupération labyrinthes.');
        const labyrinths = rows.map(row => ({
          ...row,
          grid: JSON.parse(row.grid),
          solution: JSON.parse(row.solution)
        }));
        resolve(labyrinths);
      }
    );
  });
}

function updateLabyrinth(id, name) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE labyrinths SET name = ? WHERE id = ?`,
      [name, id],
      function (err) {
        if (err) return reject('Erreur mise à jour.');
        resolve({ updated: this.changes });
      }
    );
  });
}

function deleteLabyrinth(id) {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM labyrinths WHERE id = ?`,
      [id],
      function (err) {
        if (err) return reject('Erreur suppression.');
        resolve({ deleted: this.changes });
      }
    );
  });
}

// ─── UTILITAIRE ───────────────────────────────────────────────
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  generateLabyrinth,
  solveLabyrinth,
  createLabyrinth,
  getLabyrinthsByUser,
  updateLabyrinth,
  deleteLabyrinth
};