"use strict";
/* ============================================================
   game.js — Twelve Men's Morris: rules engine + UI
   Board: 24 points = three concentric squares (corners+midpoints),
   4 cross-arms, 4 diagonals. 20 mill lines.
   ============================================================ */

/* ================= ENGINE ================= */
const ENGINE = window.ENGINE = window.ENGINE || {};

// -- Point layout (viewBox 0 0 800 800) --
// Outer square: corners 0,2,4,6; midpoints 1,3,5,7 (clockwise from top-left)
// Middle square: 8..15   Inner square: 16..23 (same scheme)
const P = ENGINE.P = [
  [ 80,  80], [400,  80], [720,  80],   // 0  1  2   outer top
  [720, 400], [720, 720],               // 3  4      outer right/bottom-right
  [400, 720], [ 80, 720],               // 5  6      outer bottom
  [ 80, 400],                           // 7         outer left
  [200, 200], [400, 200], [600, 200],   // 8  9 10   middle top
  [600, 400], [600, 600],               // 11 12     middle right/bottom-right
  [400, 600], [200, 600],               // 13 14     middle bottom
  [200, 400],                           // 15        middle left
  [320, 320], [400, 320], [480, 320],   // 16 17 18  inner top
  [480, 400], [480, 480],               // 19 20     inner right/bottom-right
  [400, 480], [320, 480],               // 21 22     inner bottom
  [320, 400]                            // 23        inner left
];

// -- Adjacency: ONE STEP along square sides, cross-arms, and diagonals.
// A slide can never skip over the middle point of a line (no jumping).
const ADJ = ENGINE.ADJ = [
  /* 0 */ [1, 7, 8],
  /* 1 */ [0, 2, 9],
  /* 2 */ [1, 3, 10],
  /* 3 */ [2, 4, 11],
  /* 4 */ [3, 5, 12],
  /* 5 */ [4, 6, 13],
  /* 6 */ [5, 7, 14],
  /* 7 */ [6, 0, 15],
  /* 8 */ [9, 15, 0, 16],   // middle-ring corner: BOTH diagonal steps
  /* 9 */ [1, 8, 10, 17],   // arm midpoint: outward (1) and inward (17)
  /* 10 */ [9, 11, 2, 18],
  /* 11 */ [3, 10, 12, 19],
  /* 12 */ [11, 13, 4, 20],
  /* 13 */ [5, 12, 14, 21],
  /* 14 */ [13, 15, 6, 22],
  /* 15 */ [7, 14, 8, 23],
  /* 16 */ [17, 23, 8],
  /* 17 */ [9, 16, 18],
  /* 18 */ [10, 17, 19],
  /* 19 */ [11, 18, 20],
  /* 20 */ [12, 19, 21],
  /* 21 */ [13, 20, 22],
  /* 22 */ [14, 21, 23],
  /* 23 */ [15, 16, 22]
];

// -- 20 mill lines --
const MILLS = ENGINE.MILLS = [
  // outer square sides
  [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
  // middle square sides
  [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
  // inner square sides
  [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
  // cross-arms
  [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23],
  // diagonals
  [0, 8, 16], [2, 10, 18], [4, 12, 20], [6, 14, 22]
];

const EMPTY = ENGINE.EMPTY = ".";
const TOTAL_PER_PLAYER = 12;

// mills a point belongs to (precomputed)
const MILLS_THROUGH = ENGINE.MILLS_THROUGH = P.map((_, i) =>
  MILLS.filter(line => line.includes(i))
);

ENGINE.millsThrough = i => MILLS_THROUGH[i];

// -- State --
ENGINE.newGame = function () {
  return {
    points: Array(24).fill(EMPTY),
    turn: "w",                 // 'w' = White/ivory, 'b' = Black
    phase: "place",            // 'place' | 'move'
    hand: { w: TOTAL_PER_PLAYER, b: TOTAL_PER_PLAYER },
    lost: { w: 0, b: 0 },
    anyCaptureEver: false,
    pendingRemoval: false,
    gameOver: false,
    winner: null,              // 'w' | 'b' | 'draw'
    endReason: null
  };
};

ENGINE.cloneState = function (st) {
  return {
    points: st.points.slice(),
    turn: st.turn,
    phase: st.phase,
    hand: { w: st.hand.w, b: st.hand.b },
    lost: { w: st.lost.w, b: st.lost.b },
    anyCaptureEver: st.anyCaptureEver,
    pendingRemoval: !!st.pendingRemoval,
    gameOver: st.gameOver,
    winner: st.winner,
    endReason: st.endReason
  };
};

ENGINE.isClosedMill = function (st, line, player) {
  return line.every(p => st.points[p] === player);
};

// All mills currently owned by a player (as line arrays)
ENGINE.millsOf = function (st, player) {
  return MILLS.filter(line => ENGINE.isClosedMill(st, line, player));
};

ENGINE.hasAnyMillOf = function (st, player) {
  return ENGINE.millsOf(st, player).length > 0;
};

// Can this enemy piece be removed? (protected unless all enemy pieces are in mills)
ENGINE.removableTargets = function (st, capturer) {
  const victim = capturer === "w" ? "b" : "w";
  const victimPoints = [];
  for (let i = 0; i < 24; i++) if (st.points[i] === victim) victimPoints.push(i);
  if (!victimPoints.length) return [];
  const allInMills = victimPoints.every(p =>
    MILLS_THROUGH[p].some(line => ENGINE.isClosedMill(st, line, victim))
  );
  if (allInMills) return victimPoints;
  return victimPoints.filter(p =>
    !MILLS_THROUGH[p].some(line => ENGINE.isClosedMill(st, line, victim))
  );
};

// Where can the piece on `from` slide? (flying handled by caller)
ENGINE.legalDestinations = function (st, from) {
  return ADJ[from].filter(to => st.points[to] === EMPTY);
};

ENGINE.playersOnBoardCount = function (st, player) {
  let n = 0;
  for (const v of st.points) if (v === player) n++;
  return n;
};

ENGINE.isFlying = function (st, player) {
  return ENGINE.playersOnBoardCount(st, player) === 3 && st.phase === "move";
};

// All sources the player can move from (phase-aware)
ENGINE.movablePoints = function (st, player) {
  if (st.phase !== "move" || st.gameOver) return [];
  const mine = [];
  for (let i = 0; i < 24; i++) if (st.points[i] === player) mine.push(i);
  if (ENGINE.isFlying(st, player)) return mine;
  return mine.filter(from => ADJ[from].some(to => st.points[to] === EMPTY));
};

ENGINE.pieceCount = function (st, player) {
  return ENGINE.playersOnBoardCount(st, player) + st.hand[player];
};

// Legal moves for a player across phases. Returns list of
// {type:'place', to} | {type:'move', from, to} | {type:'remove', to}
ENGINE.legalMovesFor = function (st, player) {
  if (st.gameOver) return [];
  if (st.phase === "place") {
    if (st.hand[player] <= 0) return [];
    const out = [];
    for (let i = 0; i < 24; i++) if (st.points[i] === EMPTY) out.push({ type: "place", to: i });
    return out;
  }
  const out = [];
  if (ENGINE.pieceCount(st, player) <= 2) return out; // already lost
  const flying = ENGINE.isFlying(st, player);
  for (const from of ENGINE.movablePoints(st, player)) {
    if (flying) {
      for (let to = 0; to < 24; to++) if (st.points[to] === EMPTY) out.push({ type: "move", from, to });
    } else {
      for (const to of ENGINE.legalDestinations(st, from)) out.push({ type: "move", from, to });
    }
  }
  return out;
};

// Apply a move to state (mutates). Returns {mill, gameOver, winner, endReason}
ENGINE.applyMove = function (st, move) {
  const res = { mill: false, gameOver: false, winner: null, endReason: null };
  const me = st.turn, opp = me === "w" ? "b" : "w";

  let millsBefore = null;
  if (move.type === "move") {
    millsBefore = ENGINE.millsOf(st, me).map(l => l.join(","));
  }

  if (move.type === "place") {
    st.points[move.to] = me;
    st.hand[me]--;
  } else {
    st.points[move.from] = EMPTY;
    st.points[move.to] = me;
  }

  // Detect NEW mills (a mill reformed after breaking also counts).
  const millsNow = ENGINE.millsOf(st, me);
  if (millsNow.length) {
    const fresh = move.type === "place"
      ? MILLS_THROUGH[move.to].some(l => ENGINE.isClosedMill(st, l, me))
      : millsNow.some(l => !millsBefore.includes(l.join(",")));
    res.mill = fresh;
  }

  if (res.mill) {
    if (ENGINE.removableTargets(st, me).length > 0) {
      st.pendingRemoval = true;
    }
    // else: opponent has no pieces on board yet — capture is simply skipped
  }

  // End of turn bookkeeping (engine-level; UI orchestrates removal)
  if (!st.pendingRemoval) ENGINE.endTurnCheck(st, res);
  return res;
};

// Remove an opponent piece after a mill; mutates state.
ENGINE.applyRemoval = function (st, point) {
  const me = st.turn, opp = me === "w" ? "b" : "w";
  st.points[point] = EMPTY;
  st.lost[opp]++;
  st.anyCaptureEver = true;
  st.pendingRemoval = false;
  const res = { gameOver: false, winner: null, endReason: null };
  ENGINE.endTurnCheck(st, res);
  return res;
};

// Auto-removal used by the AI search so a mill+capture resolves in one step.
ENGINE.autoRemove = function (st) {
  const targets = ENGINE.removableTargets(st, st.turn);
  if (!targets.length) { st.pendingRemoval = false; return null; }
  let best = targets[0], bestN = -1;
  for (const t of targets) {
    const n = ENGINE.millsThrough(t).length;
    if (n > bestN) { bestN = n; best = t; }
  }
  return ENGINE.applyRemoval(st, best);
};

// Called after a full move (incl. removal) — switch turn and check ends.
ENGINE.endTurnCheck = function (st, res) {
  const me = st.turn, opp = me === "w" ? "b" : "w";

  // Opponent reduced to 2 total pieces?
  if (ENGINE.pieceCount(st, opp) <= 2) {
    st.gameOver = true; st.winner = me; res.gameOver = true;
    res.winner = me; res.endReason = "pieces"; return;
  }
  // Board full, no captures ever, both hands empty -> draw
  if (st.hand.w === 0 && st.hand.b === 0 &&
      !st.anyCaptureEver &&
      ENGINE.playersOnBoardCount(st, "w") + ENGINE.playersOnBoardCount(st, "b") === 24) {
    st.gameOver = true; st.winner = "draw"; res.gameOver = true;
    res.winner = "draw"; res.endReason = "draw"; return;
  }
  // Phase switch when both hands empty
  if (st.hand.w === 0 && st.hand.b === 0 && st.phase === "place") {
    st.phase = "move";
  }
  // Switch turn; if new player cannot move -> previous player wins.
  st.turn = opp;
  if (st.phase === "move" && ENGINE.legalMovesFor(st, opp).length === 0) {
    st.gameOver = true; st.winner = me; res.gameOver = true;
    res.winner = me; res.endReason = "blocked";
  }
};

ENGINE.isDraw = function (st) {
  return st.gameOver && st.winner === "draw";
};

/* ================= UI ================= */
(function UI() {
  const $ = id => document.getElementById(id);
  const SVGNS = "http://www.w3.org/2000/svg";

  const boardSvg = $("board");
  const statusMsg = $("status-msg");
  const historyEl = $("history");
  const phaseLine = $("phase-line");

  /* ================= SOUND (Web Audio, no files) ================= */
  const SFX = (function () {
    let ctx = null;
    let enabled = true;
    try { enabled = localStorage.getItem("tmm.sound") !== "off"; } catch (_) { /* private mode */ }

    function ac() {
      if (!enabled) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx;
    }

    function env(g, t, peak, dur) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }

    function tone(type, f0, f1, t, dur, peak) {
      const c = ac(); if (!c) return;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      env(g, t, peak, dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.05);
    }

    function noise(t, dur, type, f0, f1, peak) {
      const c = ac(); if (!c) return;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource(); src.buffer = buf;
      const flt = c.createBiquadFilter();
      flt.type = type; flt.Q.value = 0.9;
      flt.frequency.setValueAtTime(f0, t);
      if (f1 && f1 !== f0) flt.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = c.createGain();
      env(g, t, peak, dur);
      src.connect(flt); flt.connect(g); g.connect(c.destination);
      src.start(t); src.stop(t + dur + 0.05);
    }

    return {
      get enabled() { return enabled; },
      toggle() {
        enabled = !enabled;
        try { localStorage.setItem("tmm.sound", enabled ? "on" : "off"); } catch (_) {}
        if (enabled) { const c = ac(); if (c) tone("sine", 880, 880, c.currentTime, 0.08, 0.12); }
        return enabled;
      },
      place()  { const c = ac(); if (!c) return; const t = c.currentTime;
                 noise(t, 0.07, "bandpass", 750, 750, 0.5);
                 tone("sine", 170, 75, t, 0.09, 0.35); },
      slide()  { const c = ac(); if (!c) return;
                 noise(c.currentTime, 0.16, "lowpass", 350, 1500, 0.18); },
      select() { const c = ac(); if (!c) return;
                 tone("sine", 950, 950, c.currentTime, 0.035, 0.1); },
      mill()   { const c = ac(); if (!c) return; const t = c.currentTime;
                 tone("triangle", 784, 784, t, 0.3, 0.3);
                 tone("triangle", 1174.7, 1174.7, t + 0.09, 0.38, 0.28);
                 tone("sine", 1568, 1568, t + 0.09, 0.3, 0.08); },
      capture(){ const c = ac(); if (!c) return; const t = c.currentTime;
                 noise(t, 0.05, "highpass", 1600, 1600, 0.4);
                 tone("square", 280, 95, t + 0.02, 0.22, 0.16);
                 tone("sine", 130, 60, t + 0.03, 0.18, 0.3); },
      win()    { const c = ac(); if (!c) return; const t = c.currentTime;
                 [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
                   tone("triangle", f, f, t + i * 0.13, 0.5, 0.28)); },
      lose()   { const c = ac(); if (!c) return; const t = c.currentTime;
                 [392, 311.1, 233.1].forEach((f, i) =>
                   tone("triangle", f, f, t + i * 0.18, 0.45, 0.25)); },
      draw()   { const c = ac(); if (!c) return; const t = c.currentTime;
                 tone("triangle", 440, 440, t, 0.35, 0.22);
                 tone("triangle", 440, 440, t + 0.25, 0.4, 0.22); }
    };
  })();

  let state = ENGINE.newGame();
  let mode = "computer";        // 'computer' | 'human'
  let difficulty = "medium";
  let selected = null;          // selected own piece index in move phase
  let aiThinking = false;
  let boardWrap = document.querySelector ? document.querySelector(".board-wrap") : null;

  // ----- move history / time travel -----
  // One entry per completed move (a mill + its removal = one turn = one entry).
  //   snapBefore: state before the move; after: state after the whole turn.
  // viewIndex: which entry is shown on the board (null = live position).
  let history = [];
  let viewIndex = null;
  let pendingEntry = null;      // move in progress (mill made, removal pending)
  let gen = 0;                  // bumped on undo/new game: invalidates queued AI timers
  // Slow-motion animation of the computer's piece in flight: so its move can
  // actually be followed. {from, to, t0, dur} or null when idle.
  let aiAnim = null;

  // ----- static board drawing -----
  function el(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (parent || boardSvg).appendChild(e);
    return e;
  }

  function drawStaticBoard() {
    boardSvg.innerHTML = "";
    // carved point dots
    const dots = el("g", { fill: "var(--line)" });
    for (const [x, y] of P) el("circle", { cx: x, cy: y, r: 5 }, dots);
    const g = el("g", { stroke: "var(--line)", "stroke-width": 7, "stroke-linecap": "round", fill: "none" });
    // three squares
    square(g, 80, 720); square(g, 200, 600); square(g, 320, 480);
    // cross-arms
    line(g, 400, 80, 400, 320); line(g, 400, 480, 400, 720);
    line(g, 80, 400, 320, 400); line(g, 480, 400, 720, 400);
    // diagonals
    line(g, 80, 80, 320, 320); line(g, 720, 80, 480, 320);
    line(g, 720, 720, 480, 480); line(g, 80, 720, 320, 480);
  }

  function square(g, a, b) {
    el("rect", { x: a, y: a, width: b - a, height: b - a }, g);
  }
  function line(g, x1, y1, x2, y2) {
    el("line", { x1, y1, x2, y2 }, g);
  }

  // ----- dynamic layer -----
  let hintsG = null, piecesG = null, fxG = null;

  function ensureGroups() {
    if (!hintsG) hintsG = el("g", {});
    if (!piecesG) piecesG = el("g", {});
    if (!fxG) fxG = el("g", {});
    if (hintsG.parentNode !== boardSvg) boardSvg.appendChild(hintsG);
    if (piecesG.parentNode !== boardSvg) boardSvg.appendChild(piecesG);
    boardSvg.appendChild(fxG); // FX layer stays last => always on top
    hintsG.innerHTML = "";
  }

  function addHintPoint(i, cls) {
    const [x, y] = P[i];
    // invisible oversized hit circle: comfortable finger target on touch screens
    const hit = el("circle", { cx: x, cy: y, r: 48, fill: "transparent", class: "hit-area" }, hintsG);
    hit.style.pointerEvents = "auto";
    hit.setAttribute("role", "button");
    hit.setAttribute("aria-label", "point " + pointName(i));
    const c = el("circle", { cx: x, cy: y, r: 17, class: cls }, hintsG);
    c.style.pointerEvents = "none";
    const activate = ev => { ev.stopPropagation(); onPointClick(i); };
    hit.addEventListener("click", activate);
    c.addEventListener("click", activate);
    return c;
  }

  function addPiece(i, owner, cls) {
    const [x, y] = P[i];
    const g = el("g", { class: "piece " + (cls || ""), filter: "url(#piece-shadow)" }, piecesG);
    g.setAttribute("data-point", i);
    const body = el("circle", { cx: x, cy: y, r: 27, class: "piece-body" }, g);
    body.setAttribute("fill", owner === "w" ? "url(#grad-w)" : "url(#grad-b)");
    body.setAttribute("stroke", owner === "w" ? "#3f2f1a" : "#050403");
    body.setAttribute("stroke-width", "3");
    const sheen = (() => {
      if (owner === "w") {
        el("circle", { cx: x, cy: y, r: 22.5, fill: "none", stroke: "rgba(63,47,26,.35)", "stroke-width": "2" }, g);
        return el("circle", { cx: x - 8, cy: y - 9, r: 8, fill: "rgba(255,255,255,.5)" }, g);
      }
      el("circle", { cx: x, cy: y, r: 23.5, fill: "none", stroke: "rgba(238,226,199,.85)", "stroke-width": "2.5" }, g);
      el("circle", { cx: x - 8, cy: y - 9, r: 9, fill: "rgba(255,255,255,.28)" }, g);
      return el("circle", { cx: x - 4, cy: y - 5, r: 3.5, fill: "rgba(255,255,255,.35)" }, g);
    })();
    sheen.style.pointerEvents = "none";
    // oversized invisible hit circle for touch (adjacent points are 120 units apart)
    const hit = el("circle", { cx: x, cy: y, r: 48, fill: "transparent", class: "piece-hit" }, g);
    hit.style.pointerEvents = "none";
    return g;
  }

  function addGradients() {
    const defs = el("defs", {});
    const shadow = el("filter", { id: "piece-shadow", x: "-40%", y: "-40%", width: "180%", height: "180%" }, defs);
    el("feDropShadow", { dx: 0, dy: 3, stdDeviation: 2.5, "flood-color": "#241505", "flood-opacity": 0.55 }, shadow);
    const gw = el("radialGradient", { id: "grad-w", cx: "35%", cy: "30%", r: "75%" }, defs);
    el("stop", { offset: "0%", "stop-color": "#ffffff" }, gw);
    el("stop", { offset: "45%", "stop-color": "#f8f3e6" }, gw);
    el("stop", { offset: "100%", "stop-color": "#d3c39c" }, gw);
    const gb = el("radialGradient", { id: "grad-b", cx: "35%", cy: "30%", r: "75%" }, defs);
    el("stop", { offset: "0%", "stop-color": "#8a7a66" }, gb);
    el("stop", { offset: "55%", "stop-color": "#332b23" }, gb);
    el("stop", { offset: "100%", "stop-color": "#100c08" }, gb);
  }

  // ----- effects layer (capture animation, mill flash) -----
  function clearFx() { if (fxG) fxG.innerHTML = ""; }

  function flashMill(mline) {
    for (let k = 0; k < 2; k++) {
      const [x1, y1] = P[mline[k]], [x2, y2] = P[mline[k + 1]];
      const l = el("line", {
        x1, y1, x2, y2, class: "mill-flash",
        stroke: "var(--hl)", "stroke-width": 8, "stroke-linecap": "round"
      }, fxG);
      l.style.pointerEvents = "none";
    }
    setTimeout(() => {
      if (fxG) fxG.querySelectorAll(".mill-flash").forEach(n => n.remove());
    }, 1100);
  }

  function captureFx(point, victim) {
    const [x, y] = P[point];
    const pieceEl = piecesG.querySelector('.piece[data-point="' + point + '"]');
    if (pieceEl) {
      fxG.appendChild(pieceEl);            // detach so render() can't erase the ghost
      pieceEl.classList.add("capture-anim");
    }
    const shards = el("g", { class: "shards" }, fxG);
    const fill = victim === "w" ? "#d9c9a3" : "#4a3f33";
    const n = 8;
    for (let k = 0; k < n; k++) {
      const ang = (k / n) * Math.PI * 2 + Math.random() * 0.7;
      const dist = 55 + Math.random() * 80;
      const s = el("circle", {
        cx: x + (Math.random() * 14 - 7),
        cy: y + (Math.random() * 14 - 7),
        r: 3.5 + Math.random() * 4,
        fill, class: "shard"
      }, shards);
      s.style.setProperty("--dx", (Math.cos(ang) * dist).toFixed(1) + "px");
      s.style.setProperty("--dy", (Math.sin(ang) * dist).toFixed(1) + "px");
      s.style.animationDelay = Math.round(Math.random() * 70) + "ms";
    }
    setTimeout(() => {
      if (pieceEl) pieceEl.remove();
      shards.remove();
    }, 950);
  }

  // ----- rendering -----
  function render() {
    ensureGroups();
    if (viewIndex !== null) clearFx(); // no ghosts over reviewed positions
    const shown = viewIndex !== null && history[viewIndex] && history[viewIndex].after
      ? history[viewIndex].after : null;
    renderPieces(shown);
    renderHints();
    renderPanel();
    refreshHistoryMarks();
    if (boardWrap) boardWrap.classList.toggle("reviewing", viewIndex !== null);
    const banner = $("review-banner");
    if (banner) {
      banner.classList.toggle("hidden", viewIndex === null);
      if (viewIndex !== null) banner.textContent = `Move ${viewIndex + 1} / ${history.length}`;
    }
  }

  function renderPieces(shown) {
    const st = shown || state;
    piecesG.innerHTML = "";
    const millPieces = new Set();
    for (const line of ENGINE.millsOf(st, "w")) line.forEach(p => millPieces.add("w" + p));
    for (const line of ENGINE.millsOf(st, "b")) line.forEach(p => millPieces.add("b" + p));
    for (let i = 0; i < 24; i++) {
      const v = st.points[i];
      if (v === EMPTY) continue;
      const isMine = v === st.turn;
      // clickable own pieces in move phase
      let cls = "";
      if (millPieces.has(v + i)) cls += "mill-piece";
      const g = addPiece(i, v, cls.trim());
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", (v === "w" ? "white" : "black") + " piece at " + pointName(i));
      if (viewIndex === null && st === state && state.phase === "move" && !state.gameOver && isMine &&
          (mode === "human" || state.turn === "w") &&
          ENGINE.movablePoints(state, v).includes(i)) {
        g.classList.add("selectable");
        g.style.pointerEvents = "auto";
        const body = g.querySelector(".piece-body");
        const hit = g.querySelector(".piece-hit");
        const activate = ev => { ev.stopPropagation(); onPointClick(i); };
        if (hit) hit.style.pointerEvents = "auto";
        body.addEventListener("click", activate);
        if (hit) hit.addEventListener("click", activate);
      }
      if (selected === i) {
        const ring = document.createElementNS(SVGNS, "circle");
        ring.setAttribute("cx", P[i][0]); ring.setAttribute("cy", P[i][1]);
        ring.setAttribute("r", 33); ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "var(--hl)"); ring.setAttribute("stroke-width", 5);
        ring.setAttribute("class", "selected-ring");
        piecesG.appendChild(ring);
      }
    }
  }

  function renderHints() {
    hintsG.innerHTML = "";
    if (viewIndex !== null) {
      // Reviewing an old position: highlight the move's points, allow nothing.
      const e = history[viewIndex];
      if (e && e.move) {
        addHintPoint(e.move.to, "dest-ring");
        if (e.move.type === "move") addHintPoint(e.move.from, "dest-ring");
      }
      return;
    }
    if (state.gameOver) return;
    if (state.pendingRemoval) {
      for (const t of ENGINE.removableTargets(state, state.turn)) {
        addHintPoint(t, "target-ring");
      }
      return;
    }
    if (state.phase === "place") {
      for (let i = 0; i < 24; i++) if (state.points[i] === EMPTY) addHintPoint(i, "dest-ring");
    } else if (selected !== null) {
      const flying = ENGINE.isFlying(state, state.turn);
      const dests = flying
        ? [...Array(24).keys()].filter(i => state.points[i] === EMPTY)
        : ENGINE.legalDestinations(state, selected);
      for (const d of dests) addHintPoint(d, "dest-ring");
    }
  }

  function renderPanel() {
    $("hand-w").textContent = state.hand.w;
    $("hand-b").textContent = state.hand.b;
    $("board-w").textContent = ENGINE.playersOnBoardCount(state, "w");
    $("board-b").textContent = ENGINE.playersOnBoardCount(state, "b");
    $("lost-w").textContent = state.lost.w;
    $("lost-b").textContent = state.lost.b;
    const viewing = viewIndex !== null;
    $("card-w").classList.toggle("active", !viewing && state.turn === "w" && !state.gameOver);
    $("card-b").classList.toggle("active", !viewing && state.turn === "b" && !state.gameOver);
    $("btn-undo").disabled = aiThinking || history.length === 0;
    const maxIdx = history.length - 1;
    const curIdx = viewing ? viewIndex : maxIdx;
    $("nav-first").disabled = maxIdx < 0 || curIdx <= 0;
    $("nav-prev").disabled = maxIdx < 0 || curIdx <= 0;
    $("nav-next").disabled = !viewing || curIdx >= maxIdx;
    $("nav-last").disabled = !viewing || curIdx >= maxIdx;

    const names = { w: playerName("w"), b: playerName("b") };
    phaseLine.textContent = state.phase === "place"
      ? `Placing phase — ${state.hand.w + state.hand.b} pieces to place`
      : (state.gameOver ? "Game over" : "Moving phase");
    if (!state.gameOver) {
      if (state.pendingRemoval) {
        statusMsg.textContent = `${cap(names[state.turn])} formed a mill — remove an enemy piece`;
      } else if (state.phase === "place") {
        statusMsg.textContent = `${cap(names[state.turn])} to place a piece`;
      } else {
        statusMsg.textContent = selected === null
          ? `${cap(names[state.turn])}: pick a piece to move`
          : `${cap(names[state.turn])}: pick a highlighted point`;
      }
    }
    if (viewing) {
      statusMsg.textContent = `Reviewing move ${viewIndex + 1} of ${history.length} — click ⏭ to return to the game`;
      phaseLine.textContent = `Reviewing move ${viewIndex + 1} / ${history.length}`;
    }
  }

  function playerName(color) {
    if (mode === "human") return color === "w" ? "White" : "Black";
    return color === "w" ? "You (White)" : `Computer (${difficulty})`;
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function log() {
    // rows are rendered by renderHistory(); kept as a no-op shim
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    const total = history.length;
    for (let k = total - 1; k >= 0; k--) {
      const row = document.createElement("div");
      row.className = "hist-row";
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      const isCurrent = (viewIndex === null) ? k === total - 1 : k === viewIndex;
      if (isCurrent) row.classList.add("current");
      row.textContent = (k + 1) + ". " + history[k].text;
      const open = () => setView(k);
      row.addEventListener("click", open);
      row.addEventListener("keydown", ev => {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); open(); }
      });
      historyEl.appendChild(row);
    }
    historyEl.scrollTop = 0;
  }

  function refreshHistoryMarks() { renderHistory(); }

  // ----- time travel -----
  function setView(k) {
    if (k === null || k >= history.length) { returnToLive(); return; }
    viewIndex = Math.max(0, k);
    selected = null;
    render();
  }

  function setViewRel(delta) {
    setView((viewIndex === null ? history.length - 1 : viewIndex) + delta);
  }

  function returnToLive() {
    viewIndex = null;
    selected = null;
    render();
  }

  function undoMove() {
    if (aiThinking || !history.length) return;
    let k = history.length - 1;
    if (mode === "computer") {
      // Revert to the human's previous decision point: never undo into a
      // position where it is the computer's turn.
      while (k >= 0 && history[k].player !== "w") k--;
      if (k < 0) return;
    }
    const entry = history[k];
    state = ENGINE.cloneState(entry.snapBefore);
    history.length = k;
    viewIndex = null;
    selected = null;
    pendingEntry = null;
    aiAnim = null;             // stop any in-flight AI glide
    clearFx();
    gen++;                     // cancel any queued AI timer
    aiThinking = false;
    render();
    saveGame();
  }

  // ----- auto-save / resume (localStorage) -----
  const SAVE_KEY = "tmm.save";
  function saveGame() {
    if (state.gameOver) return;
    if (!history.length) return; // nothing worth resuming yet
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        v: 1, mode, difficulty, state,
        history, pendingEntry, when: Date.now()
      }));
    } catch (_) { /* storage full / private mode */ }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* ignore */ }
  }
  function loadSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (!d || d.v !== 1 || !d.state || d.state.gameOver) return null;
      return d;
    } catch (_) { return null; }
  }
  function showResumeOffer() {
    const box = $("resume-offer");
    if (!box) return;
    const d = loadSave();
    if (!d) { box.classList.add("hidden"); return; }
    const n = (d.history || []).length + (d.pendingEntry ? 1 : 0);
    $("resume-detail").textContent =
      (d.mode === "computer" ? `vs Computer (${d.difficulty})` : "Two players") +
      ` · move ${Math.max(1, n)}` +
      (d.state.pendingRemoval ? " · capture pending" : "");
    box.classList.remove("hidden");
  }
  function resumeGame() {
    const d = loadSave();
    if (!d) return;
    mode = d.mode;
    difficulty = d.difficulty || difficulty;
    state = d.state;
    history = d.history || [];
    pendingEntry = d.pendingEntry || null;
    viewIndex = null; selected = null; aiThinking = false;
    aiAnim = null;             // stale in-flight animation after resume
    gen++;
    $("end-overlay").classList.add("hidden");
    $("start-screen").classList.add("hidden");
    $("game-screen").classList.remove("hidden");
    render();
    if (mode === "computer" && state.turn === "b" && !state.gameOver) {
      if (state.pendingRemoval) aiRemove(); else aiTurn();
    }
  }

  // ----- input -----
  function onPointClick(i) {
    if (viewIndex !== null) return; // reviewing an old position: read-only
    if (state.gameOver || aiThinking) return;
    if (mode === "computer" && state.turn === "b") return;
    humanAct(i);
  }

  function humanAct(i) {
    if (state.pendingRemoval) {
      const targets = ENGINE.removableTargets(state, state.turn);
      if (targets.includes(i)) doRemoval(i);
      return;
    }
    if (state.phase === "place") {
      if (state.points[i] !== EMPTY) return;
      doMove({ type: "place", to: i });
    } else {
      const v = state.points[i];
      if (v === state.turn && ENGINE.movablePoints(state, state.turn).includes(i)) {
        const was = selected;
        selected = (selected === i) ? null : i;
        if (selected !== null && selected !== was) SFX.select();
        render();
        return;
      }
      if (selected !== null && v === EMPTY) {
        const flying = ENGINE.isFlying(state, state.turn);
        const ok = flying ? true : ENGINE.legalDestinations(state, selected).includes(i);
        if (ok) {
          const mv = { type: "move", from: selected, to: i };
          selected = null;
          doMove(mv);
          return;
        }
      }
      selected = null;
      render();
    }
  }

  function doMove(move) {
    const who = state.turn;
    const snapBefore = ENGINE.cloneState(state);
    const done = ENGINE.applyMove(state, move);
    if (done.mill) {
      SFX.mill();
      const ml = ENGINE.millsThrough(move.to).find(l => ENGINE.isClosedMill(state, l, who));
      if (ml) flashMill(ml);
    } else if (move.type === "place") SFX.place();
    else SFX.slide();
    const described = describeText(who, move);
    pendingEntry = { move, player: who, snapBefore, described };
    describeMove(who, move, done);
    render();
    if (done.gameOver) {
      pushEntry(pendingEntry, ENGINE.cloneState(state), described);
      finishGame(done); return;
    }
    if (state.pendingRemoval) {
      // Wait for the removal click (human or auto for AI)
      saveGame();               // resume point: capture pending
      if (mode === "computer" && who === "b") aiRemove();
      return;
    }
    pushEntry(pendingEntry, ENGINE.cloneState(state), described);
    afterTurn();
  }

  function doRemoval(point) {
    const who = state.turn;
    captureFx(point, who === "w" ? "b" : "w");   // animate before state erases the piece
    SFX.capture();
    const done = ENGINE.applyRemoval(state, point);
    const entry = pendingEntry || { move: null, player: who, snapBefore: null, described: who === "w" ? "White" : "Black" };
    const text = entry.described + `; removes at ${pointName(point)}`;
    pendingEntry = null;
    render();
    pushEntry(entry, ENGINE.cloneState(state), text);
    if (done.gameOver) { finishGame(done); return; }
    afterTurn();
  }

  function describeText(who, move) {
    const name = who === "w" ? "White" : "Black";
    if (move.type === "place") return `${name} places at ${pointName(move.to)}`;
    return `${name} moves ${pointName(move.from)} → ${pointName(move.to)}`;
  }

  function describeMove(who, move, done) {
    log(describeText(who, move));
    if (done.mill) log(`${who === "w" ? "White" : "Black"} forms a mill!`);
  }

  function pushEntry(entry, snapAfter, text) {
    if (!entry) return;
    entry.snapAfter = snapAfter;
    entry.text = text;
    pendingEntry = null;
    history.push(entry);
    if (viewIndex !== null) viewIndex = null; // a new move ends reviewing
    saveGame();
  }

  function pointName(i) {
    const axis = [80, 200, 320, 400, 480, 600, 720];
    const letters = "ABCDEFG";
    const [x, y] = P[i];
    const col = letters[axis.indexOf(x)];
    const row = 7 - axis.indexOf(y);
    return `${col}${row}`;
  }

  function afterTurn() {
    render();
    if (mode === "computer" && state.turn === "b" && !state.gameOver) {
      aiTurn();
    }
  }

  // ----- AI -----
  function aiTurn() {
    if (viewIndex !== null) return; // reviewing: don't move on stale state
    aiThinking = true;
    const myGen = gen;
    statusMsg.textContent = "Computer is thinking…";
    setTimeout(() => {
      if (myGen !== gen) return; // game was undone/reset meanwhile
      const mv = window.AI.chooseMove(state, difficulty);
      if (!mv) { // cannot move — already handled by engine, but just in case
        aiThinking = false;
        return;
      }
      // Show the move slowly instead of snapping it onto the board.
      aiAnimateMove(mv, myGen);
    }, 350);
  }

  // Slow, followable animation of the computer's move. A placement fades in
  // under a shrinking landing ring; a slide visibly travels from its origin
  // to its destination. A short hold after landing lets the move sink in
  // before the turn is finalized.
  function aiAnimateMove(mv, myGen) {
    const place = mv.type === "place";
    const fadeMs = 600;                     // landing fade-in (placements)
    const travelMs = place ? 0 : 1400;      // glide time (slides)
    const holdMs = 600;                     // pause after landing
    const total = (place ? fadeMs : travelMs) + holdMs;
    const t0 = performance.now();
    const ease = t => t * t * (3 - 2 * t);  // smoothstep
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      aiAnim = null; // user asked for no motion — just play the move
      doMove(mv);
      return;
    }
    aiAnim = { from: mv.from, to: mv.to };
    aiThinking = false;                     // clicks stay blocked by turn check

    // highlight the destination for the whole animation
    const ring = el("circle", {
      cx: P[mv.to][0], cy: P[mv.to][1], r: 33,
      fill: "none", stroke: "var(--hl)", "stroke-width": 5,
      class: "ai-land-ring"
    }, fxG);
    ring.style.pointerEvents = "none";

    // a ghost piece above the FX layer that fades in (place) or glides (move);
    // the real piece only appears when the move is finalized below.
    const ghost = addPiece(place ? mv.to : mv.from, "b", "ai-anim-piece");
    fxG.appendChild(ghost);
    ghost.style.pointerEvents = "none";
    if (place) ghost.style.opacity = "0";

    render();
    if (!place) {
      // hide the piece at the origin so the glide reads as "it left from here"
      const orig = piecesG.querySelector('.piece[data-point="' + mv.from + '"]');
      if (orig) orig.style.opacity = "0";
    }
    statusMsg.textContent = place
      ? `Computer places at ${pointName(mv.to)}…`
      : `Computer moves ${pointName(mv.from)} → ${pointName(mv.to)}…`;

    const tick = now => {
      if (myGen !== gen || !aiAnim) return; // reset/undo: stop dead
      const t = now - t0;
      if (place) {
        ghost.style.opacity = String(Math.min(1, t / fadeMs));
      } else {
        const p = ease(Math.min(1, t / travelMs));
        const x = P[mv.from][0] + (P[mv.to][0] - P[mv.from][0]) * p;
        const y = P[mv.from][1] + (P[mv.to][1] - P[mv.from][1]) * p;
        ghost.setAttribute("transform",
          `translate(${(x - P[mv.from][0]).toFixed(1)} ${(y - P[mv.from][1]).toFixed(1)})`);
      }
      if (t < total) { requestAnimationFrame(tick); return; }
      finalizeAiMove(mv, myGen);
    };
    requestAnimationFrame(tick);
  }

  function finalizeAiMove(mv, myGen) {
    if (myGen !== gen) return;   // game was undone/reset meanwhile
    aiAnim = null;
    doMove(mv);                  // commit: real board now shows the move
    // drop the animation ghosts (they live in fxG, which render() preserves)
    if (fxG) fxG.querySelectorAll(".ai-anim-piece, .ai-land-ring").forEach(n => n.remove());
  }

  function aiRemove() {
    if (viewIndex !== null) return; // reviewing: don't act on stale state
    aiThinking = true;
    const myGen = gen;
    setTimeout(() => {
      if (myGen !== gen) return; // game was undone/reset meanwhile
      const st = ENGINE.cloneState(state);
      const targets = ENGINE.removableTargets(st, "b");
      // pick the target that hurts most: prefer pieces in opponent's potential mills
      let best = targets[0], bestScore = -1;
      for (const t of targets) {
        let score = ENGINE.millsThrough(t).length * 10;
        // if white would complete a mill through t, prioritize
        for (const lineOf of ENGINE.millsThrough(t)) {
          const w = lineOf.filter(p => st.points[p] === "w").length;
          const e = lineOf.filter(p => st.points[p] === ".").length;
          if (w === 2 && e === 1) score += 50;
        }
        if (score > bestScore) { bestScore = score; best = t; }
      }
      aiThinking = false;
      doRemoval(best);
    }, 450);
  }

  // ----- game end / screens -----
  function finishGame(done) {
    clearSave();
    if (done.winner === "draw") SFX.draw();
    else if (mode === "computer") { if (done.winner === "w") SFX.win(); else SFX.lose(); }
    else SFX.win();
    const overlay = $("end-overlay");
    const icon = $("end-icon");
    const title = $("end-title");
    const detail = $("end-detail");
    if (done.winner === "draw") {
      icon.textContent = "🤝";
      title.textContent = "Draw";
      detail.textContent = "The board filled up with no capture ever made.";
    } else {
      const winnerName = done.winner === "w" ? playerName("w") : playerName("b");
      const youWon = mode === "human" ? true : done.winner === "w";
      icon.textContent = mode === "human" ? "🏆" : (youWon ? "🏆" : "💻");
      title.textContent = `${winnerName} wins`;
      detail.textContent = done.endReason === "blocked"
        ? "The opponent has no legal move."
        : "The opponent was reduced to two pieces.";
      if (mode === "computer") {
        detail.textContent += youWon ? " Well played!" : " Better luck next time!";
      }
    }
    overlay.classList.remove("hidden");
    render();
  }

  function newGame(m, d) {
    mode = m; difficulty = d || difficulty;
    state = ENGINE.newGame();
    selected = null; aiThinking = false;
    history = []; pendingEntry = null; viewIndex = null;
    aiAnim = null;             // no glide from the previous game
    clearFx();
    gen++;
    clearSave();
    historyEl.innerHTML = "";
    $("end-overlay").classList.add("hidden");
    $("start-screen").classList.add("hidden");
    $("game-screen").classList.remove("hidden");
    log(`New game — ${mode === "computer" ? "vs computer (" + difficulty + ")" : "two players"}`);
    render();
    if (mode === "computer" && state.turn === "b") aiTurn();
  }

  function showMenu() {
    history = []; pendingEntry = null; viewIndex = null;
    aiAnim = null;
    clearFx();
    gen++;
    $("game-screen").classList.add("hidden");
    $("start-screen").classList.remove("hidden");
    $("difficulty-picker").classList.add("hidden");
    $("end-overlay").classList.add("hidden");
    showResumeOffer();
  }

  // ----- wiring -----
  $("btn-vs-computer").addEventListener("click", () => {
    $("difficulty-picker").classList.toggle("hidden");
  });
  document.querySelectorAll(".btn-diff").forEach(b =>
    b.addEventListener("click", () => newGame("computer", b.dataset.diff))
  );
  $("btn-vs-human").addEventListener("click", () => newGame("human"));
  $("btn-new").addEventListener("click", () => newGame(mode, difficulty));
  $("btn-rematch").addEventListener("click", () => newGame(mode, difficulty));
  $("btn-menu").addEventListener("click", showMenu);
  $("btn-end-menu").addEventListener("click", showMenu);
  $("btn-undo").addEventListener("click", undoMove);
  $("btn-resume").addEventListener("click", resumeGame);
  $("btn-discard").addEventListener("click", () => {
    clearSave();
    $("resume-offer").classList.add("hidden");
  });
  function syncSoundBtn() {
    const b = $("btn-sound");
    if (!b) return;
    b.textContent = SFX.enabled ? "\uD83D\uDD0A" : "\uD83D\uDD07";
    b.title = SFX.enabled ? "Mute sounds (M)" : "Unmute sounds (M)";
    b.setAttribute("aria-pressed", String(SFX.enabled));
    b.setAttribute("aria-label", b.title);
  }
  $("btn-sound").addEventListener("click", () => { SFX.toggle(); syncSoundBtn(); });
  $("nav-first").addEventListener("click", () => setView(0));
  $("nav-prev").addEventListener("click", () => setViewRel(-1));
  $("nav-next").addEventListener("click", () => setViewRel(1));
  $("nav-last").addEventListener("click", () => returnToLive());
  $("btn-rules").addEventListener("click", () => $("rules-modal").classList.remove("hidden"));
  $("btn-rules-start").addEventListener("click", () => $("rules-modal").classList.remove("hidden"));
  $("btn-rules-close").addEventListener("click", () => $("rules-modal").classList.add("hidden"));
  $("rules-modal").addEventListener("click", e => {
    if (e.target === $("rules-modal")) $("rules-modal").classList.add("hidden");
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!$("rules-modal").classList.contains("hidden")) $("rules-modal").classList.add("hidden");
      else if (viewIndex !== null) returnToLive();
    }
    if (viewIndex !== null && e.key === "ArrowLeft") setViewRel(-1);
    if (viewIndex !== null && e.key === "ArrowRight") setViewRel(1);
    if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      SFX.toggle(); syncSoundBtn();
    }
  });

  // ----- boot -----
  drawStaticBoard();
  addGradients();
  render();
  syncSoundBtn();
  showResumeOffer();

  // Debug/inspection hook (read-only + repaint)
  window.__game = {
    get state() { return state; },
    get mode() { return mode; },
    get difficulty() { return difficulty; },
    get sound() { return SFX.enabled; },
    render
  };
})();
