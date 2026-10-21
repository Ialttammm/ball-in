// src/sim/types.ts
// TASK 01 — deterministic simulation types and constants.
// No imports, no runtime values: pure declarations only.

// Timing & match
export const TICKS_PER_SECOND = 10;
export const MATCH_TICKS = 1200;

// Field geometry (tiles; thematic yard = tile * YARDS_PER_TILE)
export const TILE_MIN = 0;
export const TILE_MAX = 20;
export const MIDFIELD = 10;
export const YARDS_PER_TILE = 5;
export const LANE_COUNT = 5;

// Elixir
export const ELIXIR_START = 5;
export const ELIXIR_CAP = 10;
export const ELIXIR_REGEN_TICKS = 20;

// Cards
export const HAND_SIZE = 4;
export const DECK_SIZE = 8;

// Scoring / combat
export const TD_TO_WIN = 2;
export const STRENGTH_SCALE = 100;

// Movement accumulators
export const MOVE_STEP = 30;
export const MOMENTUM_TILES = 2;

// Contest drain
export const CONTEST_DRAIN_PER_TICK = 10;

// Edge drain: 3 strength per second for a non-carrier stuck on the opponent goal line.
export const EDGE_DRAIN_PER_TICK = 30;

// Pass: 2 elixir, radius never below 2 tiles, a body must sit half a tile inside the ring.
export const PASS_COST = 2;
export const PASS_RADIUS_MIN = 2;
export const PASS_CATCH_INSET = 0.5;

// After a non-winning touchdown the ball is absent for one second.
export const KICKOFF_BUFFER_TICKS = 10;

// Bulldozer burn (600 total, 60 per tick → 10 ticks)
export const BULLDOZER_BURN = 600;
export const BULLDOZER_BURN_PER_TICK = 60;

// Unions
export type PlayerId = 'bottom' | 'top';
export type Role = 'offense' | 'defense';
export type UnitKind =
  | 'sidewinder' | 'passer' | 'bline' | 'bulldozer' | 'pinball'
  | 'blitz' | 'guard' | 'tripwire' | 'interceptor' | 'sweeper';
export type Phase = 'playing' | 'ended';
export type EndReason = 'touchdowns' | 'time';
export type BallMode = 'neutral' | 'carried' | 'loose' | 'hidden';
export type ApproachResult = 'blocked' | 'stayed' | 'entered' | 'scored';

// Interfaces
export interface Unit {
  id: number;
  owner: PlayerId;
  kind: UnitKind;
  role: Role;
  lane: number;
  tile: number;
  strength: number;
  speed: 1 | 2 | 3;
  moveAcc: number;
  travelAcc: number;
  momentum: number;
  momentumSinceContest: number;
  tilesSinceDeploy: number;
  holdingBall: boolean;
  inContest: boolean;
  pinballHeading: -1 | 1;
  sweeperShifted: boolean;
  alive: boolean;
  burnLeft: number;
  passRadius: number;
  passRadiusAcc: number;
}

export interface Ball {
  mode: BallMode;
  lane: number;
  tile: number;
  carrierId: number | null;
}

export interface PlayerState {
  elixir: number;
  queue: UnitKind[];
  touchdowns: number;
}

export interface DeployCommand {
  player: PlayerId;
  handIndex: number;
  lane: number;
}

export interface MatchState {
  tickIndex: number;
  phase: Phase;
  winner: PlayerId | 'draw' | null;
  endReason: EndReason | null;
  nextUnitId: number;
  units: Unit[];
  ball: Ball;
  players: Record<PlayerId, PlayerState>;
  kickoffTicks: number;
}
