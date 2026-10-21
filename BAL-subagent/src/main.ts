import { createMatch } from './sim/state';
import { tick } from './sim/tick';
import { chooseAiCommand } from './sim/ai';
import { DEFAULT_DECK } from './sim/roster';
import type { DeployCommand, MatchState, UnitKind } from './sim/types';
import { draw } from './render/draw';
import {
  canvasPoint,
  hitHand,
  hitLane,
  hitMenu,
  hitPass,
  hitPick,
  hitRoster,
  hitStart,
  VIEW_H,
  VIEW_W,
} from './render/layout';

const canvas = document.getElementById('game');
if (canvas === null || !(canvas instanceof HTMLCanvasElement)) {
  throw new Error('missing canvas');
}
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');
if (ctx === null) throw new Error('missing context');
const gameCanvas: HTMLCanvasElement = canvas;
const gameCtx: CanvasRenderingContext2D = ctx;

let screen: 'deck' | 'match' = 'deck';
let selected: UnitKind[] = [];
let match: MatchState | null = null;
let selectedHand: number | null = null;
let pending: DeployCommand | null = null;
let pendingPass = false;
let last = performance.now();
let acc = 0;

function toggleKind(kind: UnitKind): void {
  const index = selected.indexOf(kind);
  if (index >= 0) selected.splice(index, 1);
  else if (selected.length < 8) selected.push(kind);
}

function sendPickToBack(index: number): void {
  const kind = selected[index];
  selected.splice(index, 1);
  selected.push(kind);
}

function onPointer(event: MouseEvent): void {
  const p = canvasPoint(gameCanvas, event);
  if (screen === 'deck') {
    const kind = hitRoster(p.x, p.y);
    if (kind !== null) toggleKind(kind);
    const pick = hitPick(p.x, p.y, selected.length);
    if (pick !== null) sendPickToBack(pick);
    if (hitStart(p.x, p.y) && selected.length === 8) {
      match = createMatch(selected.slice(), DEFAULT_DECK.slice());
      screen = 'match';
      selectedHand = null;
      pending = null;
      pendingPass = false;
      acc = 0;
      last = performance.now();
    }
    return;
  }
  if (match === null) return;
  if (hitMenu(p.x, p.y)) {
    screen = 'deck';
    match = null;
    pending = null;
    pendingPass = false;
    selectedHand = null;
    return;
  }
  if (match.phase !== 'playing') return;
  const hand = hitHand(p.x, p.y);
  if (hand !== null) {
    if (selectedHand === hand) selectedHand = null;
    else selectedHand = hand;
    return;
  }
  if (hitPass(p.x, p.y)) {
    pendingPass = true;
    return;
  }
  const lane = hitLane(p.x, p.y);
  if (lane !== null && selectedHand !== null) {
    pending = { player: 'bottom', handIndex: selectedHand, lane };
    selectedHand = null;
  }
}

gameCanvas.addEventListener('pointerdown', onPointer);

function frame(now: number): void {
  const delta = now - last;
  last = now;
  if (delta > 0) acc += delta;
  if (acc > 500) acc = 500;
  let steps = 0;
  while (screen === 'match' && match !== null && acc >= 100 && steps < 5) {
    acc -= 100;
    steps += 1;
    if (match.phase === 'playing') {
      const commands: DeployCommand[] = [];
      if (pending !== null) commands.push(pending);
      pending = null;
      const passPlayer = pendingPass ? 'bottom' : null;
      pendingPass = false;
      const ai = chooseAiCommand(match);
      if (ai !== null) commands.push(ai);
      tick(match, commands, passPlayer);
    }
  }
  draw(gameCtx, screen, selected, match, selectedHand);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
