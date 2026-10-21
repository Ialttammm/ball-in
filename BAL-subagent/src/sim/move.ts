// src/sim/move.ts
// TASK 11 — step units and apply momentum effects.

import {
  MOMENTUM_TILES,
  MOVE_STEP,
  TILE_MAX,
  TILE_MIN,
} from './types';
import type { ApproachResult, MatchState, Unit } from './types';
import { aliveUnits, byId, enemyOnCell, friendlyOnCell, unitById, unitsOnCell } from './state';
import { forward, moveAdd } from './geometry';
import { syncCarried, tryPickup } from './ball';
import { checkScore, matchEnded } from './score';
import { densestOffenseLane, momentumStrengthBonus, pinballDestination, sidewinderLane } from './abilities';
import { applyBulldozer, beginContest } from './contest';

function enterEmpty(state: MatchState, mover: Unit, toLane: number, toTile: number, countTile: boolean): ApproachResult {
  mover.lane = toLane;
  mover.tile = toTile;
  mover.inContest = false;
  if (countTile) {
    mover.tilesSinceDeploy += 1;
    mover.travelAcc += 1;
    if (mover.travelAcc >= MOMENTUM_TILES) {
      mover.travelAcc -= MOMENTUM_TILES;
      mover.momentum += 1;
      mover.momentumSinceContest += 1;
      applyMomentum(state, mover);
      if (state.phase === 'ended' || !mover.alive) return 'scored';
    }
  }
  if (mover.holdingBall) syncCarried(state);
  tryPickup(state, mover);
  if (checkScore(state)) return 'scored';
  return 'entered';
}

export function approachCell(state: MatchState, mover: Unit, toLane: number, toTile: number, countTile: boolean): ApproachResult {
  if (!mover.alive) return 'stayed';
  const friend = friendlyOnCell(state, mover.owner, toLane, toTile, mover.id);
  if (friend !== null) return 'blocked';
  const enemy = enemyOnCell(state, mover.owner, toLane, toTile);
  if (enemy !== null) {
    if (mover.kind === 'bulldozer' || enemy.kind === 'bulldozer') {
      if (mover.kind === 'bulldozer') applyBulldozer(state, mover, enemy);
      else applyBulldozer(state, enemy, mover);
      return 'stayed';
    }
    beginContest(state, mover, enemy);
    if (state.phase === 'ended') return 'scored';
    if (!enemy.alive && friendlyOnCell(state, mover.owner, toLane, toTile, mover.id) === null && enemyOnCell(state, mover.owner, toLane, toTile) === null) {
      return enterEmpty(state, mover, toLane, toTile, countTile);
    }
    if (!mover.alive) return 'stayed';
    return 'blocked';
  }
  return enterEmpty(state, mover, toLane, toTile, countTile);
}

export function tryChangeLane(state: MatchState, unit: Unit, newLane: number): boolean {
  if (!unit.alive) return false;
  if (newLane < 0 || newLane > 4 || newLane === unit.lane) return false;
  if (unitsOnCell(state, newLane, unit.tile).length > 0) return false;
  unit.lane = newLane;
  if (unit.holdingBall) syncCarried(state);
  tryPickup(state, unit);
  checkScore(state);
  return true;
}

export function applyMomentum(state: MatchState, unit: Unit): void {
  if (!unit.alive || state.phase === 'ended') return;
  unit.strength += momentumStrengthBonus(unit);
  if (unit.kind === 'sidewinder' && unit.momentum % 3 === 0) {
    tryChangeLane(state, unit, sidewinderLane(unit));
    if (matchEnded(state) || !unit.alive) return;
  }
  if (unit.kind === 'pinball' && unit.alive) {
    const dest = pinballDestination(unit);
    const moved = tryChangeLane(state, unit, dest.lane);
    if (moved && unit.alive) {
      if (unit.lane === 0) unit.pinballHeading = 1;
      else if (unit.lane === 4) unit.pinballHeading = -1;
      else unit.pinballHeading = dest.heading;
    }
  }
}

export function applySweeperShift(state: MatchState, unit: Unit): void {
  if (unit.kind !== 'sweeper' || unit.sweeperShifted || !unit.alive || unit.inContest) return;
  if (unit.tile !== 10) return;
  unit.sweeperShifted = true;
  const target = densestOffenseLane(aliveUnits(state), unit.lane);
  const dir = Math.sign(target - unit.lane);
  let lane = unit.lane;
  for (let i = 0; i < unit.momentum; i += 1) {
    if (dir === 0) break;
    const next = lane + dir;
    if (next < 0 || next > 4) break;
    if (unitsOnCell(state, next, unit.tile).length > 0) break;
    lane = next;
  }
  unit.lane = lane;
  if (unit.holdingBall) syncCarried(state);
  tryPickup(state, unit);
}

export function stepUnit(state: MatchState, unit: Unit): void {
  if (!unit.alive || unit.inContest || state.phase === 'ended') return;
  unit.moveAcc += moveAdd(unit.speed);
  if (unit.moveAcc < MOVE_STEP) return;
  unit.moveAcc -= MOVE_STEP;
  const toTile = unit.tile + forward(unit.owner);
  if (toTile < TILE_MIN || toTile > TILE_MAX) {
    unit.moveAcc = MOVE_STEP;
    return;
  }
  const result = approachCell(state, unit, unit.lane, toTile, true);
  if (result === 'blocked') unit.moveAcc = MOVE_STEP;
}

export function moveAll(state: MatchState): void {
  const ids = byId(aliveUnits(state)).map(u => u.id);
  for (const id of ids) {
    if (state.phase === 'ended') return;
    const unit = unitById(state, id);
    if (unit === null || !unit.alive || unit.inContest) continue;
    stepUnit(state, unit);
  }
}
