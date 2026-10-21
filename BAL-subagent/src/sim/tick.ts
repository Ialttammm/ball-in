// src/sim/tick.ts
// TASK 13 — advance one match tick.

import { ELIXIR_CAP, ELIXIR_REGEN_TICKS, MATCH_TICKS, MIDFIELD } from './types';
import type { DeployCommand, MatchState, PlayerId } from './types';
import { aliveUnits, byId, compactUnits } from './state';
import { tryPickup } from './ball';
import { checkScore, endByTime, matchEnded } from './score';
import { applyBurns, drainContests, drainEdges, refreshContest } from './contest';
import { applySweeperShift, moveAll } from './move';
import { applyDeploy } from './deploy';
import { easePassRadius, tryPass } from './pass';

function regen(state: MatchState): void {
  if (state.tickIndex % ELIXIR_REGEN_TICKS !== 0) return;
  state.players.bottom.elixir = Math.min(ELIXIR_CAP, state.players.bottom.elixir + 1);
  state.players.top.elixir = Math.min(ELIXIR_CAP, state.players.top.elixir + 1);
}

export function tick(state: MatchState, commands: DeployCommand[], passPlayer: PlayerId | null = null): void {
  if (state.phase === 'ended') return;
  state.tickIndex += 1;
  if (state.tickIndex >= MATCH_TICKS) {
    endByTime(state);
    return;
  }
  regen(state);
  if (state.kickoffTicks > 0) {
    state.kickoffTicks -= 1;
    if (state.kickoffTicks === 0) {
      state.ball = { mode: 'neutral', lane: 2, tile: MIDFIELD, carrierId: null };
    }
  }
  for (const unit of aliveUnits(state)) easePassRadius(unit);
  if (passPlayer !== null) tryPass(state, passPlayer);
  if (matchEnded(state)) return;
  refreshContest(state);
  compactUnits(state);
  moveAll(state);
  if (matchEnded(state)) return;
  applyBurns(state);
  compactUnits(state);
  refreshContest(state);
  drainContests(state);
  if (matchEnded(state)) return;
  drainEdges(state);
  compactUnits(state);
  for (const u of byId(aliveUnits(state))) {
    if (u.kind === 'sweeper' && !u.sweeperShifted && !u.inContest && u.tile === 10) {
      applySweeperShift(state, u);
    }
  }
  refreshContest(state);
  for (const u of byId(aliveUnits(state))) {
    tryPickup(state, u);
  }
  checkScore(state);
  if (matchEnded(state)) return;
  for (const cmd of commands) {
    applyDeploy(state, cmd);
  }
}
