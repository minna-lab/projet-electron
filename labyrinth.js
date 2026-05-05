/**
 * labyrinth.js — Génération et affichage visuel de labyrinthes
 * Mercredi : génération sur canvas (Recursive Backtracking + DFS)
 * Jeudi    : algo de résolution BFS (inclus ici en module séparé)
 *
 * Usage :
 *   const lab = new Labyrinth({ cols: 20, rows: 20 });
 *   lab.generate();
 *   lab.render(canvasElement);
 *   lab.solve(); // BFS — retourne le chemin solution
 */

/* ─────────────────────────────────────────────
   CONSTANTES
───────────────────────────────────────────── */
const WALL = {
  N: 0b0001,  // 1
  S: 0b0010,  // 2
  E: 0b0100,  // 4
  W: 0b1000,  // 8
};
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DIR_DELTA = { N: [0,-1], S: [0,1], E: [1,0], W: [-1,0] };

/* ─────────────────────────────────────────────
   CLASSE PRINCIPALE
───────────────────────────────────────────── */
class Labyrinth {
  /**
   * @param {object} opts
   * @param {number} opts.cols   - Nombre de colonnes (défaut: 20)
   * @param {number} opts.rows   - Nombre de lignes   (défaut: 20)
   * @param {number} [opts.seed] - Graine aléatoire (optionnel)
   */
  constructor({ cols = 20, rows = 20, seed = null } = {}) {
    this.cols = cols;
    this.rows = rows;
    this.seed = seed ?? Math.floor(Math.random() * 999999);

    // Grille: chaque cellule = bitmask des murs ouverts (passages)
    // 0 = tous murs fermés, bit à 1 = mur ouvert (passage)
    this.grid = new Uint8Array(cols * rows);

    // Cellule de départ: (0,0) ; arrivée: (cols-1, rows-1)
    this.start  = { x: 0, y: 0 };
    this.finish = { x: cols - 1, y: rows - 1 };

    this.solved = false;
    this.solutionPath = []; // [{x,y}] chemin BFS solution

    this._rng = this._mkRng(this.seed);
    this._generated = false;

    // Rendu
    this.cellSize   = 20;
    this.wallColor  = '#f0c040';
    this.bgColor    = '#0d0f13';
    this.startColor = '#3be8b0';
    this.endColor   = '#ff5f6d';
    this.solveColor = 'rgba(59,232,176,0.55)';
    this.playerPos  = null; // {x,y} — position actuelle du joueur
  }

  /* ── Générateur pseudo-aléatoire déterministe (mulberry32) ── */
  _mkRng(seed) {
    let s = seed >>> 0;
    return () => {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── Accesseurs grille ── */
  _idx(x, y)          { return y * this.cols + x; }
  _get(x, y)          { return this.grid[this._idx(x, y)]; }
  _open(x, y, dir)    { this.grid[this._idx(x, y)] |= WALL[dir]; }
  _isOpen(x, y, dir)  { return !!(this._get(x, y) & WALL[dir]); }
  _inBounds(x, y)     { return x >= 0 && x < this.cols && y >= 0 && y < this.rows; }

  /* ──────────────────────────────────────────────────────────────
     GÉNÉRATION — Recursive Backtracking (DFS iteratif)
  ────────────────────────────────────────────────────────────── */
  generate() {
    this.grid.fill(0);
    this.solved = false;
    this.solutionPath = [];
    this._generated = false;

    const visited = new Uint8Array(this.cols * this.rows);
    const stack   = [];

    const start = { x: 0, y: 0 };
    visited[this._idx(start.x, start.y)] = 1;
    stack.push(start);

    while (stack.length) {
      const cur = stack[stack.length - 1];

      // Trouver les voisins non visités
      const dirs = ['N','S','E','W'];
      // Mélanger (Fisher-Yates avec notre RNG)
      for (let i = dirs.length - 1; i > 0; i--) {
        const j = Math.floor(this._rng() * (i + 1));
        [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
      }

      let moved = false;
      for (const dir of dirs) {
        const [dx, dy] = DIR_DELTA[dir];
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (this._inBounds(nx, ny) && !visited[this._idx(nx, ny)]) {
          // Ouvrir le mur entre cur et next
          this._open(cur.x, cur.y, dir);
          this._open(nx, ny, OPPOSITE[dir]);
          visited[this._idx(nx, ny)] = 1;
          stack.push({ x: nx, y: ny });
          moved = true;
          break;
        }
      }

      if (!moved) stack.pop(); // Backtrack
    }

    this._generated = true;
    return this;
  }

  /* ──────────────────────────────────────────────────────────────
     RÉSOLUTION — BFS (breadth-first search)
     Retourne le chemin [{x,y}] de start à finish, ou []
  ────────────────────────────────────────────────────────────── */
  solve() {
    if (!this._generated) this.generate();

    const { cols, rows, start, finish } = this;
    const visited = new Uint8Array(cols * rows);
    const parent  = new Int32Array(cols * rows).fill(-1);
    const queue   = [start];
    visited[this._idx(start.x, start.y)] = 1;

    const toIdx = ({ x, y }) => this._idx(x, y);

    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === finish.x && cur.y === finish.y) break;

      for (const dir of ['N','S','E','W']) {
        if (!this._isOpen(cur.x, cur.y, dir)) continue;
        const [dx, dy] = DIR_DELTA[dir];
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!this._inBounds(nx, ny) || visited[this._idx(nx, ny)]) continue;
        visited[this._idx(nx, ny)] = 1;
        parent[this._idx(nx, ny)] = toIdx(cur);
        queue.push({ x: nx, y: ny });
      }
    }

    // Reconstituer le chemin
    const path = [];
    let idx = this._idx(finish.x, finish.y);
    if (visited[idx]) {
      while (idx !== -1) {
        path.unshift({ x: idx % cols, y: Math.floor(idx / cols) });
        idx = parent[idx];
      }
    }

    this.solutionPath = path;
    this.solved = path.length > 0;
    return path;
  }

  /* ──────────────────────────────────────────────────────────────
     RENDU sur Canvas
  ────────────────────────────────────────────────────────────── */
  render(canvas, opts = {}) {
    if (!this._generated) this.generate();

    const cellSize = opts.cellSize ?? this.cellSize;
    const W = this.cols * cellSize;
    const H = this.rows * cellSize;

    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');

    // Fond
    ctx.fillStyle = opts.bgColor ?? this.bgColor;
    ctx.fillRect(0, 0, W, H);

    // Chemin solution (si résolu)
    if (this.solved && this.solutionPath.length > 0) {
      ctx.strokeStyle = opts.solveColor ?? this.solveColor;
      ctx.lineWidth   = cellSize * 0.35;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      this.solutionPath.forEach(({ x, y }, i) => {
        const px = x * cellSize + cellSize / 2;
        const py = y * cellSize + cellSize / 2;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Murs
    ctx.strokeStyle = opts.wallColor ?? this.wallColor;
    ctx.lineWidth   = Math.max(1, cellSize * 0.07);
    ctx.lineCap     = 'square';

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const px = x * cellSize;
        const py = y * cellSize;

        ctx.beginPath();
        // Nord
        if (!this._isOpen(x, y, 'N') || y === 0) {
          ctx.moveTo(px, py); ctx.lineTo(px + cellSize, py);
        }
        // Ouest
        if (!this._isOpen(x, y, 'W') || x === 0) {
          ctx.moveTo(px, py); ctx.lineTo(px, py + cellSize);
        }
        // Sud (seulement sur la dernière ligne)
        if (y === this.rows - 1 && !this._isOpen(x, y, 'S')) {
          ctx.moveTo(px, py + cellSize); ctx.lineTo(px + cellSize, py + cellSize);
        }
        // Est (seulement sur la dernière colonne)
        if (x === this.cols - 1 && !this._isOpen(x, y, 'E')) {
          ctx.moveTo(px + cellSize, py); ctx.lineTo(px + cellSize, py + cellSize);
        }
        ctx.stroke();
      }
    }

    // Point de départ
    this._drawCircle(ctx, this.start, cellSize, opts.startColor ?? this.startColor);
    // Point d'arrivée
    this._drawCircle(ctx, this.finish, cellSize, opts.endColor ?? this.endColor);

    // Joueur
    if (this.playerPos) {
      this._drawPlayer(ctx, this.playerPos, cellSize);
    }
  }

  _drawCircle(ctx, { x, y }, cellSize, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
      x * cellSize + cellSize / 2,
      y * cellSize + cellSize / 2,
      cellSize * 0.28, 0, Math.PI * 2
    );
    ctx.fill();
  }

  _drawPlayer(ctx, { x, y }, cellSize) {
    const px = x * cellSize + cellSize / 2;
    const py = y * cellSize + cellSize / 2;
    const r  = cellSize * 0.3;

    // Halo
    const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
    g.addColorStop(0, 'rgba(240,192,64,0.5)');
    g.addColorStop(1, 'rgba(240,192,64,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(px, py, r * 2, 0, Math.PI * 2);
    ctx.fill();

    // Corps
    ctx.fillStyle = '#f0c040';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ──────────────────────────────────────────────────────────────
     ANIMATION PAS-À-PAS de la résolution
     Appeler renderStep() dans un requestAnimationFrame
  ────────────────────────────────────────────────────────────── */
  startSolveAnimation(canvas, opts = {}, onDone = null) {
    if (!this.solved) this.solve();
    let step = 0;
    const total = this.solutionPath.length;
    const animSolved = Object.assign({}, this);

    const tick = () => {
      if (step > total) { onDone?.(); return; }
      const partialPath = this.solutionPath.slice(0, step);
      const tempSave = { solved: this.solved, solutionPath: this.solutionPath };
      this.solved = partialPath.length > 1;
      this.solutionPath = partialPath;
      this.playerPos = partialPath[partialPath.length - 1] ?? this.start;
      this.render(canvas, opts);
      this.solved = tempSave.solved;
      this.solutionPath = tempSave.solutionPath;
      step++;
      setTimeout(() => requestAnimationFrame(tick), opts.stepMs ?? 30);
    };
    requestAnimationFrame(tick);
  }

  /* ──────────────────────────────────────────────────────────────
     EXPORT / IMPORT JSON (pour SQLite via database.js)
  ────────────────────────────────────────────────────────────── */
  toJSON() {
    return {
      cols:   this.cols,
      rows:   this.rows,
      seed:   this.seed,
      grid:   Array.from(this.grid),  // sauvegarder la grille entière
    };
  }

  static fromJSON(data) {
    const lab = new Labyrinth({ cols: data.cols, rows: data.rows, seed: data.seed });
    lab.grid = new Uint8Array(data.grid);
    lab._generated = true;
    return lab;
  }

  /* ──────────────────────────────────────────────────────────────
     UTILITAIRES
  ────────────────────────────────────────────────────────────── */
  resize(cols, rows) {
    this.cols   = cols;
    this.rows   = rows;
    this.finish = { x: cols - 1, y: rows - 1 };
    this.grid   = new Uint8Array(cols * rows);
    this._generated = false;
    this.solved = false;
    this.solutionPath = [];
    return this;
  }

  getDifficulty() {
    const n = this.cols * this.rows;
    if (n <= 100) return 'facile';
    if (n <= 400) return 'moyen';
    return 'difficile';
  }
}

/* ─────────────────────────────────────────────
   EXPORT (Electron / Node require + ES module)
───────────────────────────────────────────── */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Labyrinth, WALL, OPPOSITE, DIR_DELTA };
}