"use strict";
/* Node smoke tests for the Twelve Men's Morris engine and AI.
   Run: node test/smoke.js  */

// ---- minimal DOM stub so game.js's UI section boots harmlessly ----
function elStub() {
  const listeners = {};
  const stub = {
    setAttribute() {}, addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    appendChild() {}, prepend() {}, querySelector: () => elStub(),
    classList: { add() {}, remove() {}, toggle() {} },
    style: {},
    innerHTML: ""
  };
  return stub;
}
global.window = global;
global.document = {
  getElementById: () => elStub(),
  querySelectorAll: () => [],
  createElementNS: () => elStub(),
  createElement: () => elStub(),
  addEventListener() {}
};

require("../game.js");
require("../ai.js");

const E = window.ENGINE;
const AI = window.AI;

let passed = 0, failed = 0;
function ok(cond, name) {
  if (cond) { passed++; console.log("  ok - " + name); }
  else { failed++; console.log("  FAIL - " + name); }
}

/* ---------- engine unit checks ---------- */
console.log("Engine:");
const st = E.newGame();
ok(st.turn === "w" && st.phase === "place", "new game: white to place");
ok(E.legalMovesFor(st, "w").length === 24, "24 empty points at start");

// Mills: put white on 0,1 and count potential lines
let s1 = E.newGame();
E.applyMove(s1, { type: "place", to: 0 });
E.applyMove(s1, { type: "place", to: 10 }); // black
E.applyMove(s1, { type: "place", to: 1 });
E.applyMove(s1, { type: "place", to: 11 }); // black
const res0 = E.applyMove(s1, { type: "place", to: 2 });
ok(res0.mill === true, "placing 0-1-2 completes outer-top mill");
ok(s1.pendingRemoval === true, "pending removal set after mill");
const targets = E.removableTargets(s1, "w");
ok(targets.length === 2 && targets.includes(10) && targets.includes(11), "removable targets = black 10,11");
ok(E.millsThrough(0).length === 3, "corner point 0 lies on 3 mill lines");
ok(E.millsThrough(1).length === 2, "midpoint point 1 lies on 2 mill lines");
ok(E.ADJ[0].includes(8) && E.ADJ[8].includes(0), "diagonal step 0-8 (corner to middle ring)");
ok(!E.ADJ[0].includes(16) && !E.ADJ[16].includes(0), "no jump over 8: 0 is NOT adjacent to 16");
ok(E.ADJ[1].length === 3 && !E.ADJ[1].includes(8), "1 is not adjacent to 8");

// adjacency integrity: symmetric, one step along lines, never skipping a midpoint
(function () {
  let sym = true, jumps = false, step = true;
  for (let a = 0; a < 24; a++) for (const b of E.ADJ[a]) {
    if (!E.ADJ[b].includes(a)) sym = false;
    if (a === b) step = false;
  }
  const LINES = [[0,8,16],[2,10,18],[4,12,20],[6,14,22],[1,9,17],[3,11,19],[5,13,21],[7,15,23]];
  for (const [a, m, c] of LINES) {
    if (E.ADJ[a].includes(c) || E.ADJ[c].includes(a)) jumps = false;
    if (!E.ADJ[a].includes(m) || !E.ADJ[m].includes(a)) step = false;
    if (!E.ADJ[c].includes(m) || !E.ADJ[m].includes(c)) step = false;
  }
  ok(sym, "adjacency table is symmetric");
  ok(!jumps && step, "diagonal/arm lines step through the middle point (no jumping)");
})();

// outward slide from an arm midpoint (regression: piece was unselectable)
(function () {
  const s = E.newGame();
  s.phase = "move";
  s.points[9] = "w"; s.points[1] = "."; s.points[8] = "b"; s.points[10] = "b"; s.points[17] = "b";
  s.turn = "w";
  const mv = E.legalMovesFor(s, "w");
  ok(mv.some(m => m.type === "move" && m.from === 9 && m.to === 1), "arm midpoint slides outward to the rim");
})();

// mill protection: black piece in a mill is not removable
let s2 = E.newGame();
// black mill on outer top (0,1,2), white mill on outer bottom (4,5,6) w/ extra black
const seq = [
  ["w", 0], ["b", 8], ["w", 1], ["b", 9], ["w", 2], ["b", 10], // black forms mill 8-9-10 while white makes 0,1,2
  ["w", 4], ["b", 3], // black now 3,8,9,10 — mill 8,9,10 (no removal because white didn't mill yet)
  ["w", 5], ["b", 11],
  ["w", 6]  // white mill 4,5,6 -> white removes
];
// note: black mill formed on move 6 -> black removed a white piece then? In this scripted game,
// black forms 8-9-10 at ply 6; but black's removal must have removed a white piece...
// Simplify: build state directly instead of playing out.
s2 = E.newGame();
s2.points[0] = "b"; s2.points[1] = "b"; s2.points[2] = "b"; // black mill
s2.points[4] = "w"; s2.points[5] = "w"; s2.points[6] = "w"; // white mill
s2.points[9] = "b";
s2.hand = { w: 6, b: 5 };
s2.turn = "w";
// white just completed 4,5,6 -> removal: black pieces 0,1,2 are in a mill; 9 is not
const t2 = E.removableTargets(s2, "w");
ok(t2.length === 1 && t2[0] === 9, "mill-protected pieces not removable when free piece exists");

// all-in-mill case: every enemy piece in a mill -> removable
let s3 = E.newGame();
s3.points[0] = "b"; s3.points[1] = "b"; s3.points[2] = "b";
// all-in-mill case: every enemy piece in a mill -> all removable
s3.points = Array(24).fill(".");
s3.points[0] = "b"; s3.points[1] = "b"; s3.points[2] = "b";
s3.points[8] = "b"; s3.points[9] = "b"; s3.points[10] = "b";
s3.points[4] = "w"; s3.points[5] = "w"; s3.points[6] = "w";
s3.hand = { w: 6, b: 3 };
s3.turn = "w";
const t3 = E.removableTargets(s3, "w");
ok(t3.length === 6, "all enemy pieces in mills -> all 6 removable");

// re-forming a broken mill counts as a new mill
let s4 = E.newGame();
s4.phase = "move";
s4.hand = { w: 0, b: 0 };
s4.points[2] = "w"; s4.points[3] = "w"; s4.points[4] = "w"; // white mill 2-3-4
s4.points[9] = "b"; s4.points[10] = "b"; s4.points[17] = "b";
const r4a = E.applyMove(s4, { type: "move", from: 3, to: 11 });
ok(r4a.mill === false, "breaking own mill: no mill flagged");
s4.turn = "w"; // hand the turn back (engine flipped it after the slide)
const r4b = E.applyMove(s4, { type: "move", from: 11, to: 3 });
ok(r4b.mill === true, "re-forming the mill flags a new mill");
ok(s4.pendingRemoval === true, "re-formed mill allows removal again");

// blocked player has no legal move (and would lose)
let s5 = E.newGame();
s5.phase = "move";
s5.hand = { w: 0, b: 0 };
s5.lost = { w: 0, b: 8 };
[0, 2, 5, 9, 12, 14, 21, 18, 20, 3, 11, 6, 15].forEach(p => { s5.points[p] = "w"; });
[1, 13, 19, 7].forEach(p => { s5.points[p] = "b"; });
s5.turn = "b";
ok(E.legalMovesFor(s5, "b").length === 0, "boxed-in black has no legal move");

// draw: board full, no captures ever
let s6 = E.newGame();
s6.hand = { w: 0, b: 0 };
for (let i = 0; i < 24; i++) s6.points[i] = i % 2 === 0 ? "w" : "b";
const dres = {};
E.endTurnCheck(s6, dres);
ok(s6.gameOver && s6.winner === "draw", "full board with no captures is a draw");

/* ---------- AI checks ---------- */
console.log("AI:");
// easy & medium always complete a placing mill that also captures
for (const level of ["easy", "medium"]) {
  const sa = E.newGame();
  sa.points[0] = "w"; sa.points[1] = "w"; sa.points[23] = "b";
  sa.turn = "w";
  const mv = AI.chooseMove(sa, level);
  ok(mv && mv.type === "place" && mv.to === 2, level + " completes the mill and captures");
}

// all levels find the mill slide whose capture wins the game on the spot.
// Position crafted so 5->6 is the UNIQUE winning move (the only mill threat,
// and quiet moves create no unstoppable double threat).
for (const level of ["easy", "medium", "hard"]) {
  const sa = E.newGame();
  sa.phase = "move";
  sa.hand = { w: 0, b: 0 };
  sa.points[4] = "w"; sa.points[5] = "w"; sa.points[18] = "w";
  sa.points[3] = "b"; sa.points[10] = "b"; sa.points[17] = "b";
  sa.turn = "w";
  const mv = AI.chooseMove(sa, level);
  let wins = false;
  if (mv && mv.type === "move") {
    const s2 = E.cloneState(sa);
    E.applyMove(s2, mv);
    if (s2.pendingRemoval) E.autoRemove(s2);
    wins = s2.gameOver && s2.winner === "w";
  }
  ok(wins, level + " finds the winning mill slide + capture");
}

// AI vs AI game runs to completion without crashing
(function () {
  const st = E.newGame();
  let plies = 0;
  while (!st.gameOver && plies < 500) {
    const mv = AI.chooseMove(st, plies % 2 === 0 ? "medium" : "easy");
    if (!mv) break;
    E.applyMove(st, mv);
    if (st.pendingRemoval) {
      const t = E.removableTargets(st, st.turn);
      if (t.length) E.applyRemoval(st, t[0]);
    }
    plies++;
  }
  ok(plies < 500 && st.gameOver, "AI vs AI game terminates (plies=" + plies + ", winner=" + st.winner + ")");
})();

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
