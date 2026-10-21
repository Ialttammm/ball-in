// src/sim/geometry.ts
// TASK 03 — field geometry, movement deltas, and lane helpers.

import type { PlayerId } from './types';
import { TILE_MAX, TILE_MIN, YARDS_PER_TILE } from './types';

/** Advance direction: bottom moves toward tile 0, top moves toward tile 20. */
export function forward(owner: PlayerId): -1 | 1 {
  if (owner === 'bottom') return -1;
  return 1;
}

/** The goal line the owner defends. */
export function ownGoalTile(owner: PlayerId): number {
  if (owner === 'bottom') return 20;
  return 0;
}

/** The goal line the owner attacks (scoring here). */
export function opponentGoalTile(owner: PlayerId): number {
  if (owner === 'bottom') return 0;
  return 20;
}

/** Interceptor is active only on its own half; tile 10 is inactive for both. */
export function interceptorActive(owner: PlayerId, tile: number): boolean {
  if (owner === 'bottom') return tile > 10;
  return tile < 10;
}

/** The tile one step behind the given tile for this owner, clamped to the board. */
export function behindTile(owner: PlayerId, tile: number): number {
  const t = tile - forward(owner);
  if (t < TILE_MIN || t > TILE_MAX) return tile;
  return t;
}

/** Per-tick accumulator increment: speed 1 = 3, speed 2 = 4, speed 3 = 6
 * (one step every MOVE_STEP = 30 accumulator: 10 / 7.5 / 5 ticks). */
export function moveAdd(speed: 1 | 2 | 3): number {
  if (speed === 1) return 3;
  if (speed === 2) return 4;
  return 6;
}

/** Thematic yard position for a tile, 0 at the top edge. */
export function thematicYard(tile: number): number {
  return tile * YARDS_PER_TILE;
}

/** Yard labels from the human end: tile 20 reads 0, tile 0 reads 100. */
export function humanYard(tile: number): number {
  return (TILE_MAX - tile) * YARDS_PER_TILE;
}

/** Display name for a lane. */
export function laneName(lane: number): string {
  if (lane === 0) return 'L1';
  if (lane === 1) return 'L2';
  if (lane === 2) return 'C';
  if (lane === 3) return 'R2';
  if (lane === 4) return 'R1';
  return '?';
}

/** Collapse any lane onto the valid 0..4 range. */
export function clampLane(lane: number): number {
  if (lane < 0) return 0;
  if (lane > 4) return 4;
  return lane;
}
