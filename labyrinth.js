// labyrinth.js — Génération (DFS) et Résolution (BFS)

const SIZES = {
  small:  { rows: 11, cols: 11 },
  medium: { rows: 21, cols: 21 },
  large:  { rows: 31, cols: 31 }
};

const WALL = 1;
const PATH = 0;

// GÉNÉRATION — Recursive Backtracking (DFS)

function generate(size = 'medium', difficulty = 5) {
  const { rows, cols } = SIZES[size] || SIZES.medium;

  const grid = Array.from({ length: rows }, () => Array(cols).fill(WALL));

  const DIRS = [
    { dr: -2, dc: 0 }, { dr: 2, dc: 0 },
    { dr: 0, dc: -2 }, { dr: 0, dc: 2 }
  ];

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function carve(r, c) {
    grid[r][c] = PATH;
    for (const { dr, dc } of shuffle([...DIRS])) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid[nr][nc] === WALL) {
        grid[r + dr / 2][c + dc / 2] = PATH;
        carve(nr, nc);
      }
    }
  }

  carve(1, 1);

  // Entrée et sortie
  grid[0][1]             = PATH;
  grid[rows - 1][cols - 2] = PATH;

  // Difficulté : rebouche des cases MAIS protège le chemin entrée/sortie
  // Cases INTERDITES à reboucher : voisines de l'entrée et de la sortie
  const forbidden = new Set([
    `1,1`,                          // case juste après l'entrée
    `${rows-2},${cols-2}`,          // case juste avant la sortie
    `0,1`, `${rows-1},${cols-2}`    // entrée et sortie elles-mêmes
  ]);

  const extraWalls = Math.floor((difficulty / 10) * (rows * cols * 0.02));
  for (let i = 0; i < extraWalls; i++) {
    const r = 1 + Math.floor(Math.random() * (rows - 2));
    const c = 1 + Math.floor(Math.random() * (cols - 2));
    if (grid[r][c] === PATH && !forbidden.has(`${r},${c}`)) {
      grid[r][c] = WALL;
    }
  }

  // Vérifie qu'un chemin existe encore, sinon on retire les murs ajoutés
  // (sécurité absolue : si le BFS échoue, on recrée sans murs extra)
  const testResult = solve({ grid, rows, cols, start: { r: 0, c: 1 }, end: { r: rows - 1, c: cols - 2 } });
  if (!testResult.success) {
    // Le labyrinthe est bloqué → on regénère sans murs extra (difficulté ignorée)
    return generate(size, 0);
  }

  return { grid, rows, cols, start: { r: 0, c: 1 }, end: { r: rows - 1, c: cols - 2 } };
}

// RÉSOLUTION — BFS (Breadth-First Search)

function solve(labData) {
  const { grid, start, end } = labData;
  const rows = grid.length;
  const cols = grid[0].length;

  // Vérifie que start et end sont bien des cases accessibles
  if (grid[start.r][start.c] === WALL || grid[end.r][end.c] === WALL) {
    return { success: false, path: [] };
  }

  const queue   = [{ r: start.r, c: start.c, path: [{ r: start.r, c: start.c }] }];
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  visited[start.r][start.c] = true;

  const DIRS = [
    { dr: -1, dc: 0 }, { dr: 1, dc: 0 },
    { dr: 0, dc: -1 }, { dr: 0, dc: 1 }
  ];

  while (queue.length > 0) {
    const { r, c, path } = queue.shift();

    if (r === end.r && c === end.c) return { success: true, path };

    for (const { dr, dc } of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === PATH && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
      }
    }
  }

  return { success: false, path: [] };
}

module.exports = { generate, solve };
