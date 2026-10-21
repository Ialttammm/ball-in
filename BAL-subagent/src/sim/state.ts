// src/sim/state.ts
// TASK 05 — match state creation and cell/unit queries.

import type { MatchState, PlayerId, Unit, UnitKind } from './types';
import { ELIXIR_START, PASS_RADIUS_MIN, STRENGTH_SCALE } from './types';
import { assertDeck } from './deck';
import { getDef } from './roster';
import { forward } from './geometry';

/** Create a fresh match. Throws assertDeck errors on invalid decks. */
export function createMatch(bottomDeck: UnitKind[], topDeck: UnitKind[]): MatchState {
  assertDeck(bottomDeck);
  assertDeck(topDeck);
  return {
    tickIndex: 0,
    phase: 'playing',
    winner: null,
    endReason: null,
    nextUnitId: 1,
    units: [],
    ball: { mode: 'neutral', lane: 2, tile: 10, carrierId: null },
    players: {
      bottom: { elixir: ELIXIR_START, queue: bottomDeck.slice(), touchdowns: 0 },
      top: { elixir: ELIXIR_START, queue: topDeck.slice(), touchdowns: 0 },
    },
    kickoffTicks: 0,
  };
}

/** All live units. */
export function aliveUnits(state: MatchState): Unit[] {
  return state.units.filter(u => u.alive);
}

/** A copy of `units` sorted by ascending id (stable processing order). */
export function byId(units: Unit[]): Unit[] {
  return units.slice().sort((a, b) => a.id - b.id);
}

/** Look up a unit by id; null if absent or already compacted away. */
export function unitById(state: MatchState, id: number): Unit | null {
  const found = state.units.find(u => u.id === id);
  if (found === undefined) return null;
  return found;
}

/** Alive units standing on a given cell, in id order. */
export function unitsOnCell(state: MatchState, lane: number, tile: number): Unit[] {
  return byId(state.units.filter(u => u.alive && u.lane === lane && u.tile === tile));
}

/** The lowest-id enemy alive on a cell, or null. */
export function enemyOnCell(state: MatchState, owner: PlayerId, lane: number, tile: number): Unit | null {
  const found = unitsOnCell(state, lane, tile).filter(u => u.owner !== owner);
  if (found.length === 0) return null;
  return found[0];
}

/** The lowest-id friendly (except ignoreId) alive on a cell, or null. */
export function friendlyOnCell(state: MatchState, owner: PlayerId, lane: number, tile: number, ignoreId: number): Unit | null {
  const found = unitsOnCell(state, lane, tile).filter(u => u.owner === owner && u.id !== ignoreId);
  if (found.length === 0) return null;
  return found[0];
}

/** The enemy sharing this tile, or on the next tile, or null. */
export function facingEnemy(state: MatchState, unit: Unit): Unit | null {
  if (!unit.alive) return null;
  const shared = enemyOnCell(state, unit.owner, unit.lane, unit.tile);
  if (shared !== null) return shared;
  const tile = unit.tile + forward(unit.owner);
  if (tile < 0 || tile > 20) return null;
  return enemyOnCell(state, unit.owner, unit.lane, tile);
}

/** Spawn a unit at (lane, tile) with roster-derived stats; id starts at 1. */
export function addUnit(state: MatchState, args: { owner: PlayerId; kind: UnitKind; lane: number; tile: number }): Unit {
  const def = getDef(args.kind);
  const unit: Unit = {
    id: state.nextUnitId,
    owner: args.owner,
    kind: args.kind,
    role: def.role,
    lane: args.lane,
    tile: args.tile,
    strength: def.strength * STRENGTH_SCALE,
    speed: def.speed,
    moveAcc: 0,
    travelAcc: 0,
    momentum: 0,
    momentumSinceContest: 0,
    tilesSinceDeploy: 0,
    holdingBall: false,
    inContest: false,
    pinballHeading: -1,
    sweeperShifted: false,
    alive: true,
    burnLeft: 0,
    passRadius: Math.max(PASS_RADIUS_MIN, def.strength),
    passRadiusAcc: 0,
  };
  state.nextUnitId += 1;
  state.units.push(unit);
  return unit;
}

/** Drop dead units out of the live array. */
export function compactUnits(state: MatchState): void {
  state.units = state.units.filter(u => u.alive);
}
