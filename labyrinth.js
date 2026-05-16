/**
 * labyrinth.js
 * Génération de labyrinthe : Recursive Backtracking (DFS)
 * Résolution              : BFS (Breadth-First Search)
 * Affichage               : Canvas HTML5
 */

class Labyrinth {

  constructor(cols, rows, seed) {
    this.cols     = cols;
    this.rows     = rows;
    this.seed     = seed || Math.floor(Math.random() * 999999);
    this.cellSize = 20;

    // Grille : chaque cellule stocke ses passages ouverts
    // N = 1, S = 2, E = 4, W = 8
    this.grid = [];
    for (var i = 0; i < cols * rows; i++) {
      this.grid.push(0);
    }

    this.cheminSolution = []; // rempli par resoudre()
  }

  // ── Accès à la grille ──────────────────────────

  index(x, y) {
    return y * this.cols + x;
  }

  dansGrille(x, y) {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  aPassage(x, y, direction) {
    var bits = { N: 1, S: 2, E: 4, W: 8 };
    return (this.grid[this.index(x, y)] & bits[direction]) !== 0;
  }

  ouvrirPassage(x, y, direction) {
    var bits    = { N: 1, S: 2, E: 4, W: 8 };
    var oppose  = { N: 'S', S: 'N', E: 'W', W: 'E' };
    var delta   = { N: [0,-1], S: [0,1], E: [1,0], W: [-1,0] };
    var dx = delta[direction][0];
    var dy = delta[direction][1];
    var nx = x + dx;
    var ny = y + dy;
    this.grid[this.index(x, y)]   |= bits[direction];
    this.grid[this.index(nx, ny)] |= bits[oppose[direction]];
  }

  // ── Générateur pseudo-aléatoire (déterministe) ──

  creerRNG(seed) {
    var s = seed >>> 0;
    return function() {
      s += 0x6d2b79f5;
      var t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ── GÉNÉRATION — Recursive Backtracking (DFS) ──

  generer() {
    var rng      = this.creerRNG(this.seed);
    var visite   = [];
    var delta    = { N: [0,-1], S: [0,1], E: [1,0], W: [-1,0] };
    var directions = ['N', 'S', 'E', 'W'];

    for (var i = 0; i < this.cols * this.rows; i++) {
      visite.push(false);
    }

    var pile = [{ x: 0, y: 0 }];
    visite[this.index(0, 0)] = true;

    while (pile.length > 0) {
      var actuel = pile[pile.length - 1];

      // Mélanger les directions aléatoirement
      for (var i = directions.length - 1; i > 0; i--) {
        var j = Math.floor(rng() * (i + 1));
        var temp = directions[i];
        directions[i] = directions[j];
        directions[j] = temp;
      }

      var bouge = false;
      for (var d = 0; d < directions.length; d++) {
        var dir = directions[d];
        var nx = actuel.x + delta[dir][0];
        var ny = actuel.y + delta[dir][1];

        if (this.dansGrille(nx, ny) && !visite[this.index(nx, ny)]) {
          this.ouvrirPassage(actuel.x, actuel.y, dir);
          visite[this.index(nx, ny)] = true;
          pile.push({ x: nx, y: ny });
          bouge = true;
          break;
        }
      }

      if (!bouge) {
        pile.pop(); // Backtrack
      }
    }

    return this;
  }

  // ── RÉSOLUTION — BFS ───────────────────────────

  resoudre() {
    var delta  = { N: [0,-1], S: [0,1], E: [1,0], W: [-1,0] };
    var depart = { x: 0, y: 0 };
    var arrivee = { x: this.cols - 1, y: this.rows - 1 };

    var visite  = [];
    var parent  = [];
    for (var i = 0; i < this.cols * this.rows; i++) {
      visite.push(false);
      parent.push(-1);
    }

    var file = [depart];
    visite[this.index(depart.x, depart.y)] = true;

    while (file.length > 0) {
      var actuel = file.shift();

      if (actuel.x === arrivee.x && actuel.y === arrivee.y) break;

      var dirs = ['N', 'S', 'E', 'W'];
      for (var d = 0; d < dirs.length; d++) {
        var dir = dirs[d];
        if (!this.aPassage(actuel.x, actuel.y, dir)) continue;

        var nx = actuel.x + delta[dir][0];
        var ny = actuel.y + delta[dir][1];

        if (!this.dansGrille(nx, ny)) continue;
        if (visite[this.index(nx, ny)]) continue;

        visite[this.index(nx, ny)] = true;
        parent[this.index(nx, ny)] = this.index(actuel.x, actuel.y);
        file.push({ x: nx, y: ny });
      }
    }

    // Reconstituer le chemin de l'arrivée jusqu'au départ
    var chemin = [];
    var pos = this.index(arrivee.x, arrivee.y);
    while (pos !== -1) {
      chemin.unshift({
        x: pos % this.cols,
        y: Math.floor(pos / this.cols)
      });
      pos = parent[pos];
    }

    this.cheminSolution = chemin;
    return chemin;
  }

  // ── AFFICHAGE sur Canvas ───────────────────────

  afficher(canvas) {
    var ctx = canvas.getContext('2d');
    var cs  = this.cellSize;
    var W   = this.cols * cs;
    var H   = this.rows * cs;

    canvas.width  = W;
    canvas.height = H;

    // Fond
    ctx.fillStyle = '#0d0f13';
    ctx.fillRect(0, 0, W, H);

    // Afficher le chemin solution si disponible
    if (this.cheminSolution.length > 0) {
      ctx.strokeStyle = 'rgba(59, 232, 176, 0.55)';
      ctx.lineWidth   = cs * 0.38;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      for (var i = 0; i < this.cheminSolution.length; i++) {
        var cx = this.cheminSolution[i].x * cs + cs / 2;
        var cy = this.cheminSolution[i].y * cs + cs / 2;
        if (i === 0) ctx.moveTo(cx, cy);
        else         ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Dessiner les murs
    ctx.strokeStyle = '#f0c040';
    ctx.lineWidth   = 1.5;

    for (var y = 0; y < this.rows; y++) {
      for (var x = 0; x < this.cols; x++) {
        var px = x * cs;
        var py = y * cs;

        ctx.beginPath();

        // Mur Nord
        if (!this.aPassage(x, y, 'N')) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cs, py);
        }
        // Mur Ouest
        if (!this.aPassage(x, y, 'W')) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cs);
        }
        // Mur Sud (seulement dernière ligne)
        if (y === this.rows - 1 && !this.aPassage(x, y, 'S')) {
          ctx.moveTo(px, py + cs);
          ctx.lineTo(px + cs, py + cs);
        }
        // Mur Est (seulement dernière colonne)
        if (x === this.cols - 1 && !this.aPassage(x, y, 'E')) {
          ctx.moveTo(px + cs, py);
          ctx.lineTo(px + cs, py + cs);
        }

        ctx.stroke();
      }
    }

    // Point de départ (vert)
    ctx.fillStyle = '#3be8b0';
    ctx.beginPath();
    ctx.arc(cs / 2, cs / 2, cs * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Point d'arrivée (rouge)
    ctx.fillStyle = '#ff5f6d';
    ctx.beginPath();
    ctx.arc(W - cs / 2, H - cs / 2, cs * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── EXPORT / IMPORT JSON (pour la base SQLite) ──

  versJSON() {
    return {
      cols: this.cols,
      rows: this.rows,
      seed: this.seed,
      grid: this.grid.slice() // copie du tableau
    };
  }

  static depuisJSON(data) {
    var lab = new Labyrinth(data.cols, data.rows, data.seed);
    lab.grid = data.grid.slice();
    return lab;
  }
}

// Export pour Node.js / Electron
if (typeof module !== 'undefined') {
  module.exports = { Labyrinth };
}