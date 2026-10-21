// src/sim/ball.ts
// TASK 06 — move the ball between units.

import type { MatchState, Unit } from './types';
import { unitById } from './state';

export function clearHolders(state: MatchState): void {
  for (const u of state.units) {
    u.holdingBall = false;
  }
}

export function giveBall(state: MatchState, unit: Unit): void {
  clearHolders(state);
  unit.holdingBall = true;
  state.ball.mode = 'carried';
  state.ball.carrierId = unit.id;
  state.ball.lane = unit.lane;
  state.ball.tile = unit.tile;
}

export function dropBall(state: MatchState, lane: number, tile: number): void {
  clearHolders(state);
  state.ball.mode = 'loose';
  state.ball.carrierId = null;
  state.ball.lane = lane;
  state.ball.tile = tile;
}

export function syncCarried(state: MatchState): void {
  if (state.ball.mode !== 'carried') return;
  if (state.ball.carrierId === null) return;
  const c = unitById(state, state.ball.carrierId);
  if (c === null || !c.alive || !c.holdingBall) return;
  state.ball.lane = c.lane;
  state.ball.tile = c.tile;
}

export function tryPickup(state: MatchState, unit: Unit): boolean {
  if (!unit.alive) return false;
  if (unit.inContest) return false;
  if (unit.kind === 'bulldozer') return false;
  if (unit.holdingBall) return false;
  if (state.ball.mode !== 'neutral' && state.ball.mode !== 'loose') return false;
  if (state.ball.lane !== unit.lane || state.ball.tile !== unit.tile) return false;
  giveBall(state, unit);
  return true;
}

export function killUnit(state: MatchState, unit: Unit): void {
  if (!unit.alive) return;
  const dropped = unit.holdingBall;
  const lane = unit.lane;
  const tile = unit.tile;
  unit.alive = false;
  unit.inContest = false;
  unit.holdingBall = false;
  unit.burnLeft = 0;
  if (dropped) {
    clearHolders(state);
    state.ball.mode = 'loose';
    state.ball.carrierId = null;
    state.ball.lane = lane;
    state.ball.tile = tile;
  }
}
