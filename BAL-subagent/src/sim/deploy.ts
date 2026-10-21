// src/sim/deploy.ts
// TASK 12 — spend elixir and spawn a card on the owner's yard 0.

import { HAND_SIZE, LANE_COUNT } from './types';
import type { DeployCommand, MatchState } from './types';
import { getDef } from './roster';
import { cycleHand } from './deck';
import { addUnit, unitsOnCell } from './state';
import { ownGoalTile } from './geometry';

export function applyDeploy(state: MatchState, cmd: DeployCommand | null): boolean {
  if (cmd === null) return false;
  if (state.phase === 'ended') return false;
  if (cmd.player !== 'bottom' && cmd.player !== 'top') return false;
  if (!Number.isInteger(cmd.handIndex) || cmd.handIndex < 0 || cmd.handIndex >= HAND_SIZE) return false;
  if (!Number.isInteger(cmd.lane) || cmd.lane < 0 || cmd.lane >= LANE_COUNT) return false;
  const player = state.players[cmd.player];
  if (player.queue.length !== 8) return false;
  const kind = player.queue[cmd.handIndex];
  const def = getDef(kind);
  if (def.cost > player.elixir) return false;
  const tile = ownGoalTile(cmd.player);
  if (unitsOnCell(state, cmd.lane, tile).length > 0) return false;
  player.elixir -= def.cost;
  cycleHand(player.queue, cmd.handIndex);
  addUnit(state, { owner: cmd.player, kind, lane: cmd.lane, tile });
  return true;
}
