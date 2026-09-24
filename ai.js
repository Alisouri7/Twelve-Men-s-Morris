'use strict';

/**
 * Twelve Men's Morris — computer opponent.
 *
 * Public API (used by game.js UI and test/smoke.js):
 *   AI.chooseMove(state, level)
 *     level: 'easy' | 'medium' | 'hard'
 *     returns { type:'place', to } | { type:'move', from, to } | null
 *     The player to move is always state.turn.
 *
 * Removals after a completed mill are handled by the game UI (game.js's
 * aiRemove picks the target), so the AI here only chooses placements/slides.
 *
 * Depends on the rules engine exposed as window.ENGINE by game.js:
 *   newGame, cloneState, legalMovesFor, applyMove, applyRemoval,
 *   autoRemove, removableTargets, millsOf, millsThrough, MILLS,
 *   MILLS_THROUGH, pieceCount
 */

(function () {
  function getEngine() {
    if (typeof window !== 'undefined' && window.ENGINE) return window.ENGINE;
    if (typeof global !== 'undefined' && global.ENGINE) return global.ENGINE;
    if (typeof require === 'function') {
      require('./game.js'); // sets global.window.ENGINE in node
      if (typeof window !== 'undefined' && window.ENGINE) return window.ENGINE;
    }
    throw new Error('ENGINE not found — load game.js before ai.js');
  }

  // ------------------------------------------------------------ helpers

  function randOf(arr) { return arr[(Math.random() * arr.length) | 0]; }

  /** Clone → apply move → auto-resolve a mill capture. Pure w.r.t. input. */
  function simulate(E, st, move) {
    const clone = E.cloneState(st);
    const res = E.applyMove(clone, move);
    if (clone.pendingRemoval) E.autoRemove(clone);
    return { st: clone, mill: res.mill };
  }

  /** Does `move` complete a mill? (non-mutating) */
  function moveMakesMill(E, st, move) {
    const clone = E.cloneState(st);
    return E.applyMove(clone, move).mill;
  }

  /** Static evaluation from `me`'s perspective. */
  function evaluate(E, st, me) {
    const opp = me === 'w' ? 'b' : 'w';
    let myThreats = 0, oppThreats = 0, myStr = 0, oppStr = 0;
    for (const line of E.MILLS) {
      let m = 0, o = 0, e = 0;
      for (const p of line) {
        const v = st.points[p];
        if (v === me) m++; else if (v === opp) o++; else e++;
      }
      if (m === 2 && e === 1) myThreats++;
      if (o === 2 && e === 1) oppThreats++;
    }
    for (let p = 0; p < 24; p++) {
      const v = st.points[p];
      if (v === me) myStr += E.millsThrough(p).length;
      else if (v === opp) oppStr += E.millsThrough(p).length;
    }
    const myMob = E.legalMovesFor(st, me).length;
    const oppMob = E.legalMovesFor(st, opp).length;
    return (E.pieceCount(st, me) - E.pieceCount(st, opp)) * 120
         + (E.millsOf(st, me).length - E.millsOf(st, opp).length) * 80
         + (myThreats - oppThreats) * 26
         + (myStr - oppStr) * 6
         + (myMob - oppMob) * 5;
  }

  /** Quick ordering heuristic for a candidate move (higher searched first). */
  function orderScore(E, st, move, me) {
    const opp = me === 'w' ? 'b' : 'w';
    let s = 0;
    if (moveMakesMill(E, st, move)) s += 1000;
    for (const line of E.MILLS_THROUGH[move.to]) {
      let o = 0, m = 0;
      for (const p of line) {
        const v = st.points[p];
        if (v === opp) o++; else if (v === me) m++;
      }
      if (o === 2 && m === 0) s += 320;      // blocks an opponent mill threat
      else if (m === 2 && o === 0) s += 90;  // extends an own threat
    }
    s += E.millsThrough(move.to).length * 12; // prefer strong intersections
    return s;
  }

  // --------------------------------------------------------------- easy

  function easyMove(E, st) {
    const moves = E.legalMovesFor(st, st.turn);
    if (!moves.length) return null;
    const mills = moves.filter(mv => moveMakesMill(E, st, mv));
    return mills.length ? randOf(mills) : randOf(moves);
  }

  // ------------------------------------------------------------- medium

  function mediumMove(E, st) {
    const me = st.turn, opp = me === 'w' ? 'b' : 'w';
    const moves = E.legalMovesFor(st, me);
    if (!moves.length) return null;

    let best = null, bestScore = -Infinity;
    for (const mv of moves) {
      let s = orderScore(E, st, mv, me) * 0.6;
      const sim = simulate(E, st, mv);
      s += evaluate(E, sim.st, me) * 0.4;
      // penalize leaving the opponent an immediate mill completion
      if (!sim.st.gameOver) {
        for (const reply of E.legalMovesFor(sim.st, opp)) {
          if (moveMakesMill(E, sim.st, reply)) { s -= 70; break; }
        }
      }
      s += Math.random() * 12; // tie-break variety
      if (s > bestScore) { bestScore = s; best = mv; }
    }
    return best;
  }

  // --------------------------------------------------------------- hard

  const WIN = 1000000;

  /** Alpha-beta minimax, score from the root player's (`me`) perspective. */
  function alphabeta(E, st, depth, alpha, beta, me, ctx) {
    ctx.nodes++;
    if (st.gameOver) {
      if (st.winner === 'draw') return 0;
      return st.winner === me ? WIN + depth : -(WIN + depth);
    }
    if (depth <= 0 || ctx.nodes > ctx.budget) return evaluate(E, st, me);

    const mover = st.turn;
    const maximizing = mover === me;
    const moves = E.legalMovesFor(st, mover);
    moves.sort((a, b) => orderScore(E, st, b, mover) - orderScore(E, st, a, mover));

    let best = maximizing ? -Infinity : Infinity;
    for (const mv of moves) {
      const sim = simulate(E, st, mv);
      const v = alphabeta(E, sim.st, depth - 1, alpha, beta, me, ctx);
      if (maximizing) {
        if (v > best) best = v;
        if (best > alpha) alpha = best;
      } else {
        if (v < best) best = v;
        if (best < beta) beta = best;
      }
      if (alpha >= beta) break;
      if (ctx.nodes > ctx.budget) break;
    }
    return best;
  }

  function hardMove(E, st) {
    const me = st.turn;
    const moves = E.legalMovesFor(st, me);
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];

    moves.sort((a, b) => orderScore(E, st, b, me) - orderScore(E, st, a, me));

    const ctx = { nodes: 0, budget: 120000 };
    let best = moves[0], bestScore = -Infinity;
    for (const mv of moves) {
      const sim = simulate(E, st, mv);
      let v;
      if (sim.st.gameOver) {
        v = sim.st.winner === 'draw' ? 0
          : (sim.st.winner === me ? WIN + 3 : -(WIN + 3));
      } else {
        v = alphabeta(E, sim.st, 2, -Infinity, Infinity, me, ctx); // depth 3 total
      }
      v += Math.random() * 2; // jitter among near-equal moves
      if (v > bestScore) { bestScore = v; best = mv; }
      if (ctx.nodes > ctx.budget) break; // out of budget — keep best found
    }
    return best;
  }

  // -------------------------------------------------------------- public

  /** Choose a move for state.turn. Returns move object or null. */
  function chooseMove(state, level) {
    const E = getEngine();
    if (!state || state.gameOver) return null;
    if (state.pendingRemoval) return null; // removal is handled by the UI
    if (level === 'easy') return easyMove(E, state);
    if (level === 'medium') return mediumMove(E, state);
    return hardMove(E, state);
  }

  const AI = { chooseMove };
  if (typeof window !== 'undefined') window.AI = AI;
  if (typeof module !== 'undefined' && module.exports) module.exports = AI;
})();
