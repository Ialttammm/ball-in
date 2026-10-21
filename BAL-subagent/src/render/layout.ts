import type { UnitKind } from '../sim/types';
import { TILE_MAX } from '../sim/types';
import { ALL_KINDS } from '../sim/roster';

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const FIELD_X = 390;
export const FIELD_Y = 80;
export const FIELD_W = 500;
export const FIELD_H = 500;
export const LANE_W = 100;
export const HAND_X = 300;
export const HAND_Y = 608;
export const HAND_W = 150;
export const HAND_H = 96;
export const HAND_GAP = 12;
export const NEXT_X = 948;
export const NEXT_Y = 620;
export const NEXT_W = 110;
export const NEXT_H = 72;
export const MENU_X = 1060;
export const MENU_Y = 16;
export const MENU_W = 180;
export const MENU_H = 40;

export const DECK_X = 48;
export const DECK_Y = 110;
export const DECK_W = 220;
export const DECK_H = 72;
export const DECK_COL_GAP = 16;
export const DECK_ROW_GAP = 12;

export const PICK_X = 560;
export const PICK_Y = 110;
export const PICK_W = 280;
export const PICK_H = 36;
export const PICK_GAP = 8;

export const START_X = 560;
export const START_Y = 640;
export const START_W = 240;
export const START_H = 52;

export const PASS_X = 48;
export const PASS_Y = 608;
export const PASS_W = 140;
export const PASS_H = 96;

export function tileToY(tile: number): number {
  return FIELD_Y + (tile * FIELD_H) / TILE_MAX;
}

export function laneToX(lane: number): number {
  return FIELD_X + lane * LANE_W + LANE_W / 2;
}

export function canvasPoint(
  canvas: HTMLCanvasElement,
  event: { clientX: number; clientY: number },
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function inside(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

export function hitHand(x: number, y: number): number | null {
  for (let i = 0; i < 4; i += 1) {
    if (inside(x, y, HAND_X + i * (HAND_W + HAND_GAP), HAND_Y, HAND_W, HAND_H)) return i;
  }
  return null;
}

export function hitLane(x: number, y: number): number | null {
  if (!inside(x, y, FIELD_X, FIELD_Y, FIELD_W, FIELD_H)) return null;
  const lane = Math.floor((x - FIELD_X) / LANE_W);
  if (lane < 0 || lane > 4) return null;
  return lane;
}

export function hitPass(x: number, y: number): boolean {
  return inside(x, y, PASS_X, PASS_Y, PASS_W, PASS_H);
}

export function hitMenu(x: number, y: number): boolean {
  return inside(x, y, MENU_X, MENU_Y, MENU_W, MENU_H);
}

export function hitRoster(x: number, y: number): UnitKind | null {
  for (let index = 0; index < ALL_KINDS.length; index += 1) {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const rx = DECK_X + col * (DECK_W + DECK_COL_GAP);
    const ry = DECK_Y + row * (DECK_H + DECK_ROW_GAP);
    if (inside(x, y, rx, ry, DECK_W, DECK_H)) return ALL_KINDS[index];
  }
  return null;
}

export function hitPick(x: number, y: number, count: number): number | null {
  for (let i = 0; i < count; i += 1) {
    if (inside(x, y, PICK_X, PICK_Y + i * (PICK_H + PICK_GAP), PICK_W, PICK_H)) return i;
  }
  return null;
}

export function hitStart(x: number, y: number): boolean {
  return inside(x, y, START_X, START_Y, START_W, START_H);
}
