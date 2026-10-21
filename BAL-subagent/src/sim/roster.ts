// src/sim/roster.ts
// TASK 02 — static roster table. Strengths are stored raw (not ×100);
// the ×STRENGTH_SCALE multiplication happens where units are instantiated.

import type { Role, UnitKind } from './types';

export interface UnitDef {
  kind: UnitKind;
  role: Role;
  cost: number;
  strength: number;
  speed: 1 | 2 | 3;
}

export const ROSTER: Record<UnitKind, UnitDef> = {
  sidewinder: { kind: 'sidewinder', role: 'offense', cost: 2, strength: 3, speed: 2 },
  passer: { kind: 'passer', role: 'offense', cost: 1, strength: 2, speed: 2 },
  bline: { kind: 'bline', role: 'offense', cost: 2, strength: 1, speed: 3 },
  bulldozer: { kind: 'bulldozer', role: 'offense', cost: 6, strength: 6, speed: 1 },
  pinball: { kind: 'pinball', role: 'offense', cost: 3, strength: 2, speed: 3 },
  blitz: { kind: 'blitz', role: 'offense', cost: 2, strength: 1, speed: 3 },
  guard: { kind: 'guard', role: 'defense', cost: 4, strength: 4, speed: 2 },
  tripwire: { kind: 'tripwire', role: 'defense', cost: 2, strength: 2, speed: 2 },
  interceptor: { kind: 'interceptor', role: 'defense', cost: 3, strength: 2, speed: 3 },
  sweeper: { kind: 'sweeper', role: 'defense', cost: 5, strength: 4, speed: 1 },
};

export const ALL_KINDS: UnitKind[] = [
  'sidewinder', 'passer', 'bline', 'bulldozer', 'pinball',
  'blitz', 'guard', 'tripwire', 'interceptor', 'sweeper',
];

export const DEFAULT_DECK: UnitKind[] = [
  'passer', 'sidewinder', 'bline', 'pinball', 'blitz', 'guard', 'tripwire', 'interceptor',
];

export function getDef(kind: UnitKind): UnitDef {
  return ROSTER[kind];
}
