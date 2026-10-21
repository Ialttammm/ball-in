### TASK 01: Define simulation types `src/sim/types.ts`

1. **Inputs & Data Shapes:** No imports. This file exports the constants and interfaces below and nothing else.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Export these constants with these exact values:
     - `TICKS_PER_SECOND = 10`
     - `MATCH_TICKS = 1200`
     - `TILE_MIN = 0`
     - `TILE_MAX = 20`
     - `MIDFIELD = 10`
     - `YARDS_PER_TILE = 5`
     - `LANE_COUNT = 5`
     - `ELIXIR_START = 5`
     - `ELIXIR_CAP = 10`
     - `ELIXIR_REGEN_TICKS = 20`
     - `HAND_SIZE = 4`
     - `DECK_SIZE = 8`
     - `TD_TO_WIN = 2`
     - `STRENGTH_SCALE = 100`
     - `MOVE_STEP = 30`
     - `CONTEST_DRAIN_PER_TICK = 10`
     - `MOMENTUM_TILES = 2`
     - `BULLDOZER_BURN = 600`
     - `BULLDOZER_BURN_PER_TICK = 60`
   - Export `PlayerId = 'bottom' | 'top'`.
   - Export `Role = 'offense' | 'defense'`.
   - Export `UnitKind` as `'sidewinder' | 'passer' | 'bline' | 'bulldozer' | 'pinball' | 'blitz' | 'guard' | 'tripwire' | 'interceptor' | 'sweeper'`.
   - Export `Phase = 'playing' | 'ended'`.
   - Export `EndReason = 'touchdowns' | 'time'`.
   - Export `BallMode = 'neutral' | 'carried' | 'loose'`.
   - Export `ApproachResult = 'blocked' | 'stayed' | 'entered' | 'scored'`.
   - Export interface `Unit` with fields: `id: number`, `owner: PlayerId`, `kind: UnitKind`, `role: Role`, `lane: number`, `tile: number`, `strength: number`, `speed: 1 | 2 | 3`, `moveAcc: number`, `travelAcc: number`, `momentum: number`, `momentumSinceContest: number`, `tilesSinceDeploy: number`, `holdingBall: boolean`, `inContest: boolean`, `pinballHeading: -1 | 1`, `sweeperShifted: boolean`, `alive: boolean`, `burnLeft: number`.
   - Export interface `Ball` with `mode: BallMode`, `lane: number`, `tile: number`, `carrierId: number | null`.
   - Export interface `PlayerState` with `elixir: number`, `queue: UnitKind[]`, `touchdowns: number`.
   - Export interface `DeployCommand` with `player: PlayerId`, `handIndex: number`, `lane: number`.
   - Export interface `MatchState` with `tickIndex: number`, `phase: Phase`, `winner: PlayerId | 'draw' | null`, `endReason: EndReason | null`, `nextUnitId: number`, `units: Unit[]`, `ball: Ball`, `players: Record<PlayerId, PlayerState>`.
   - Do not add `yard`, exhaustion constants, or a defense-carrier drain constant.

3. **Exact Mathematical Expressions:** Thematic yard is `tile * YARDS_PER_TILE`. Match length is `1200` ticks. Burn rate is `60` milli per tick and the full burn is `600`.

4. **Returns & Edge Cases:** This module returns no runtime value. A missing field in a later file is a compile error.
