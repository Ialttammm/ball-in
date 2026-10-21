// src/sim/pass.ts
// Ranked pass and center-lane kick. The button pays 2 elixir.

import type { MatchState, PlayerId, Unit, UnitKind } from './types';
import {
  MOVE_STEP,
  PASS_CATCH_INSET,
  PASS_COST,
  PASS_RADIUS_MIN,
  STRENGTH_SCALE,
} from './types';
import { aliveUnits, enemyOnCell, unitById, unitsOnCell } from './state';
import { forward, interceptorActive, moveAdd, opponentGoalTile } from './geometry';
import { giveBall } from './ball';
import { scoreTouchdown } from './score';

const MOMENTUM_THROW: ReadonlySet<UnitKind> = new Set([
  'passer',
  'sidewinder',
  'pinball',
  'blitz',
]);

export interface PassAim {
  kind: 'unit' | 'post' | 'intercept';
  lane: number;
  tile: number;
  forward: boolean;
  unitId: number | null;
}

interface Candidate {
  kind: 'unit' | 'post';
  lane: number;
  tile: number;
  angle: number;
  distance: number;
  unit: Unit | null;
}

function isForwardOrLevel(from: Unit, to: Unit): boolean {
  if (to.tile === from.tile) return true;
  return (to.tile - from.tile) * forward(from.owner) > 0;
}

export function findPasserTarget(state: MatchState, passer: Unit): Unit | null {
  const cands = aliveUnits(state).filter(
    u => u.owner === passer.owner && u.id !== passer.id && u.kind !== 'bulldozer' && isForwardOrLevel(passer, u),
  );
  if (cands.length === 0) return null;
  cands.sort(
    (a, b) =>
      Math.abs(a.tile - passer.tile) - Math.abs(b.tile - passer.tile) ||
      Math.abs(a.lane - passer.lane) - Math.abs(b.lane - passer.lane) ||
      a.id - b.id,
  );
  return cands[0];
}

export function findInterceptor(state: MatchState, from: Unit, to: Unit): Unit | null {
  const cands: Unit[] = [];
  for (const u of aliveUnits(state)) {
    if (u.kind !== 'interceptor') continue;
    if (u.owner === from.owner) continue;
    if (u.inContest) continue;
    if (!interceptorActive(u.owner, u.tile)) continue;
    if (Math.abs(u.lane - to.lane) !== 1) continue;
    if (Math.abs(u.tile - to.tile) > 1) continue;
    const blockers = unitsOnCell(state, to.lane, u.tile).filter(x => x.id !== u.id);
    if (blockers.length > 0) continue;
    cands.push(u);
  }
  if (cands.length === 0) return null;
  cands.sort(
    (a, b) => Math.abs(a.tile - to.tile) - Math.abs(b.tile - to.tile) || a.id - b.id,
  );
  return cands[0];
}

export function transferPass(
  state: MatchState,
  from: Unit,
  to: Unit,
): 'completed' | 'intercepted' {
  const thief = findInterceptor(state, from, to);
  from.holdingBall = false;
  if (thief !== null) {
    thief.lane = to.lane;
    thief.inContest = false;
    giveBall(state, thief);
    return 'intercepted';
  }
  giveBall(state, to);
  return 'completed';
}

export function targetPassRadius(unit: Unit): number {
  const pips = MOMENTUM_THROW.has(unit.kind) ? unit.momentum : 0;
  return Math.max(PASS_RADIUS_MIN, Math.floor(unit.strength / STRENGTH_SCALE) + pips);
}

export function easePassRadius(unit: Unit): void {
  const target = targetPassRadius(unit);
  if (unit.passRadius === target) {
    unit.passRadiusAcc = 0;
    return;
  }
  const need = MOVE_STEP / moveAdd(unit.speed);
  unit.passRadiusAcc += 1;
  if (unit.passRadiusAcc < need) return;
  unit.passRadiusAcc -= need;
  if (unit.passRadius < target) unit.passRadius += 1;
  else unit.passRadius = Math.max(PASS_RADIUS_MIN, unit.passRadius - 1);
  if (unit.passRadius === target) unit.passRadiusAcc = 0;
}

function carrierOf(state: MatchState, player: PlayerId): Unit | null {
  if (state.ball.mode !== 'carried' || state.ball.carrierId === null) return null;
  const unit = unitById(state, state.ball.carrierId);
  if (unit === null || !unit.alive || !unit.holdingBall || unit.owner !== player) return null;
  return unit;
}

function bearing(from: Unit, lane: number, tile: number): number {
  const ahead = (tile - from.tile) * forward(from.owner);
  const right = (lane - from.lane) * (from.owner === 'bottom' ? 1 : -1);
  let deg = (Math.atan2(right, ahead) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  if (deg >= 360) deg = 0;
  return deg;
}

function gapToZero(deg: number): number {
  return Math.min(deg, 360 - deg);
}

function gapToSideline(deg: number): number {
  return Math.min(Math.abs(deg - 90), Math.abs(deg - 270));
}

function isLong(deg: number): boolean {
  return deg <= 90 || deg >= 270;
}

function gridDistance(lane: number, tile: number, otherLane: number, otherTile: number): number {
  return Math.hypot(lane - otherLane, tile - otherTile);
}

function straightAhead(from: Unit, lane: number, tile: number): boolean {
  return lane === from.lane && (tile - from.tile) * forward(from.owner) > 0;
}

function rankCandidates(from: Unit, candidates: Candidate[]): Candidate | null {
  const long = candidates.filter(c => isLong(c.angle));
  const pool = long.length > 0 ? long : candidates;
  if (pool.length === 0) return null;
  pool.sort((a, b) => {
    if (long.length > 0) {
      const gap = gapToZero(a.angle) - gapToZero(b.angle);
      if (gap !== 0) return gap;
    } else {
      const gap = gapToSideline(a.angle) - gapToSideline(b.angle);
      if (gap !== 0) return gap;
      if (a.lane !== b.lane) return a.lane - b.lane;
    }
    if (a.distance !== b.distance) return a.distance - b.distance;
    if (a.lane !== b.lane) return a.lane - b.lane;
    if (a.kind !== b.kind) return a.kind === 'post' ? -1 : 1;
    return (a.unit?.id ?? 0) - (b.unit?.id ?? 0);
  });
  return pool[0];
}

function aimFrom(state: MatchState, from: Unit, chosen: Candidate): PassAim {
  const ahead = straightAhead(from, chosen.lane, chosen.tile);
  if (ahead) {
    const next = from.tile + forward(from.owner);
    const blocker = enemyOnCell(state, from.owner, from.lane, next);
    if (blocker !== null) {
      return {
        kind: 'intercept',
        lane: blocker.lane,
        tile: blocker.tile,
        forward: true,
        unitId: blocker.id,
      };
    }
  }
  return {
    kind: chosen.kind,
    lane: chosen.lane,
    tile: chosen.tile,
    forward: isLong(chosen.angle),
    unitId: chosen.unit === null ? null : chosen.unit.id,
  };
}

function ranked(state: MatchState, from: Unit): PassAim | null {
  const limit = from.passRadius - PASS_CATCH_INSET;
  const candidates: Candidate[] = [];
  for (const unit of aliveUnits(state)) {
    if (unit.owner !== from.owner || unit.id === from.id || unit.kind === 'bulldozer') continue;
    const distance = gridDistance(from.lane, from.tile, unit.lane, unit.tile);
    if (distance <= 0 || distance > limit) continue;
    candidates.push({
      kind: 'unit',
      lane: unit.lane,
      tile: unit.tile,
      angle: bearing(from, unit.lane, unit.tile),
      distance,
      unit,
    });
  }
  if (from.lane === 2) {
    const postTile = opponentGoalTile(from.owner);
    const distance = gridDistance(from.lane, from.tile, 2, postTile);
    if (distance <= limit) {
      candidates.push({
        kind: 'post',
        lane: 2,
        tile: postTile,
        angle: bearing(from, 2, postTile),
        distance,
        unit: null,
      });
    }
  }
  const chosen = rankCandidates(from, candidates);
  if (chosen === null) return null;
  return aimFrom(state, from, chosen);
}

export function previewPass(state: MatchState, player: PlayerId): PassAim | null {
  if (state.phase !== 'playing' || state.kickoffTicks > 0) return null;
  const from = carrierOf(state, player);
  if (from === null) return null;
  return ranked(state, from);
}

export function passReady(state: MatchState, player: PlayerId): boolean {
  if (state.players[player].elixir < PASS_COST) return false;
  return previewPass(state, player) !== null;
}

export function tryPass(state: MatchState, player: PlayerId): boolean {
  if (!passReady(state, player)) return false;
  const aim = previewPass(state, player);
  if (aim === null) return false;
  state.players[player].elixir -= PASS_COST;
  if (aim.kind === 'intercept') {
    const enemy = aim.unitId === null ? null : unitById(state, aim.unitId);
    if (enemy === null) return true;
    giveBall(state, enemy);
    return true;
  }
  if (aim.kind === 'post') {
    scoreTouchdown(state, player);
    return true;
  }
  const mate = aim.unitId === null ? null : unitById(state, aim.unitId);
  if (mate === null) return true;
  giveBall(state, mate);
  return true;
}
