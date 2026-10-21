// src/sim/ai.ts
// TASK 14 — choose the top-side deploy on its own yard 0.

import type { DeployCommand, MatchState } from './types';
import { getDef } from './roster';
import { unitById, unitsOnCell } from './state';
import { ownGoalTile } from './geometry';

export function chooseAiCommand(state: MatchState): DeployCommand | null {
  if (state.phase === 'ended') return null;
  const player = state.players.top;
  let preferred = state.ball.lane;
  if (state.ball.mode === 'carried' && state.ball.carrierId !== null) {
    const carrier = unitById(state, state.ball.carrierId);
    if (carrier !== null) preferred = carrier.lane;
  }
  const lanes: number[] = [preferred];
  for (let lane = 0; lane <= 4; lane += 1) {
    if (lane !== preferred) lanes.push(lane);
  }
  const tile = ownGoalTile('top');
  for (let handIndex = 0; handIndex < 4; handIndex += 1) {
    const kind = player.queue[handIndex];
    if (getDef(kind).cost > player.elixir) continue;
    for (const lane of lanes) {
      if (unitsOnCell(state, lane, tile).length > 0) continue;
      return { player: 'top', handIndex, lane };
    }
  }
  return null;
}
