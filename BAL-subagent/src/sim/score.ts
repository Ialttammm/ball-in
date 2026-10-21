// src/sim/score.ts
// TASK 07 — score a touchdown. The first point keeps the troops.

import type { MatchState, PlayerId } from './types';
import { ELIXIR_CAP, KICKOFF_BUFFER_TICKS, TD_TO_WIN } from './types';
import { unitById } from './state';
import { opponentGoalTile } from './geometry';
import { clearHolders } from './ball';

export function scoreTouchdown(state: MatchState, player: PlayerId): void {
  if (state.phase === 'ended') return;
  state.players[player].touchdowns += 1;
  clearHolders(state);
  state.ball = { mode: 'hidden', lane: 2, tile: 10, carrierId: null };
  state.kickoffTicks = 0;
  if (state.players[player].touchdowns >= TD_TO_WIN) {
    state.phase = 'ended';
    state.winner = player;
    state.endReason = 'touchdowns';
    return;
  }
  state.players.bottom.elixir = ELIXIR_CAP;
  state.players.top.elixir = ELIXIR_CAP;
  state.kickoffTicks = KICKOFF_BUFFER_TICKS;
}

export function checkScore(state: MatchState): boolean {
  if (state.phase === 'ended') return true;
  if (state.ball.mode !== 'carried' || state.ball.carrierId === null) return false;
  const c = unitById(state, state.ball.carrierId);
  if (c === null || !c.alive || !c.holdingBall) return false;
  if (c.tile !== opponentGoalTile(c.owner)) return false;
  scoreTouchdown(state, c.owner);
  return true;
}

export function matchEnded(state: MatchState): boolean {
  return state.phase === 'ended';
}

export function endByTime(state: MatchState): void {
  const bottom = state.players.bottom.touchdowns;
  const top = state.players.top.touchdowns;
  state.phase = 'ended';
  state.endReason = 'time';
  if (bottom > top) state.winner = 'bottom';
  else if (top > bottom) state.winner = 'top';
  else state.winner = 'draw';
}
