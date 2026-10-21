import type { MatchState, Unit, UnitKind } from '../sim/types';
import { MATCH_TICKS, TILE_MAX } from '../sim/types';
import { ALL_KINDS, getDef } from '../sim/roster';
import { handOf, previewOf } from '../sim/deck';
import { aliveUnits, byId, unitById } from '../sim/state';
import { humanYard } from '../sim/geometry';
import { passReady, previewPass } from '../sim/pass';
import {
  DECK_COL_GAP,
  DECK_H,
  DECK_ROW_GAP,
  DECK_W,
  DECK_X,
  DECK_Y,
  FIELD_H,
  FIELD_W,
  FIELD_X,
  FIELD_Y,
  HAND_GAP,
  HAND_H,
  HAND_W,
  HAND_X,
  HAND_Y,
  LANE_W,
  MENU_H,
  MENU_W,
  MENU_X,
  MENU_Y,
  NEXT_H,
  NEXT_W,
  NEXT_X,
  NEXT_Y,
  PICK_GAP,
  PICK_H,
  PICK_W,
  PICK_X,
  PICK_Y,
  START_H,
  START_W,
  START_X,
  START_Y,
  PASS_H,
  PASS_W,
  PASS_X,
  PASS_Y,
  laneToX,
  tileToY,
} from './layout';

export const KIND_COLOR: Record<UnitKind, string> = {
  sidewinder: '#3DDC97',
  passer: '#F5D76E',
  bline: '#E74C3C',
  bulldozer: '#8E5A2B',
  pinball: '#E91E63',
  blitz: '#FF9800',
  guard: '#3498DB',
  tripwire: '#9B59B6',
  interceptor: '#1ABC9C',
  sweeper: '#34495E',
};

export const KIND_LABEL: Record<UnitKind, string> = {
  sidewinder: 'SW',
  passer: 'PS',
  bline: 'BL',
  bulldozer: 'BD',
  pinball: 'PB',
  blitz: 'BZ',
  guard: 'GD',
  tripwire: 'TW',
  interceptor: 'IN',
  sweeper: 'SP',
};

function clear(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#0E1116';
  ctx.fillRect(0, 0, 1280, 720);
}

function roundStrength(strength: number): string {
  return (strength / 100).toFixed(1);
}

function drawCostBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, cost: number, radius: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#F4F1DE';
  ctx.stroke();
  ctx.fillStyle = '#F4F1DE';
  ctx.font = `bold ${Math.round(radius * 1.2)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cost), cx, cy + 1);
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: UnitKind,
  selected: boolean,
): void {
  const def = getDef(kind);
  ctx.fillStyle = KIND_COLOR[kind];
  ctx.fillRect(x, y, w, h);
  if (selected) {
    ctx.strokeStyle = '#F5D76E';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);
  }
  const radius = 15;
  const cx = x + radius + 8;
  const cy = y + h / 2;
  drawCostBadge(ctx, cx, cy, def.cost, radius);
  const textX = cx + radius + 10;
  const maxW = w - (textX - x) - 6;
  ctx.fillStyle = '#111111';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const title = `${KIND_LABEL[kind]}  ${kind}`;
  const stats = `${roundStrength(def.strength * 100)}   ${def.speed}`;
  if (ctx.measureText(title).width <= maxW) {
    ctx.fillText(title, textX, y + 12);
    ctx.fillText(stats, textX, y + 36);
    return;
  }
  ctx.fillText(KIND_LABEL[kind], textX, y + 8);
  ctx.font = '13px sans-serif';
  ctx.fillText(kind, textX, y + 26);
  ctx.font = '16px sans-serif';
  ctx.fillText(stats, textX, y + 46);
}

function drawDeck(ctx: CanvasRenderingContext2D, selected: UnitKind[]): void {
  clear(ctx);
  ctx.fillStyle = '#F4F1DE';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Gridiron Tactics', 48, 64);
  ctx.font = '16px sans-serif';
  ctx.fillText('Pick 8 unique cards. Click a picked row to send it to the back.', 48, 96);

  for (let index = 0; index < ALL_KINDS.length; index += 1) {
    const kind = ALL_KINDS[index];
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = DECK_X + col * (DECK_W + DECK_COL_GAP);
    const y = DECK_Y + row * (DECK_H + DECK_ROW_GAP);
    drawCard(ctx, x, y, DECK_W, DECK_H, kind, selected.includes(kind));
  }

  for (let i = 0; i < selected.length; i += 1) {
    const kind = selected[i];
    const y = PICK_Y + i * (PICK_H + PICK_GAP);
    ctx.fillStyle = '#1A1F27';
    ctx.fillRect(PICK_X, y, PICK_W, PICK_H);
    ctx.fillStyle = KIND_COLOR[kind];
    ctx.fillRect(PICK_X, y, 8, PICK_H);
    ctx.fillStyle = '#F4F1DE';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}  ${KIND_LABEL[kind]}  ${kind}`, PICK_X + 16, y + PICK_H / 2);
    drawCostBadge(ctx, PICK_X + PICK_W - 20, y + PICK_H / 2, getDef(kind).cost, 12);
  }

  ctx.fillStyle = selected.length === 8 ? '#1E7A46' : '#333333';
  ctx.fillRect(START_X, START_Y, START_W, START_H);
  ctx.fillStyle = '#F4F1DE';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('START', START_X + START_W / 2, START_Y + START_H / 2);
}

function drawField(ctx: CanvasRenderingContext2D): void {
  for (let lane = 0; lane < 5; lane += 1) {
    ctx.fillStyle = lane % 2 === 0 ? '#1E7A46' : '#196B3E';
    ctx.fillRect(FIELD_X + lane * LANE_W, FIELD_Y, LANE_W, FIELD_H);
  }
  ctx.strokeStyle = '#F4F1DE';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#F4F1DE';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let tile = 0; tile <= 20; tile += 2) {
    const y = tileToY(tile);
    ctx.beginPath();
    ctx.moveTo(FIELD_X, y);
    ctx.lineTo(FIELD_X + FIELD_W, y);
    ctx.stroke();
    ctx.fillText(String(humanYard(tile)), FIELD_X - 36, y);
  }
  drawPosts(ctx);
}

function drawPosts(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#F4F1DE';
  ctx.lineWidth = 3;
  for (const tile of [0, 20]) {
    const x = laneToX(2);
    const y = tileToY(tile);
    const dir = tile === 0 ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x - 16, y + dir * 22);
    ctx.moveTo(x + 16, y);
    ctx.lineTo(x + 16, y + dir * 22);
    ctx.moveTo(x - 16, y + dir * 22);
    ctx.lineTo(x + 16, y + dir * 22);
    ctx.stroke();
  }
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: Unit): void {
  const x = laneToX(unit.lane);
  const y = tileToY(unit.tile);
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fillStyle = KIND_COLOR[unit.kind];
  ctx.fill();
  ctx.lineWidth = unit.inContest ? 3 : 2;
  ctx.strokeStyle = unit.inContest ? '#F5D76E' : unit.owner === 'bottom' ? '#1B4F72' : '#7B241C';
  ctx.stroke();
  ctx.fillStyle = '#111111';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(KIND_LABEL[unit.kind], x, y);
  const barW = 22;
  const ratio = Math.max(0, Math.min(1, unit.strength / 100 / 6));
  ctx.fillStyle = '#1A1F27';
  ctx.fillRect(x - barW / 2, y - 16, barW, 4);
  ctx.fillStyle = unit.strength > 100 ? '#3DDC97' : '#E74C3C';
  ctx.fillRect(x - barW / 2, y - 16, barW * ratio, 4);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#F4F1DE';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(roundStrength(unit.strength), x + 14, y);
  if (unit.holdingBall) {
    ctx.beginPath();
    ctx.arc(x + 14, y - 14, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#F4F1DE';
    ctx.fill();
  }
}

function drawLooseBall(ctx: CanvasRenderingContext2D, match: MatchState): void {
  if (match.ball.mode === 'carried' || match.ball.mode === 'hidden') return;
  const x = laneToX(match.ball.lane);
  const y = tileToY(match.ball.tile);
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#F4F1DE';
  ctx.fill();
}

function clockLabel(tickIndex: number): string {
  const remain = Math.max(0, MATCH_TICKS - tickIndex);
  const seconds = Math.floor(remain / 10);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m + ':' + (s < 10 ? '0' + s : String(s));
}

function endLabel(match: MatchState): string {
  if (match.winner === 'draw') return 'DRAW';
  if (match.winner === 'bottom') {
    return match.endReason === 'time' ? 'YOU WIN ON TIME' : 'YOU WIN';
  }
  if (match.winner === 'top') {
    return match.endReason === 'time' ? 'YOU LOSE ON TIME' : 'YOU LOSE';
  }
  return 'DRAW';
}

function drawPassArt(ctx: CanvasRenderingContext2D, match: MatchState): void {
  if (match.ball.mode !== 'carried' || match.ball.carrierId === null) return;
  const carrier = unitById(match, match.ball.carrierId);
  if (carrier === null || !carrier.alive) return;
  const x = laneToX(carrier.lane);
  const y = tileToY(carrier.tile);
  const tilePx = FIELD_H / TILE_MAX;
  ctx.beginPath();
  ctx.ellipse(x, y, carrier.passRadius * LANE_W, carrier.passRadius * tilePx, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(245, 215, 110, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (carrier.owner !== 'bottom') return;
  const aim = previewPass(match, 'bottom');
  if (aim === null) return;
  const x1 = laneToX(aim.lane);
  const y1 = tileToY(aim.tile);
  const color = aim.kind === 'intercept' ? '#E74C3C' : aim.forward ? '#F5D76E' : '#7FB3D5';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash(aim.forward ? [] : [6, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(y1 - y, x1 - x);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 12 * Math.cos(ang - 0.45), y1 - 12 * Math.sin(ang - 0.45));
  ctx.lineTo(x1 - 12 * Math.cos(ang + 0.45), y1 - 12 * Math.sin(ang + 0.45));
  ctx.closePath();
  ctx.fill();
}

function drawPassButton(ctx: CanvasRenderingContext2D, match: MatchState): void {
  const ready = match.phase === 'playing' && passReady(match, 'bottom');
  ctx.fillStyle = ready ? '#1B4F72' : '#2C313A';
  ctx.fillRect(PASS_X, PASS_Y, PASS_W, PASS_H);
  ctx.strokeStyle = ready ? '#F5D76E' : '#5C6370';
  ctx.lineWidth = 2;
  ctx.strokeRect(PASS_X, PASS_Y, PASS_W, PASS_H);
  ctx.fillStyle = ready ? '#F4F1DE' : '#8A93A0';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PASS', PASS_X + PASS_W / 2, PASS_Y + 34);
  ctx.font = '22px sans-serif';
  ctx.fillText('2', PASS_X + PASS_W / 2, PASS_Y + 64);
}

function drawMatch(ctx: CanvasRenderingContext2D, match: MatchState, selectedHand: number | null): void {
  clear(ctx);
  drawField(ctx);
  drawLooseBall(ctx, match);
  drawPassArt(ctx, match);
  for (const unit of byId(aliveUnits(match))) drawUnit(ctx, unit);

  ctx.fillStyle = '#F4F1DE';
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(clockLabel(match.tickIndex), 700, 40);
  ctx.font = '16px sans-serif';
  ctx.fillText(`YOU ${match.players.bottom.touchdowns}    OPP ${match.players.top.touchdowns}`, 180, 40);
  ctx.fillText(`ELIXIR ${match.players.bottom.elixir}`, FIELD_X, 600);
  ctx.fillText(`ELIXIR ${match.players.top.elixir}`, FIELD_X, 68);

  const hand = handOf(match.players.bottom.queue);
  for (let i = 0; i < hand.length; i += 1) {
    drawCard(
      ctx,
      HAND_X + i * (HAND_W + HAND_GAP),
      HAND_Y,
      HAND_W,
      HAND_H,
      hand[i],
      selectedHand === i,
    );
  }

  const next = previewOf(match.players.bottom.queue);
  ctx.fillStyle = '#F4F1DE';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('NEXT', NEXT_X, NEXT_Y - 8);
  drawCard(ctx, NEXT_X, NEXT_Y, NEXT_W, NEXT_H, next, false);

  ctx.fillStyle = '#1A1F27';
  ctx.fillRect(MENU_X, MENU_Y, MENU_W, MENU_H);
  ctx.strokeStyle = '#F4F1DE';
  ctx.lineWidth = 1;
  ctx.strokeRect(MENU_X, MENU_Y, MENU_W, MENU_H);
  ctx.fillStyle = '#F4F1DE';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MENU', MENU_X + MENU_W / 2, MENU_Y + MENU_H / 2);
  drawPassButton(ctx, match);

  if (match.phase === 'ended') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#F4F1DE';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(endLabel(match), 640, 360);
  }
}

export function draw(
  ctx: CanvasRenderingContext2D,
  screen: 'deck' | 'match',
  selected: UnitKind[],
  match: MatchState | null,
  selectedHand: number | null,
): void {
  if (screen === 'deck' || match === null) drawDeck(ctx, selected);
  else drawMatch(ctx, match, selectedHand);
}
