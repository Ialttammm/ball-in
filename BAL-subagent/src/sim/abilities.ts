// src/sim/abilities.ts
// TASK 09 — compute passive shift targets and strength bonuses.

import { STRENGTH_SCALE } from './types';
import type { Unit } from './types';

export function momentumStrengthBonus(unit: Unit): number {
  let bonus = 0;
  if (unit.kind === 'bline' && unit.momentumSinceContest > 0 && unit.momentumSinceContest % 3 === 0) {
    bonus += STRENGTH_SCALE;
  }
  if (unit.kind === 'guard' && unit.momentum > 0 && unit.momentum % 2 === 0) {
    bonus += STRENGTH_SCALE;
  }
  return bonus;
}

export function sidewinderLane(unit: Unit): number {
  if (unit.lane === 0) return 1;
  return unit.lane - 1;
}

export function pinballDestination(unit: Unit): { lane: number; heading: -1 | 1 } {
  let heading = unit.pinballHeading;
  let lane = unit.lane + heading;
  if (lane < 0 || lane > 4) {
    heading = heading === -1 ? 1 : -1;
    lane = unit.lane + heading;
  }
  return { lane, heading };
}

export function densestOffenseLane(units: Unit[], fromLane: number): number {
  const counts = [0, 0, 0, 0, 0];
  for (const u of units) {
    if (!u.alive || u.role !== 'offense') continue;
    if (u.lane < 0 || u.lane > 4) continue;
    counts[u.lane] += 1;
  }

  let best = 0;
  for (let lane = 1; lane <= 4; lane += 1) {
    if (counts[lane] > counts[best]) {
      best = lane;
    } else if (counts[lane] === counts[best]) {
      const dNew = Math.abs(lane - fromLane);
      const dOld = Math.abs(best - fromLane);
      if (dNew < dOld || (dNew === dOld && lane < best)) {
        best = lane;
      }
    }
  }

  return best;
}
