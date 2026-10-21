# Gridiron Tactics — Strict Algorithmic Specification

Source design: `game_design_document - v2.md`. Where v2 disagrees with `game_design_document.md` or with the previous spec, v2 wins.
Stack: TypeScript simulation plus a Vite canvas page. No network. No `Math.random`.
Human plays `bottom`. A deterministic AI plays `top`.
Implement tasks in numeric order. Each later file imports earlier files and must not change their exported names.

## Locked decisions

- The field is tiles `0..20` inclusive and lanes `0..4` named L1, L2, C, R2, R1. `TILE_MAX = 20`. One tile equals 5 thematic yards. Thematic yard of a tile is `tile * 5`.
- Tile `0` is the top edge and the top player's spawn. Tile `20` is the bottom edge and the bottom player's spawn. Midfield is tile `10`.
- `bottom` moves by `-1` tile and scores by entering tile `0` while holding the ball. `top` moves by `+1` tile and scores by entering tile `20` while holding the ball.
- A tile holds at most one living unit. Units in a contest stay on their own tiles. They lock across the shared edge when each unit's next tile is the other's tile. They never share a coordinate.
- A lateral shift happens only when the destination tile is empty. An occupied lateral tile cancels the shift.
- Tick rate is 10 Hz. `tickIndex` is an integer. The match ends when `tickIndex >= 1200` (120 seconds) if neither side has 2 touchdowns.
- v2 lists both a 20-tile crossing time and a step frequency written for a 100-tile field. Those columns disagree. This spec uses the 20-tile length and the crossing times. `MOVE_STEP = 30`. Each tick adds `3` when speed is `1`, `4` when speed is `2`, and `6` when speed is `3`. A step happens when `moveAcc >= 30`, then `moveAcc -= 30`.
  - Speed `3` steps every 5 ticks. 20 tiles take 100 ticks (10 seconds).
  - Speed `2` adds 4. 20 steps from `moveAcc === 0` take 150 ticks (15 seconds).
  - Speed `1` steps every 10 ticks. 20 tiles take 200 ticks (20 seconds).
- Strength is an integer in hundredths of a point. Roster strength `3` is stored as `300`. A `+1` strength bonus adds `100`.
- Contest drain is `10` milli per tick for every contestant (`1.0` strength per second). v2 does not replace this rate. There is no exhaustion drain and no doubled drain for a defense carrier.
- Momentum: `+1` when `2` contest-free tiles have been counted (`10` thematic yards). Entering a contest pauses accumulation. `travelAcc` and lifetime `momentum` are kept. `momentumSinceContest` resets to `0` on both units when that contest begins. The tile step that is halted by an enemy does not add to `travelAcc`.
- B-Line uses `momentumSinceContest`. Guard, Sidewinder, Pinball, Passer, and Sweeper use lifetime `momentum`.
- First side to 2 touchdowns wins immediately and the tick returns. At tick `1200` the higher touchdown total wins. Equal totals draw.
- A touchdown clears every unit and sets the ball to neutral at lane `2`, tile `10`. Elixir, queues, `tickIndex`, and touchdown totals are kept.
- Elixir starts at `5`, cap `10`, `+1` when `tickIndex % 20 === 0`. No field cap. No deploy cooldown.
- Each side has a deck queue of 8 unique kinds. Hand is `queue[0..3]`. Preview is `queue[4]`. Playing hand index `i` splices that card out and appends it.
- Bulldozer never receives the ball. Against a weaker enemy, push distance is `Math.floor((bull.strength - opp.strength) / 100)` tiles toward the enemy's own goal. Against an equal or stronger enemy, Bulldozer is removed immediately and the enemy gains `600` milli of burn. Burn subtracts `60` milli per tick while `burnLeft > 0`, for 10 ticks.
- Blitz tosses only when `tilesSinceDeploy > 2` (`2` tiles is exactly 10 thematic yards). The ball drops one tile behind the carrier. One tile is the ball's smallest step.
- Passer's momentum pass and Interceptor's steal are the only air passes. A contest does not lateral the ball to a nearby teammate.
- A loose or neutral ball is taken by the next living non-Bulldozer unit that enters its tile outside a contest. A contest winner does not teleport onto the dead unit's tile.

## Tick order

`tick(state, commands)`:

1. If `phase === 'ended'`, return.
2. `tickIndex += 1`. If `tickIndex >= 1200`, end by score and return.
3. If `tickIndex % 20 === 0`, each side `elixir = min(10, elixir + 1)`.
4. `refreshContest`. Compact dead units.
5. Move living non-contest units in ascending `id`. A touchdown returns from the rest of the move loop.
6. If `phase === 'ended'`, return.
7. `applyBurns`. Compact.
8. `refreshContest`. `drainContests`. If `phase === 'ended'`, return.
9. Compact.
10. Sweepers on tile `10`, not in contest, not yet shifted, in ascending `id`, shift once.
11. `refreshContest`.
12. Standing pickup in ascending `id`.
13. `checkScore`. If `phase === 'ended'`, return.
14. Apply `commands` in array order.

A sweeper who becomes adjacent to an enemy during step 10 starts that contest in step 11 and is drained on the next tick. Commands are built by the page before `tick`. `chooseAiCommand` is not called inside `tick`.

## Contest entry

`beginContest(a, b)` runs once, when a facing pair is not already in contest. A later call in the same lock returns without repeating the toss, snatch, or strip.

1. If either kind is `bulldozer`, return without setting `inContest`. Bulldozer resolution happens on a step attempt.
2. If the ball holder is a Blitz and `tilesSinceDeploy > 2`, drop the ball on `behindTile` of that Blitz.
3. If one unit is Tripwire, the other holds the ball, and `holder.strength > tripwire.strength`, drop the ball on `behindTile` of that Tripwire.
4. If no snatch happened, a Tripwire subtracts `100` from each living opponent on this edge who does not hold the ball. A unit at `strength <= 0` dies.
5. If either unit is dead, or they no longer face, return.
6. Set both `inContest = true` and both `momentumSinceContest = 0`.

`behindTile(owner, tile) = tile - forward(owner)`. If that value is outside `0..20`, the drop stays on `tile`.

## Roster

| kind | role | cost | strength | speed |
| --- | --- | --- | --- | --- |
| sidewinder | offense | 2 | 3 | 2 |
| passer | offense | 1 | 2 | 2 |
| bline | offense | 2 | 1 | 3 |
| bulldozer | offense | 6 | 6 | 1 |
| pinball | offense | 3 | 2 | 3 |
| blitz | offense | 2 | 1 | 3 |
| guard | defense | 4 | 4 | 2 |
| tripwire | defense | 2 | 2 | 2 |
| interceptor | defense | 3 | 2 | 3 |
| sweeper | defense | 5 | 4 | 1 |

`ALL_KINDS` is that order. `DEFAULT_DECK` is `passer, sidewinder, bline, pinball, blitz, guard, tripwire, interceptor`.

## File order

1. `src/sim/types.ts`
2. `src/sim/roster.ts`
3. `src/sim/geometry.ts`
4. `src/sim/deck.ts`
5. `src/sim/state.ts`
6. `src/sim/ball.ts`
7. `src/sim/score.ts`
8. `src/sim/pass.ts`
9. `src/sim/abilities.ts`
10. `src/sim/contest.ts`
11. `src/sim/move.ts`
12. `src/sim/deploy.ts`
13. `src/sim/tick.ts`
14. `src/sim/ai.ts`
15. `tests/sim.test.ts`
16. `src/render/layout.ts`
17. `src/render/draw.ts`
18. `src/main.ts`
19. `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/style.css`

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

### TASK 02: Define the roster table `src/sim/roster.ts`

1. **Inputs & Data Shapes:** Import `Role`, `UnitKind` from `./types`. Export interface `UnitDef` with `kind: UnitKind`, `role: Role`, `cost: number`, `strength: number`, `speed: 1 | 2 | 3`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Export `ROSTER: Record<UnitKind, UnitDef>`:
     - sidewinder: offense, cost 2, strength 3, speed 2
     - passer: offense, cost 1, strength 2, speed 2
     - bline: offense, cost 2, strength 1, speed 3
     - bulldozer: offense, cost 6, strength 6, speed 1
     - pinball: offense, cost 3, strength 2, speed 3
     - blitz: offense, cost 2, strength 1, speed 3
     - guard: defense, cost 4, strength 4, speed 2
     - tripwire: defense, cost 2, strength 2, speed 2
     - interceptor: defense, cost 3, strength 2, speed 3
     - sweeper: defense, cost 5, strength 4, speed 1
   - Export `ALL_KINDS: UnitKind[]` in the order listed above.
   - Export `DEFAULT_DECK: UnitKind[]` equal to `['passer', 'sidewinder', 'bline', 'pinball', 'blitz', 'guard', 'tripwire', 'interceptor']`.
   - Export `function getDef(kind: UnitKind): UnitDef` with body `return ROSTER[kind]`.

3. **Exact Mathematical Expressions:** Stored unit strength later is `getDef(kind).strength * 100`. Do not multiply inside this file.

4. **Returns & Edge Cases:** `getDef` always returns a row because `kind` is a closed union. Do not throw.

### TASK 03: Define field geometry `src/sim/geometry.ts`

1. **Inputs & Data Shapes:** Import `PlayerId`, `TILE_MAX`, `TILE_MIN`, `YARDS_PER_TILE` from `./types`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function forward(owner: PlayerId): -1 | 1`
     - if `owner === 'bottom'`: return `-1`
     - return `1`
   - `export function ownGoalTile(owner: PlayerId): number`
     - if `owner === 'bottom'`: return `20`
     - return `0`
   - `export function opponentGoalTile(owner: PlayerId): number`
     - if `owner === 'bottom'`: return `0`
     - return `20`
   - `export function interceptorActive(owner: PlayerId, tile: number): boolean`
     - if `owner === 'bottom'`: return `tile > 10`
     - return `tile < 10`
   - `export function behindTile(owner: PlayerId, tile: number): number`
     - `const t = tile - forward(owner)`
     - if `t < TILE_MIN || t > TILE_MAX`: return `tile`
     - return `t`
   - `export function moveAdd(speed: 1 | 2 | 3): number`
     - if `speed === 1`: return `3`
     - if `speed === 2`: return `4`
     - return `6`
   - `export function thematicYard(tile: number): number`
     - return `tile * YARDS_PER_TILE`
   - `export function laneName(lane: number): string`
     - if `lane === 0`: return `'L1'`
     - if `lane === 1`: return `'L2'`
     - if `lane === 2`: return `'C'`
     - if `lane === 3`: return `'R2'`
     - if `lane === 4`: return `'R1'`
     - return `'?'`
   - `export function clampLane(lane: number): number`
     - if `lane < 0`: return `0`
     - if `lane > 4`: return `4`
     - return `lane`

3. **Exact Mathematical Expressions:**
   - Bottom forward delta is `-1`. Top forward delta is `+1`.
   - Behind tile is `tile - forward(owner)`, or the same tile when the result is outside `0..20`.
   - Home half for a bottom Interceptor is `tile > 10`. Home half for a top Interceptor is `tile < 10`. Tile `10` is inactive for both.
   - `moveAdd(1) = 3`, `moveAdd(2) = 4`, `moveAdd(3) = 6`.

4. **Returns & Edge Cases:** `behindTile` on the owner's own goal line returns that same tile. `laneName` outside `0..4` returns `'?'`. `clampLane` collapses any out-of-range number onto `0` or `4`.

### TASK 04: Cycle the eight-card queue `src/sim/deck.ts`

1. **Inputs & Data Shapes:** Import `DECK_SIZE`, `HAND_SIZE`, `UnitKind` from `./types`. Import `ROSTER` from `./roster`. A queue is `UnitKind[]` of length 8. Hand is the first 4 entries. Preview is index 4.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function assertDeck(queue: UnitKind[]): void`
     - if `queue.length !== DECK_SIZE`: `throw new Error('deck length')`
     - `const seen = new Set<string>()`
     - for each `kind` of `queue`:
       - if `ROSTER[kind] === undefined`: `throw new Error('unknown kind')`
       - if `seen.has(kind)`: `throw new Error('duplicate kind')`
       - `seen.add(kind)`
   - `export function handOf(queue: UnitKind[]): UnitKind[]`
     - return `queue.slice(0, HAND_SIZE)`
   - `export function previewOf(queue: UnitKind[]): UnitKind`
     - return `queue[HAND_SIZE]`
   - `export function cycleHand(queue: UnitKind[], handIndex: number): void`
     - `const card = queue[handIndex]`
     - `queue.splice(handIndex, 1)`
     - `queue.push(card)`

3. **Exact Mathematical Expressions:** Hand indices are `0, 1, 2, 3`. After cycling index `i`, the length is still 8 and the played kind is at index 7.

4. **Returns & Edge Cases:** `assertDeck` returns `void` on success. `cycleHand` mutates the array in place and returns `void`. Callers must reject a `handIndex` outside `0..3` before calling. This function does not check elixir.

### TASK 05: Create match state and query cells `src/sim/state.ts`

1. **Inputs & Data Shapes:** Import `ELIXIR_START`, `MatchState`, `PlayerId`, `STRENGTH_SCALE`, `Unit`, `UnitKind` from `./types`. Import `assertDeck` from `./deck`. Import `getDef` from `./roster`. Import `forward` from `./geometry`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function createMatch(bottomDeck: UnitKind[], topDeck: UnitKind[]): MatchState`
     - `assertDeck(bottomDeck)`
     - `assertDeck(topDeck)`
     - return a state with:
       - `tickIndex: 0`
       - `phase: 'playing'`
       - `winner: null`
       - `endReason: null`
       - `nextUnitId: 1`
       - `units: []`
       - `ball: { mode: 'neutral', lane: 2, tile: 10, carrierId: null }`
       - `players.bottom: { elixir: ELIXIR_START, queue: bottomDeck.slice(), touchdowns: 0 }`
       - `players.top: { elixir: ELIXIR_START, queue: topDeck.slice(), touchdowns: 0 }`
   - `export function aliveUnits(state: MatchState): Unit[]`
     - return `state.units.filter(u => u.alive)`
   - `export function byId(units: Unit[]): Unit[]`
     - return `units.slice().sort((a, b) => a.id - b.id)`
   - `export function unitById(state: MatchState, id: number): Unit | null`
     - `const found = state.units.find(u => u.id === id)`
     - if `found === undefined`: return `null`
     - return `found`
   - `export function unitsOnCell(state: MatchState, lane: number, tile: number): Unit[]`
     - return alive units whose `lane === lane` and `tile === tile`, sorted by `byId`
   - `export function enemyOnCell(state: MatchState, owner: PlayerId, lane: number, tile: number): Unit | null`
     - `const found = unitsOnCell(state, lane, tile).filter(u => u.owner !== owner)`
     - if `found.length === 0`: return `null`
     - return `found[0]`
   - `export function friendlyOnCell(state: MatchState, owner: PlayerId, lane: number, tile: number, ignoreId: number): Unit | null`
     - `const found = unitsOnCell(state, lane, tile).filter(u => u.owner === owner && u.id !== ignoreId)`
     - if `found.length === 0`: return `null`
     - return `found[0]`
   - `export function facingEnemy(state: MatchState, unit: Unit): Unit | null`
     - if `!unit.alive`: return `null`
     - `const tile = unit.tile + forward(unit.owner)`
     - if `tile < 0 || tile > 20`: return `null`
     - return `enemyOnCell(state, unit.owner, unit.lane, tile)`
   - `export function addUnit(state: MatchState, args: { owner: PlayerId, kind: UnitKind, lane: number, tile: number }): Unit`
     - `const def = getDef(args.kind)`
     - create `unit` with `id = state.nextUnitId`, then `state.nextUnitId += 1`
     - set `owner`, `kind`, `role = def.role`, `lane`, `tile`, `strength = def.strength * STRENGTH_SCALE`, `speed = def.speed`
     - set `moveAcc = 0`, `travelAcc = 0`, `momentum = 0`, `momentumSinceContest = 0`, `tilesSinceDeploy = 0`
     - set `holdingBall = false`, `inContest = false`, `pinballHeading = -1`, `sweeperShifted = false`, `alive = true`, `burnLeft = 0`
     - `state.units.push(unit)`
     - return `unit`
   - `export function compactUnits(state: MatchState): void`
     - `state.units = state.units.filter(u => u.alive)`

3. **Exact Mathematical Expressions:** First unit id is `1`. Elixir is `5` on both sides. Kickoff ball cell is lane `2`, tile `10`. Facing tile is `unit.tile + forward(unit.owner)`.

4. **Returns & Edge Cases:** `createMatch` throws the `assertDeck` errors and does not return a state. `unitById` for an id that was compacted returns `null`. `enemyOnCell` ignores dead units. Two enemies on one cell resolve to the lower id. `facingEnemy` returns `null` when the next tile is off the field.

### TASK 06: Move the ball between units `src/sim/ball.ts`

1. **Inputs & Data Shapes:** Import `MatchState`, `Unit` from `./types`. Import `unitById` from `./state`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function clearHolders(state: MatchState): void`
     - for each `u` of `state.units`: `u.holdingBall = false`
   - `export function giveBall(state: MatchState, unit: Unit): void`
     - `clearHolders(state)`
     - `unit.holdingBall = true`
     - `state.ball.mode = 'carried'`
     - `state.ball.carrierId = unit.id`
     - `state.ball.lane = unit.lane`
     - `state.ball.tile = unit.tile`
   - `export function dropBall(state: MatchState, lane: number, tile: number): void`
     - `clearHolders(state)`
     - `state.ball.mode = 'loose'`
     - `state.ball.carrierId = null`
     - `state.ball.lane = lane`
     - `state.ball.tile = tile`
   - `export function syncCarried(state: MatchState): void`
     - if `state.ball.mode !== 'carried'`: return
     - if `state.ball.carrierId === null`: return
     - `const c = unitById(state, state.ball.carrierId)`
     - if `c === null || !c.alive || !c.holdingBall`: return
     - `state.ball.lane = c.lane`
     - `state.ball.tile = c.tile`
   - `export function tryPickup(state: MatchState, unit: Unit): boolean`
     - if `!unit.alive`: return `false`
     - if `unit.inContest`: return `false`
     - if `unit.kind === 'bulldozer'`: return `false`
     - if `unit.holdingBall`: return `false`
     - if `state.ball.mode === 'carried'`: return `false`
     - if `state.ball.lane !== unit.lane || state.ball.tile !== unit.tile`: return `false`
     - `giveBall(state, unit)`
     - return `true`
   - `export function killUnit(state: MatchState, unit: Unit): void`
     - if `!unit.alive`: return
     - `const dropped = unit.holdingBall`
     - `const lane = unit.lane`
     - `const tile = unit.tile`
     - `unit.alive = false`
     - `unit.inContest = false`
     - `unit.holdingBall = false`
     - `unit.burnLeft = 0`
     - if `dropped`:
       - `clearHolders(state)`
       - `state.ball.mode = 'loose'`
       - `state.ball.carrierId = null`
       - `state.ball.lane = lane`
       - `state.ball.tile = tile`

3. **Exact Mathematical Expressions:** None. Pickup compares lane and tile with `===`.

4. **Returns & Edge Cases:** `tryPickup` returns `false` when the ball is carried, the unit is Bulldozer, the unit is in contest, or the cell differs. `killUnit` on an already dead unit returns without moving the ball. `giveBall` clears every other holder so only one unit has `holdingBall === true`.

### TASK 07: Score a touchdown and reset the field `src/sim/score.ts`

1. **Inputs & Data Shapes:** Import `MatchState`, `PlayerId`, `TD_TO_WIN` from `./types`. Import `unitById` from `./state`. Import `opponentGoalTile` from `./geometry`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function scoreTouchdown(state: MatchState, player: PlayerId): void`
     - if `state.phase === 'ended'`: return
     - `state.players[player].touchdowns += 1`
     - `state.units = []`
     - `state.ball = { mode: 'neutral', lane: 2, tile: 10, carrierId: null }`
     - if `state.players[player].touchdowns >= TD_TO_WIN`:
       - `state.phase = 'ended'`
       - `state.winner = player`
       - `state.endReason = 'touchdowns'`
   - `export function checkScore(state: MatchState): boolean`
     - if `state.phase === 'ended'`: return `true`
     - if `state.ball.mode !== 'carried' || state.ball.carrierId === null`: return `false`
     - `const c = unitById(state, state.ball.carrierId)`
     - if `c === null || !c.alive || !c.holdingBall`: return `false`
     - if `c.tile !== opponentGoalTile(c.owner)`: return `false`
     - `scoreTouchdown(state, c.owner)`
     - return `true`
   - `export function endByTime(state: MatchState): void`
     - `const bottom = state.players.bottom.touchdowns`
     - `const top = state.players.top.touchdowns`
     - `state.phase = 'ended'`
     - `state.endReason = 'time'`
     - if `bottom > top`: `state.winner = 'bottom'`
     - else if `top > bottom`: `state.winner = 'top'`
     - else: `state.winner = 'draw'`

3. **Exact Mathematical Expressions:** Win threshold is `touchdowns >= 2`. Bottom goal tile is `0`. Top goal tile is `20`. Kickoff reset tile is `10`, lane `2`.

4. **Returns & Edge Cases:** `scoreTouchdown` on an ended match does not add another touchdown. A second touchdown sets `phase` to `'ended'` and leaves the ball at the kickoff cell with an empty unit list. `checkScore` returns `false` when the carrier is not on the opponent goal. Elixir, queues, and `tickIndex` stay unchanged.

### TASK 08: Choose pass targets and intercept `src/sim/pass.ts`

1. **Inputs & Data Shapes:** Import `MatchState`, `Unit` from `./types`. Import `aliveUnits`, `unitsOnCell` from `./state`. Import `forward`, `interceptorActive` from `./geometry`. Import `giveBall` from `./ball`. A passer target is a living teammate, not self, not Bulldozer, on the same tile or strictly forward. This file does not export a lateral-mate helper.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `function isForwardOrLevel(from: Unit, to: Unit): boolean`
     - if `to.tile === from.tile`: return `true`
     - return `(to.tile - from.tile) * forward(from.owner) > 0`
   - `export function findPasserTarget(state: MatchState, passer: Unit): Unit | null`
     - `const cands = aliveUnits(state).filter(u => u.owner === passer.owner && u.id !== passer.id && u.kind !== 'bulldozer' && isForwardOrLevel(passer, u))`
     - if `cands.length === 0`: return `null`
     - sort `cands` by `Math.abs(tile - passer.tile)` ascending, then `Math.abs(lane - passer.lane)` ascending, then `id` ascending
     - return `cands[0]`
   - `export function findInterceptor(state: MatchState, from: Unit, to: Unit): Unit | null`
     - `const cands: Unit[] = []`
     - for each `u` of `aliveUnits(state)`:
       - if `u.kind !== 'interceptor'`: continue
       - if `u.owner === from.owner`: continue
       - if `u.inContest`: continue
       - if `!interceptorActive(u.owner, u.tile)`: continue
       - if `Math.abs(u.lane - to.lane) !== 1`: continue
       - if `Math.abs(u.tile - to.tile) > 1`: continue
       - `const blockers = unitsOnCell(state, to.lane, u.tile).filter(x => x.id !== u.id)`
       - if `blockers.length > 0`: continue
       - `cands.push(u)`
     - if `cands.length === 0`: return `null`
     - sort `cands` by `Math.abs(u.tile - to.tile)` ascending, then `id` ascending
     - return `cands[0]`
   - `export function transferPass(state: MatchState, from: Unit, to: Unit): 'completed' | 'intercepted'`
     - `const thief = findInterceptor(state, from, to)`
     - `from.holdingBall = false`
     - if `thief !== null`:
       - `thief.lane = to.lane`
       - `thief.inContest = false`
       - `giveBall(state, thief)`
       - return `'intercepted'`
     - `giveBall(state, to)`
     - return `'completed'`

3. **Exact Mathematical Expressions:**
   - Forward test: `(to.tile - from.tile) * forward(from.owner) > 0`.
   - Interceptor lane gap is exactly `1`. Interceptor tile gap is `<= 1`.
   - Landing cell is `(to.lane, interceptor.tile)`.

4. **Returns & Edge Cases:** `findPasserTarget` returns `null` when no teammate qualifies. `transferPass` always moves the ball off `from`. If the landing cell has any other unit, that interceptor is skipped. `giveBall` writes the ball onto the thief's new lane and unchanged tile.

### TASK 09: Compute passive shift targets `src/sim/abilities.ts`

1. **Inputs & Data Shapes:** Import `STRENGTH_SCALE`, `Unit` from `./types`. Densest-lane input is the living unit list plus the sweeper's current lane.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function momentumStrengthBonus(unit: Unit): number`
     - `let bonus = 0`
     - if `unit.kind === 'bline' && unit.momentumSinceContest > 0 && unit.momentumSinceContest % 3 === 0`: `bonus += STRENGTH_SCALE`
     - if `unit.kind === 'guard' && unit.momentum > 0 && unit.momentum % 2 === 0`: `bonus += STRENGTH_SCALE`
     - return `bonus`
   - `export function sidewinderLane(unit: Unit): number`
     - if `unit.lane === 0`: return `1`
     - return `unit.lane - 1`
   - `export function pinballDestination(unit: Unit): { lane: number, heading: -1 | 1 }`
     - `let heading = unit.pinballHeading`
     - `let lane = unit.lane + heading`
     - if `lane < 0 || lane > 4`:
       - `heading = heading === -1 ? 1 : -1`
       - `lane = unit.lane + heading`
     - return `{ lane, heading }`
   - `export function densestOffenseLane(units: Unit[], fromLane: number): number`
     - `const counts = [0, 0, 0, 0, 0]`
     - for each `u` of `units`:
       - if `!u.alive || u.role !== 'offense'`: continue
       - if `u.lane < 0 || u.lane > 4`: continue
       - `counts[u.lane] += 1`
     - `let best = 0`
     - for `let lane = 1; lane <= 4; lane += 1`:
       - if `counts[lane] > counts[best]`: `best = lane`
       - else if `counts[lane] === counts[best]`:
         - `const dNew = Math.abs(lane - fromLane)`
         - `const dOld = Math.abs(best - fromLane)`
         - if `dNew < dOld || (dNew === dOld && lane < best)`: `best = lane`
     - return `best`

3. **Exact Mathematical Expressions:**
   - B-Line bonus when `momentumSinceContest` is a positive multiple of 3.
   - Guard bonus when `momentum` is a positive multiple of 2.
   - Sidewinder from lane `0` targets lane `1`. Otherwise the target is `lane - 1`.
   - Pinball step is `lane + heading`, with heading negated when the raw lane is outside `0..4`.

4. **Returns & Edge Cases:** `momentumStrengthBonus` returns `0` or `100`. `densestOffenseLane` with all counts at `0` returns the lane closest to `fromLane`, then the lower index. `pinballDestination` does not mutate the unit.

### TASK 10: Resolve bulldozer and contest drain `src/sim/contest.ts`

1. **Inputs & Data Shapes:** Import `BULLDOZER_BURN`, `BULLDOZER_BURN_PER_TICK`, `CONTEST_DRAIN_PER_TICK`, `MatchState`, `STRENGTH_SCALE`, `Unit` from `./types`. Import `aliveUnits`, `byId`, `facingEnemy`, `unitsOnCell` from `./state`. Import `behindTile`, `forward` from `./geometry`. Import `dropBall`, `killUnit`, `syncCarried`, `tryPickup` from `./ball`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `function pairKey(a: Unit, b: Unit): string`
     - return `a.lane + ':' + Math.min(a.tile, b.tile) + ':' + Math.min(a.id, b.id) + ':' + Math.max(a.id, b.id)`
   - `function bulldozerPair(a: Unit, b: Unit): boolean`
     - return `a.kind === 'bulldozer' || b.kind === 'bulldozer'`
   - `export function applyBulldozer(state: MatchState, bull: Unit, opp: Unit): 'pushed' | 'burnout'`
     - if `opp.strength < bull.strength`:
       - `const n = Math.floor((bull.strength - opp.strength) / 100)`
       - `const dir = -forward(opp.owner)`
       - `let dest = opp.tile`
       - for `let i = 0; i < n; i += 1`:
         - `const nt = dest + dir`
         - if `nt < 0 || nt > 20`: break
         - `const blockers = unitsOnCell(state, opp.lane, nt).filter(u => u.id !== opp.id)`
         - if `blockers.length > 0`: break
         - `dest = nt`
       - `opp.tile = dest`
       - `opp.inContest = false`
       - `bull.inContest = false`
       - if `opp.holdingBall`: `syncCarried(state)`
       - `tryPickup(state, opp)`
       - return `'pushed'`
     - `killUnit(state, bull)`
     - if `opp.alive`: `opp.burnLeft += BULLDOZER_BURN`
     - `opp.inContest = false`
     - return `'burnout'`
   - `export function applyBurns(state: MatchState): void`
     - for each `u` of `byId(aliveUnits(state))`:
       - if `!u.alive || u.burnLeft <= 0`: continue
       - `const d = Math.min(BULLDOZER_BURN_PER_TICK, u.burnLeft)`
       - `u.strength -= d`
       - `u.burnLeft -= d`
       - if `u.strength <= 0`: `killUnit(state, u)`
   - `export function beginContest(state: MatchState, a: Unit, b: Unit): void`
     - if `!a.alive || !b.alive`: return
     - if `bulldozerPair(a, b)`: return
     - if `a.inContest && b.inContest`: return
     - `let holder: Unit | null = null`
     - if `a.holdingBall`: `holder = a`
     - else if `b.holdingBall`: `holder = b`
     - if `holder !== null && holder.kind === 'blitz' && holder.tilesSinceDeploy > 2`:
       - `dropBall(state, holder.lane, behindTile(holder.owner, holder.tile))`
       - `holder = null`
     - `let snatched = false`
     - if `a.kind === 'tripwire' && b.holdingBall && b.strength > a.strength`:
       - `dropBall(state, a.lane, behindTile(a.owner, a.tile))`
       - `snatched = true`
     - else if `b.kind === 'tripwire' && a.holdingBall && a.strength > b.strength`:
       - `dropBall(state, b.lane, behindTile(b.owner, b.tile))`
       - `snatched = true`
     - if `snatched === false`:
       - if `a.kind === 'tripwire' && b.alive && !b.holdingBall`:
         - `b.strength -= STRENGTH_SCALE`
         - if `b.strength <= 0`: `killUnit(state, b)`
       - if `b.kind === 'tripwire' && a.alive && !a.holdingBall`:
         - `a.strength -= STRENGTH_SCALE`
         - if `a.strength <= 0`: `killUnit(state, a)`
     - if `!a.alive || !b.alive`: return
     - `const still = facingEnemy(state, a)`
     - if `still === null || still.id !== b.id`: return
     - `a.inContest = true`
     - `b.inContest = true`
     - `a.momentumSinceContest = 0`
     - `b.momentumSinceContest = 0`
   - `export function refreshContest(state: MatchState): void`
     - `const seen = new Set<string>()`
     - for each `u` of `byId(aliveUnits(state))`:
       - if `!u.alive`: continue
       - `const e = facingEnemy(state, u)`
       - if `e === null || !e.alive`: continue
       - if `bulldozerPair(u, e)`: continue
       - `const key = pairKey(u, e)`
       - if `seen.has(key)`: continue
       - `seen.add(key)`
       - `beginContest(state, u, e)`
     - for each `u` of `aliveUnits(state)`:
       - `const e = facingEnemy(state, u)`
       - if `e === null || !e.alive || bulldozerPair(u, e)`: `u.inContest = false`
       - else: `u.inContest = true`
   - `function resolvePair(state: MatchState, a: Unit, b: Unit): void`
     - `const aDead = !a.alive || a.strength <= 0`
     - `const bDead = !b.alive || b.strength <= 0`
     - if `!aDead && !bDead`: return
     - if `aDead && bDead`:
       - if `a.holdingBall`:
         - `killUnit(state, b)`
         - `killUnit(state, a)`
       - else:
         - `killUnit(state, a)`
         - `killUnit(state, b)`
       - return
     - `const winner = aDead ? b : a`
     - `const loser = aDead ? a : b`
     - `killUnit(state, loser)`
     - `winner.inContest = false`
   - `export function drainContests(state: MatchState): void`
     - `const seen = new Set<string>()`
     - for each `u` of `byId(aliveUnits(state))`:
       - if `!u.alive || !u.inContest`: continue
       - `const opp = facingEnemy(state, u)`
       - if `opp === null || !opp.alive`: continue
       - `const key = pairKey(u, opp)`
       - if `seen.has(key)`: continue
       - `seen.add(key)`
       - `u.strength -= CONTEST_DRAIN_PER_TICK`
       - `opp.strength -= CONTEST_DRAIN_PER_TICK`
       - `resolvePair(state, u, opp)`

3. **Exact Mathematical Expressions:**
   - Push distance `n = Math.floor((bull.strength - opp.strength) / 100)` when `opp.strength < bull.strength`.
   - Push direction for a top enemy is `-1`. Push direction for a bottom enemy is `+1`.
   - Burn adds `600` to `burnLeft`. Each `applyBurns` call subtracts `min(60, burnLeft)`.
   - Contest drain subtracts `10` from each living facing contestant once per call.
   - Blitz toss requires `tilesSinceDeploy > 2`. Tripwire strip subtracts `100`.

4. **Returns & Edge Cases:** `applyBulldozer` returns `'pushed'` or `'burnout'` and does not set a drain contest. A blocked push stops on the last free tile and still returns `'pushed'`. `beginContest` on a pair that is already `inContest` returns before the toss, snatch, and strip. Mutual death kills the non-holder first, then the holder, so the loose ball remains on the holder's tile. `resolvePair` does not move the winner. `refreshContest` clears `inContest` when the facing enemy is gone or either unit is Bulldozer.

### TASK 11: Step units and apply momentum `src/sim/move.ts`

1. **Inputs & Data Shapes:** Import `ApproachResult`, `MOMENTUM_TILES`, `MOVE_STEP`, `MatchState`, `Unit` from `./types`. Import `aliveUnits`, `byId`, `enemyOnCell`, `friendlyOnCell`, `unitById`, `unitsOnCell` from `./state`. Import `forward`, `moveAdd` from `./geometry`. Import `syncCarried`, `tryPickup` from `./ball`. Import `checkScore` from `./score`. Import `findPasserTarget`, `transferPass` from `./pass`. Import `densestOffenseLane`, `momentumStrengthBonus`, `pinballDestination`, `sidewinderLane` from `./abilities`. Import `applyBulldozer`, `beginContest` from `./contest`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `function enterEmpty(state: MatchState, mover: Unit, toLane: number, toTile: number, countTile: boolean): ApproachResult`
     - `mover.lane = toLane`
     - `mover.tile = toTile`
     - `mover.inContest = false`
     - if `countTile`:
       - `mover.tilesSinceDeploy += 1`
       - `mover.travelAcc += 1`
       - if `mover.travelAcc >= MOMENTUM_TILES`:
         - `mover.travelAcc -= MOMENTUM_TILES`
         - `mover.momentum += 1`
         - `mover.momentumSinceContest += 1`
         - `applyMomentum(state, mover)`
         - if `state.phase === 'ended' || !mover.alive`: return `'scored'`
     - if `mover.holdingBall`: `syncCarried(state)`
     - `tryPickup(state, mover)`
     - if `checkScore(state)`: return `'scored'`
     - return `'entered'`
   - `export function approachCell(state: MatchState, mover: Unit, toLane: number, toTile: number, countTile: boolean): ApproachResult`
     - if `!mover.alive`: return `'stayed'`
     - `const friend = friendlyOnCell(state, mover.owner, toLane, toTile, mover.id)`
     - if `friend !== null`: return `'blocked'`
     - `const enemy = enemyOnCell(state, mover.owner, toLane, toTile)`
     - if `enemy !== null`:
       - if `mover.kind === 'bulldozer' || enemy.kind === 'bulldozer'`:
         - if `mover.kind === 'bulldozer'`: `applyBulldozer(state, mover, enemy)`
         - else: `applyBulldozer(state, enemy, mover)`
         - return `'stayed'`
       - `beginContest(state, mover, enemy)`
       - if `state.phase === 'ended'`: return `'scored'`
       - if `!enemy.alive && friendlyOnCell(state, mover.owner, toLane, toTile, mover.id) === null && enemyOnCell(state, mover.owner, toLane, toTile) === null`:
         - return `enterEmpty(state, mover, toLane, toTile, countTile)`
       - if `!mover.alive`: return `'stayed'`
       - return `'blocked'`
     - return `enterEmpty(state, mover, toLane, toTile, countTile)`
   - `export function tryChangeLane(state: MatchState, unit: Unit, newLane: number): boolean`
     - if `!unit.alive`: return `false`
     - if `newLane < 0 || newLane > 4 || newLane === unit.lane`: return `false`
     - if `unitsOnCell(state, newLane, unit.tile).length > 0`: return `false`
     - `unit.lane = newLane`
     - if `unit.holdingBall`: `syncCarried(state)`
     - `tryPickup(state, unit)`
     - `checkScore(state)`
     - return `true`
   - `export function applyMomentum(state: MatchState, unit: Unit): void`
     - if `!unit.alive || state.phase === 'ended'`: return
     - `unit.strength += momentumStrengthBonus(unit)`
     - if `unit.kind === 'sidewinder' && unit.momentum % 3 === 0`:
       - `tryChangeLane(state, unit, sidewinderLane(unit))`
       - if `state.phase === 'ended' || !unit.alive`: return
     - if `unit.kind === 'pinball' && unit.alive`:
       - `const dest = pinballDestination(unit)`
       - `const moved = tryChangeLane(state, unit, dest.lane)`
       - if `moved && unit.alive`:
         - if `unit.lane === 0`: `unit.pinballHeading = 1`
         - else if `unit.lane === 4`: `unit.pinballHeading = -1`
         - else: `unit.pinballHeading = dest.heading`
     - if `unit.kind === 'passer' && unit.alive && unit.holdingBall && !unit.inContest && state.phase !== 'ended'`:
       - `const target = findPasserTarget(state, unit)`
       - if `target !== null`:
         - `transferPass(state, unit, target)`
         - `checkScore(state)`
   - `export function applySweeperShift(state: MatchState, unit: Unit): void`
     - if `unit.kind !== 'sweeper' || unit.sweeperShifted || !unit.alive || unit.inContest`: return
     - if `unit.tile !== 10`: return
     - `unit.sweeperShifted = true`
     - `const target = densestOffenseLane(aliveUnits(state), unit.lane)`
     - `const dir = Math.sign(target - unit.lane)`
     - `let lane = unit.lane`
     - for `let i = 0; i < unit.momentum; i += 1`:
       - if `dir === 0`: break
       - `const next = lane + dir`
       - if `next < 0 || next > 4`: break
       - if `unitsOnCell(state, next, unit.tile).length > 0`: break
       - `lane = next`
     - `unit.lane = lane`
     - if `unit.holdingBall`: `syncCarried(state)`
     - `tryPickup(state, unit)`
   - `export function stepUnit(state: MatchState, unit: Unit): void`
     - if `!unit.alive || unit.inContest || state.phase === 'ended'`: return
     - `unit.moveAcc += moveAdd(unit.speed)`
     - if `unit.moveAcc < MOVE_STEP`: return
     - `unit.moveAcc -= MOVE_STEP`
     - `const toTile = unit.tile + forward(unit.owner)`
     - if `toTile < 0 || toTile > 20`:
       - `unit.moveAcc = MOVE_STEP`
       - return
     - `const result = approachCell(state, unit, unit.lane, toTile, true)`
     - if `result === 'blocked'`: `unit.moveAcc = MOVE_STEP`
   - `export function moveAll(state: MatchState): void`
     - `const ids = byId(aliveUnits(state)).map(u => u.id)`
     - for each `id` of `ids`:
       - if `state.phase === 'ended'`: return
       - `const unit = unitById(state, id)`
       - if `unit === null || !unit.alive || unit.inContest`: continue
       - `stepUnit(state, unit)`

3. **Exact Mathematical Expressions:**
   - `moveAcc += moveAdd(speed)`. Step when `moveAcc >= 30`, then `moveAcc -= 30`.
   - A blocked step or an off-board step sets `moveAcc = 30`.
   - Travel gain is `+1` only inside `enterEmpty` when `countTile` is true. At `travelAcc >= 2`, subtract `2` and add `1` to both momentum counters, then run `applyMomentum`.
   - A lane shift does not change `tilesSinceDeploy` or `travelAcc`.

4. **Returns & Edge Cases:** `approachCell` returns `'blocked'` when a friendly occupies the cell or when a contest lock leaves the mover off that cell. It returns `'stayed'` after Bulldozer resolution or when the mover died. It returns `'scored'` when a touchdown resolves. It returns `'entered'` after a move onto an empty tile. `applySweeperShift` marks `sweeperShifted` before walking, including when `momentum` is `0`. An occupied lane on the sweeper path stops the walk on the previous lane.

### TASK 12: Spend elixir and spawn a card `src/sim/deploy.ts`

1. **Inputs & Data Shapes:** Import `DeployCommand`, `HAND_SIZE`, `LANE_COUNT`, `MatchState` from `./types`. Import `getDef` from `./roster`. Import `cycleHand` from `./deck`. Import `addUnit`, `unitsOnCell` from `./state`. Import `ownGoalTile` from `./geometry`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function applyDeploy(state: MatchState, cmd: DeployCommand | null): boolean`
     - if `cmd === null`: return `false`
     - if `state.phase === 'ended'`: return `false`
     - if `cmd.player !== 'bottom' && cmd.player !== 'top'`: return `false`
     - if `!Number.isInteger(cmd.handIndex) || cmd.handIndex < 0 || cmd.handIndex >= HAND_SIZE`: return `false`
     - if `!Number.isInteger(cmd.lane) || cmd.lane < 0 || cmd.lane >= LANE_COUNT`: return `false`
     - `const player = state.players[cmd.player]`
     - if `player.queue.length !== 8`: return `false`
     - `const kind = player.queue[cmd.handIndex]`
     - `const def = getDef(kind)`
     - if `def.cost > player.elixir`: return `false`
     - `const tile = ownGoalTile(cmd.player)`
     - if `unitsOnCell(state, cmd.lane, tile).length > 0`: return `false`
     - `player.elixir -= def.cost`
     - `cycleHand(player.queue, cmd.handIndex)`
     - `addUnit(state, { owner: cmd.player, kind, lane: cmd.lane, tile })`
     - return `true`

3. **Exact Mathematical Expressions:** Elixir after a success is `elixir - cost`. Spawn tile is `20` for `bottom` and `0` for `top`.

4. **Returns & Edge Cases:** Every failure returns `false` and does not change elixir, the queue, or `units`. A success returns `true`. The new unit does not move in the deploy function. Occupancy uses living units only.

### TASK 13: Advance one match tick `src/sim/tick.ts`

1. **Inputs & Data Shapes:** Import `DeployCommand`, `ELIXIR_CAP`, `ELIXIR_REGEN_TICKS`, `MATCH_TICKS`, `MatchState` from `./types`. Import `aliveUnits`, `byId`, `compactUnits` from `./state`. Import `tryPickup` from `./ball`. Import `checkScore`, `endByTime` from `./score`. Import `applyBurns`, `drainContests`, `refreshContest` from `./contest`. Import `applySweeperShift`, `moveAll` from `./move`. Import `applyDeploy` from `./deploy`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `function regen(state: MatchState): void`
     - if `state.tickIndex % ELIXIR_REGEN_TICKS !== 0`: return
     - `state.players.bottom.elixir = Math.min(ELIXIR_CAP, state.players.bottom.elixir + 1)`
     - `state.players.top.elixir = Math.min(ELIXIR_CAP, state.players.top.elixir + 1)`
   - `export function tick(state: MatchState, commands: DeployCommand[]): void`
     - if `state.phase === 'ended'`: return
     - `state.tickIndex += 1`
     - if `state.tickIndex >= MATCH_TICKS`:
       - `endByTime(state)`
       - return
     - `regen(state)`
     - `refreshContest(state)`
     - `compactUnits(state)`
     - `moveAll(state)`
     - if `state.phase === 'ended'`: return
     - `applyBurns(state)`
     - `compactUnits(state)`
     - `refreshContest(state)`
     - `drainContests(state)`
     - if `state.phase === 'ended'`: return
     - `compactUnits(state)`
     - for each `u` of `byId(aliveUnits(state))`:
       - if `u.kind === 'sweeper' && !u.sweeperShifted && !u.inContest && u.tile === 10`: `applySweeperShift(state, u)`
     - `refreshContest(state)`
     - for each `u` of `byId(aliveUnits(state))`: `tryPickup(state, u)`
     - if `checkScore(state)`: return
     - for each `cmd` of `commands`: `applyDeploy(state, cmd)`

3. **Exact Mathematical Expressions:** Regen fires when `tickIndex % 20 === 0`. Time ends when `tickIndex >= 1200` before regen and movement. Elixir gain is `min(10, elixir + 1)` per side.

4. **Returns & Edge Cases:** An ended match ignores later calls. A touchdown inside movement or `checkScore` skips deploys for that tick. Commands still run when the tick does not score. An empty `commands` array deploys nobody. This tick does not call an exhaustion function.

### TASK 14: Choose the top-side deploy `src/sim/ai.ts`

1. **Inputs & Data Shapes:** Import `DeployCommand`, `MatchState` from `./types`. Import `getDef` from `./roster`. Import `unitById`, `unitsOnCell` from `./state`. Import `ownGoalTile` from `./geometry`. The AI reads `state` and returns one command or `null`. It does not mutate the match.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function chooseAiCommand(state: MatchState): DeployCommand | null`
     - if `state.phase === 'ended'`: return `null`
     - `const player = state.players.top`
     - `let preferred = state.ball.lane`
     - if `state.ball.mode === 'carried' && state.ball.carrierId !== null`:
       - `const carrier = unitById(state, state.ball.carrierId)`
       - if `carrier !== null`: `preferred = carrier.lane`
     - `const lanes: number[] = [preferred]`
     - for `let lane = 0; lane <= 4; lane += 1`:
       - if `lane !== preferred`: `lanes.push(lane)`
     - `const tile = ownGoalTile('top')`
     - for `let handIndex = 0; handIndex < 4; handIndex += 1`:
       - `const kind = player.queue[handIndex]`
       - if `getDef(kind).cost > player.elixir`: continue
       - for each `lane` of `lanes`:
         - if `unitsOnCell(state, lane, tile).length > 0`: continue
         - return `{ player: 'top', handIndex, lane }`
     - return `null`

3. **Exact Mathematical Expressions:** Preferred lane is the carrier's lane when the ball is carried, otherwise `state.ball.lane`. Fallback lane order after the preferred lane is `0, 1, 2, 3, 4` with the preferred lane skipped. Top spawn tile is `0`.

4. **Returns & Edge Cases:** Returns `null` when every affordable hand card has all five spawn cells occupied, or when no hand card is affordable. The first affordable hand index wins. The first free lane in the candidate list wins. This function never spends elixir.

### TASK 15: Write simulation tests `tests/sim.test.ts`

1. **Inputs & Data Shapes:** Import `describe`, `expect`, `it` from `vitest`. Import `createMatch`, `addUnit` from `../src/sim/state`. Import `giveBall`, `tryPickup` from `../src/sim/ball`. Import `tick` from `../src/sim/tick`. Import `applyDeploy` from `../src/sim/deploy`. Import `DEFAULT_DECK` from `../src/sim/roster`. Import `assertDeck`, `handOf` from `../src/sim/deck`. Import `applyMomentum` from `../src/sim/move`. Import `applyBulldozer`, `applyBurns` from `../src/sim/contest`. Import `chooseAiCommand` from `../src/sim/ai`. Import `transferPass`, `findPasserTarget` from `../src/sim/pass`. Use `DEFAULT_DECK` for both sides unless a test builds a legal 8-kind queue. Move the kickoff ball to lane `0` tile `0` mode `'loose'` before a movement test so a runner does not collect it.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Test `'kickoff state'`: `ball.mode === 'neutral'`, `ball.lane === 2`, `ball.tile === 10`, both elixir values `5`, both touchdowns `0`, `tickIndex === 0`, hand length `4` equals the first four of `DEFAULT_DECK`.
   - Test `'deck rejects duplicates'`: `assertDeck(['passer','passer','bline','pinball','blitz','guard','tripwire','interceptor'])` throws `'duplicate kind'`.
   - Test `'cycle index 1'`: `applyDeploy` `{ player: 'bottom', handIndex: 1, lane: 2 }` returns `true`. Elixir is `3`. Spawned unit `tile === 20`, `lane === 2`, `kind === 'sidewinder'`, `strength === 300`. `queue[7] === 'sidewinder'`, `queue[0] === 'passer'`, `queue[1] === 'bline'`.
   - Test `'bulldozer costs more than 5'`: deck `['bulldozer','passer','sidewinder','bline','pinball','blitz','guard','tripwire']`. Deploy hand `0` lane `2` returns `false`. Elixir stays `5`. `units.length === 0`.
   - Test `'occupied spawn rejects'`: deploy passer on lane `2`, then deploy the new hand index `0` on lane `2`. Second call returns `false`.
   - Test `'speed 2 steps on tick 8'`: bottom passer lane `2` tile `16`, `moveAcc = 0`. Eight `tick` calls. Speed `2` adds `4` per tick. Tick 8 reaches `32`, steps, leaves `moveAcc === 2` and `tile === 15`.
   - Test `'speed 3 steps on tick 5'`: bottom passer with `speed = 3`, tile `10`, `moveAcc = 0`. Five ticks. Adds `6` per tick. `6 * 5 = 30`, so `tile === 9` and `moveAcc === 0`.
   - Test `'two free tiles give one momentum'`: bottom passer `speed = 1`, tile `16`, `moveAcc = 0`. Twenty ticks. Speed `1` adds `3` and steps every 10 ticks. Expect `tile === 14`, `momentum === 1`, `travelAcc === 0`, `momentumSinceContest === 1`, `moveAcc === 0`.
   - Test `'contest keeps travelAcc and resets since-contest'`: bottom passer tile `12` lane `2`, top passer tile `11` lane `2`. Bottom `travelAcc = 1`, `momentum = 4`, `momentumSinceContest = 5`. Both strengths `500`. One tick. Both strengths `490`. Bottom `tile === 12`, top `tile === 11`, both `inContest === true`, `travelAcc === 1`, `momentum === 4`, `momentumSinceContest === 0`.
   - Test `'lower strength dies and winner stays'`: bottom strength `300` tile `12`, top strength `100` tile `11`, same lane. Ten ticks. Top is gone. Bottom `strength === 200`, `tile === 12`, `alive === true`, `inContest === false`.
   - Test `'mutual death drops the ball on the holder tile'`: bottom strength `10` tile `12` lane `1` holding the ball, top strength `10` tile `11` lane `1`. One tick. Both gone. `ball.mode === 'loose'`, `ball.lane === 1`, `ball.tile === 12`.
   - Test `'winner does not jump onto the unit behind'`: bottom A tile `12` strength `300`, top B tile `11` strength `10`, top C tile `10` strength `300`, all lane `2`. One tick. B is gone. A `tile === 12`. C `tile === 10`. A `inContest === false`. C `inContest === false`.
   - Test `'contest does not lateral the ball'`: bottom carrier tile `12` lane `2` holding the ball. Bottom mate tile `12` lane `1`. Top enemy tile `11` lane `2`. One tick. Carrier `holdingBall === true` and `tile === 12`. Mate `holdingBall === false`. Both contestants `inContest === true`.
   - Test `'friendly block refunds the step'`: two bottom passers, tiles `12` and `11`, lane `2`. Rear unit `speed = 1`, `moveAcc = 27`. One tick. Rear `tile === 12` and `moveAcc === 30`.
   - Test `'blitz does not toss at two tiles'`: bottom blitz tile `12`, `tilesSinceDeploy = 2`, holding the ball. Top passer tile `11`, same lane. One tick. Blitz `holdingBall === true`, `tile === 12`, `inContest === true`.
   - Test `'blitz tosses after more than two tiles'`: same setup with `tilesSinceDeploy = 3`. One tick. Ball `mode === 'loose'` and `tile === 13`. Blitz `holdingBall === false`, `tile === 12`, `inContest === true`.
   - Test `'tripwire snatch'`: bottom carrier strength `300` tile `12` lane `2` holding the ball. Top tripwire strength `200` tile `11` lane `2`. One tick. Ball `mode === 'loose'` and `tile === 10`. Carrier `holdingBall === false`, `tile === 12`. Tripwire `tile === 11`. Both `inContest === true`.
   - Test `'tripwire strips 100 from a non-carrier'`: bottom passer strength `300` tile `12`, top tripwire strength `200` tile `11`, same lane, nobody holding the ball. One tick. Passer `strength === 190`. Tripwire `strength === 190`. Both alive, tiles unchanged, both `inContest === true`.
   - Test `'interceptor steals a pass'`: bottom passer tile `8` lane `2` holding the ball. Bottom mate tile `8` lane `3`. Top interceptor tile `9` lane `4`, not in contest. Call `transferPass(state, carrier, mate)`. Expect `'intercepted'`. Interceptor `lane === 3`, `tile === 9`, `holdingBall === true`. Mate `holdingBall === false`.
   - Test `'bulldozer pushes three tiles'`: bull strength `600` tile `12`, opp strength `250` tile `11`, opp owner `top`, same lane. `applyBulldozer`. `n = 3`. Opp `tile === 8`. Bull `tile === 12`. Neither `inContest`.
   - Test `'bulldozer burn lasts ten ticks'`: opp strength `1000`, `burnLeft = 0`. `applyBulldozer` with equal strength `600`. Bull is dead. Opp `burnLeft === 600`. Call `applyBurns` once. Opp `strength === 940` and `burnLeft === 540`. Call `applyBurns` nine more times. Opp `strength === 400` and `burnLeft === 0` and `alive === true`.
   - Test `'bulldozer pair does not drain'`: bottom bulldozer strength `600` tile `12`, top passer strength `200` tile `11`, `moveAcc = 0`, bulldozer `speed` left at `1`. One tick adds `3`, which is below `30`, so no push. Both strengths unchanged. Both `inContest === false`.
   - Test `'touchdown clears units'`: bottom carrier tile `1` lane `2`, `speed = 1`, `moveAcc = 27`, holding the ball, tile `0` empty. One tick. `touchdowns === 1`, `phase === 'playing'`, `units.length === 0`, ball neutral at lane `2` tile `10`.
   - Test `'second touchdown ends'`: set bottom touchdowns to `1` before that same scoring step. `phase === 'ended'`, `winner === 'bottom'`, `endReason === 'touchdowns'`.
   - Test `'tick 1200 draws'`: `tickIndex = 1199`. One tick. `phase === 'ended'`, `winner === 'draw'`, `endReason === 'time'`, `tickIndex === 1200`.
   - Test `'sidewinder on L1 shifts to L2'`: kind `sidewinder`, lane `0`, tile `10`, `momentum = 3`. `applyMomentum`. Expect `lane === 1`.
   - Test `'pinball flips off L1'`: kind `pinball`, lane `0`, `pinballHeading = -1`, `momentum = 1`. `applyMomentum`. Expect `lane === 1` and `pinballHeading === 1`.
   - Test `'passer prefers level over forward'`: passer lane `2` tile `8`. Teammate A lane `4` tile `8`. Teammate B lane `2` tile `7`. `findPasserTarget` returns A.
   - Test `'sweeper shifts once at midfield'`: top sweeper tile `10` lane `0`, `momentum = 3`, `speed = 1`, `moveAcc = 0`, `sweeperShifted = false`. Three bottom offense units on lane `4` at tiles `4`, `5`, and `6`. One tick. Sweeper `lane === 3`, `tile === 10`, `sweeperShifted === true`. A second tick leaves `lane === 3` because `moveAcc` is `6`, which is below `30`.
   - Test `'bulldozer ignores a loose ball'`: add bulldozer on lane `2` tile `10` where the kickoff ball sits. `tryPickup` returns `false`. `ball.mode === 'neutral'`.
   - Test `'elixir regen caps at 10'`: both elixir values `10`, `tickIndex = 19`. One tick. Both elixir values stay `10`. A fresh match after exactly 20 ticks has elixir `6`.
   - Test `'ai plays the cheapest leading card at the ball lane'`: fresh match. `chooseAiCommand` returns `{ player: 'top', handIndex: 0, lane: 2 }`.

3. **Exact Mathematical Expressions:** Use the integers in the tests above. Strength comparisons use `===`. Do not add tolerances.

4. **Returns & Edge Cases:** Tests must not call `chooseAiCommand` inside `tick`. Each test builds its own `createMatch`. Do not leave `it.skip` or `it.todo`.

### TASK 16: Define canvas layout and hit tests `src/render/layout.ts`

1. **Inputs & Data Shapes:** Import `UnitKind` from `../sim/types` and `ALL_KINDS` from `../sim/roster`. Import `TILE_MAX` from `../sim/types`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Export constants: `VIEW_W = 1280`, `VIEW_H = 720`, `FIELD_X = 390`, `FIELD_Y = 80`, `FIELD_W = 500`, `FIELD_H = 500`, `LANE_W = 100`, `HAND_X = 300`, `HAND_Y = 608`, `HAND_W = 150`, `HAND_H = 96`, `HAND_GAP = 12`, `NEXT_X = 948`, `NEXT_Y = 620`, `NEXT_W = 110`, `NEXT_H = 72`, `MENU_X = 1060`, `MENU_Y = 16`, `MENU_W = 180`, `MENU_H = 40`.
   - Deck roster card: `DECK_X = 48`, `DECK_Y = 110`, `DECK_W = 220`, `DECK_H = 72`, `DECK_COL_GAP = 16`, `DECK_ROW_GAP = 12`.
   - Selected row: `PICK_X = 560`, `PICK_Y = 110`, `PICK_W = 280`, `PICK_H = 36`, `PICK_GAP = 8`.
   - Start button: `START_X = 560`, `START_Y = 640`, `START_W = 240`, `START_H = 52`.
   - `export function tileToY(tile: number): number`
     - return `FIELD_Y + (tile * FIELD_H) / TILE_MAX`
   - `export function laneToX(lane: number): number`
     - return `FIELD_X + lane * LANE_W + LANE_W / 2`
   - `export function canvasPoint(canvas: HTMLCanvasElement, event: { clientX: number, clientY: number }): { x: number, y: number }`
     - `const rect = canvas.getBoundingClientRect()`
     - if `rect.width === 0 || rect.height === 0`: return `{ x: 0, y: 0 }`
     - return `{ x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }`
   - `function inside(x, y, rx, ry, rw, rh): boolean`
     - return `x >= rx && x < rx + rw && y >= ry && y < ry + rh`
   - `export function hitHand(x: number, y: number): number | null`
     - for `let i = 0; i < 4; i += 1`: if `inside` the hand rect at `HAND_X + i * (HAND_W + HAND_GAP)`, return `i`
     - return `null`
   - `export function hitLane(x: number, y: number): number | null`
     - if `!inside(x, y, FIELD_X, FIELD_Y, FIELD_W, FIELD_H)`: return `null`
     - `const lane = Math.floor((x - FIELD_X) / LANE_W)`
     - if `lane < 0 || lane > 4`: return `null`
     - return `lane`
   - `export function hitMenu(x: number, y: number): boolean`
     - return `inside(x, y, MENU_X, MENU_Y, MENU_W, MENU_H)`
   - `export function hitRoster(x: number, y: number): UnitKind | null`
     - for each `index` of `ALL_KINDS`: `col = index % 2`, `row = Math.floor(index / 2)`, test the deck rect, return `ALL_KINDS[index]` on hit
     - return `null`
   - `export function hitPick(x: number, y: number, count: number): number | null`
     - for `let i = 0; i < count; i += 1`: test `PICK_Y + i * (PICK_H + PICK_GAP)`, return `i` on hit
     - return `null`
   - `export function hitStart(x: number, y: number): boolean`
     - return `inside(x, y, START_X, START_Y, START_W, START_H)`

3. **Exact Mathematical Expressions:**
   - `tileToY(0) = 80`. `tileToY(20) = 580`. Tile `0` is the top edge. Tile `20` is the bottom edge.
   - Lane center `x = 390 + lane * 100 + 50`.

4. **Returns & Edge Cases:** Hit tests use half-open rectangles. A point on the right or bottom edge is outside. `canvasPoint` returns `{0, 0}` when the CSS box has zero width or height. `hitPick` with `count === 0` returns `null`.

### TASK 17: Draw the deck screen and the match `src/render/draw.ts`

1. **Inputs & Data Shapes:** Import `MatchState`, `Unit`, `UnitKind`, `MATCH_TICKS` from `../sim/types`. Import `ALL_KINDS`, `getDef` from `../sim/roster`. Import `handOf`, `previewOf` from `../sim/deck`. Import `aliveUnits`, `byId` from `../sim/state`. Import `thematicYard` from `../sim/geometry`. Import layout constants plus `laneToX`, `tileToY` from `./layout`. Drawing input is a `CanvasRenderingContext2D`, the screen name `'deck' | 'match'`, the selected deck `UnitKind[]`, the selected hand index `number | null`, and the match or `null`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Export `KIND_COLOR: Record<UnitKind, string>`:
     - sidewinder `#3DDC97`, passer `#F5D76E`, bline `#E74C3C`, bulldozer `#8E5A2B`, pinball `#E91E63`, blitz `#FF9800`, guard `#3498DB`, tripwire `#9B59B6`, interceptor `#1ABC9C`, sweeper `#34495E`
   - Export `KIND_LABEL`: SW, PS, BL, BD, PB, BZ, GD, TW, IN, SP in that kind order.
   - `clear(ctx)` fills `#0E1116` over `0, 0, 1280, 720`.
   - `roundStrength(strength)` returns `(strength / 100).toFixed(1)`.
   - `drawCard(ctx, x, y, w, h, kind, selected)` fills `KIND_COLOR[kind]`, strokes `#F5D76E` with line width `4` when `selected` is true, and draws the label, kind, cost, strength, and speed in `#111111` at 16px.
   - `drawDeck` clears, draws the title `Gridiron Tactics` at `48, 64`, the instruction `Pick 8 unique cards. Click a picked row to send it to the back.` at `48, 96`, one roster card per `ALL_KINDS` using the same rectangles as `hitRoster`, the picked rows, and a start button filled `#1E7A46` when `selected.length === 8` and `#333333` otherwise, with text `START`.
   - `drawField` paints lanes `#1E7A46` and `#196B3E` alternating from lane `0`. For `tile` from `0` through `20` stepping by `2`, stroke a `#F4F1DE` line at `tileToY(tile)` and draw `String(thematicYard(tile))` at `FIELD_X - 36`.
   - `drawUnit` draws a radius-`18` circle at `laneToX`, `tileToY`. Stroke `#1B4F72` for bottom and `#7B241C` for top. Draw the kind label. If `holdingBall`, draw a radius-`7` `#F4F1DE` circle at `(x + 14, y - 14)`.
   - `drawLooseBall` returns when `mode === 'carried'`. Otherwise draw a radius-`8` `#F4F1DE` circle on the ball tile.
   - `clockLabel(tickIndex)`:
     - `const remain = Math.max(0, MATCH_TICKS - tickIndex)`
     - `const seconds = Math.floor(remain / 10)`
     - `const m = Math.floor(seconds / 60)`
     - `const s = seconds % 60`
     - return `m + ':' + (s < 10 ? '0' + s : String(s))`
   - `drawMatch` draws the field, loose ball, living units in id order, the clock at `700, 40`, `YOU` and `OPP` touchdowns at `180, 40`, bottom elixir at `FIELD_X, 600`, top elixir at `FIELD_X, 68`, the four hand cards, the preview card labeled `NEXT`, and a `MENU` button. When `phase === 'ended'`, paint `rgba(0, 0, 0, 0.55)` over the canvas and one of these labels: `YOU WIN`, `YOU WIN ON TIME`, `YOU LOSE`, `YOU LOSE ON TIME`, or `DRAW`, using winner and `endReason` as in the previous mapping.
   - `export function draw(ctx, screen, selected, match, selectedHand)` calls `drawDeck` when `screen === 'deck' || match === null`, otherwise `drawMatch`.

3. **Exact Mathematical Expressions:** Remaining tenths are `max(0, 1200 - tickIndex)`. Display seconds are `floor(remain / 10)`. A fresh match shows `2:00`. Checkpoint labels are `0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100`. Strength text is `strength / 100` with one decimal.

4. **Returns & Edge Cases:** `draw` with a null match always draws the deck screen. Ended matches still draw the field and then the overlay. Dead units are omitted. The carried ball is the small circle on the carrier.

### TASK 18: Wire input and the animation frame loop `src/main.ts`

1. **Inputs & Data Shapes:** Import `createMatch` from `./sim/state`. Import `tick` from `./sim/tick`. Import `chooseAiCommand` from `./sim/ai`. Import `DEFAULT_DECK` from `./sim/roster`. Import `DeployCommand`, `MatchState`, `UnitKind` from `./sim/types`. Import `draw` from `./render/draw`. Import `canvasPoint`, `hitHand`, `hitLane`, `hitMenu`, `hitPick`, `hitRoster`, `hitStart`, `VIEW_H`, `VIEW_W` from `./render/layout`. Module state is the screen, the selected deck, the match, the selected hand index, the pending bottom command, and the frame accumulator.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `const canvas = document.getElementById('game')`
   - if `canvas === null || !(canvas instanceof HTMLCanvasElement)`: `throw new Error('missing canvas')`
   - `canvas.width = VIEW_W`
   - `canvas.height = VIEW_H`
   - `const ctx = canvas.getContext('2d')`
   - if `ctx === null`: `throw new Error('missing context')`
   - `let screen: 'deck' | 'match' = 'deck'`
   - `let selected: UnitKind[] = []`
   - `let match: MatchState | null = null`
   - `let selectedHand: number | null = null`
   - `let pending: DeployCommand | null = null`
   - `let last = performance.now()`
   - `let acc = 0`
   - `function toggleKind(kind: UnitKind): void`
     - `const index = selected.indexOf(kind)`
     - if `index >= 0`: `selected.splice(index, 1)`
     - else if `selected.length < 8`: `selected.push(kind)`
   - `function sendPickToBack(index: number): void`
     - `const kind = selected[index]`
     - `selected.splice(index, 1)`
     - `selected.push(kind)`
   - `function onPointer(event: MouseEvent): void`
     - `const p = canvasPoint(canvas, event)`
     - if `screen === 'deck'`:
       - `const kind = hitRoster(p.x, p.y)`
       - if `kind !== null`: `toggleKind(kind)`
       - `const pick = hitPick(p.x, p.y, selected.length)`
       - if `pick !== null`: `sendPickToBack(pick)`
       - if `hitStart(p.x, p.y) && selected.length === 8`:
         - `match = createMatch(selected.slice(), DEFAULT_DECK.slice())`
         - `screen = 'match'`
         - `selectedHand = null`
         - `pending = null`
         - `acc = 0`
         - `last = performance.now()`
       - return
     - if `match === null`: return
     - if `hitMenu(p.x, p.y)`:
       - `screen = 'deck'`
       - `match = null`
       - `pending = null`
       - `selectedHand = null`
       - return
     - if `match.phase !== 'playing'`: return
     - `const hand = hitHand(p.x, p.y)`
     - if `hand !== null`:
       - if `selectedHand === hand`: `selectedHand = null`
       - else: `selectedHand = hand`
       - return
     - `const lane = hitLane(p.x, p.y)`
     - if `lane !== null && selectedHand !== null`:
       - `pending = { player: 'bottom', handIndex: selectedHand, lane }`
       - `selectedHand = null`
   - `canvas.addEventListener('pointerdown', onPointer)`
   - `function frame(now: number): void`
     - `const delta = now - last`
     - `last = now`
     - if `delta > 0`: `acc += delta`
     - if `acc > 500`: `acc = 500`
     - `let steps = 0`
     - while `screen === 'match' && match !== null && acc >= 100 && steps < 5`:
       - `acc -= 100`
       - `steps += 1`
       - if `match.phase === 'playing'`:
         - `const commands = []`
         - if `pending !== null`: `commands.push(pending)`
         - `pending = null`
         - `const ai = chooseAiCommand(match)`
         - if `ai !== null`: `commands.push(ai)`
         - `tick(match, commands)`
     - `draw(ctx, screen, selected, match, selectedHand)`
     - `requestAnimationFrame(frame)`
   - `requestAnimationFrame(frame)`

3. **Exact Mathematical Expressions:** One sim step costs `100` ms of accumulator. At most `5` steps run per frame. Accumulator caps at `500` ms before the while loop.

4. **Returns & Edge Cases:** Missing canvas or context throws and does not start the loop. Deck start requires length `8`. Menu drops the match and keeps the current `selected` list. Clicks during `'ended'` do nothing except MENU. The bottom command is pushed before the AI command.

### TASK 19: Scaffold the Vite project `package.json`

1. **Inputs & Data Shapes:** Create these files with the exact contents in the control flow: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/style.css`. Do not add a README. Do not add dependencies beyond `typescript`, `vite`, and `vitest`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Write `package.json`:
     - `name`: `gridiron-tactics`
     - `private`: true
     - `type`: `module`
     - scripts: `dev` = `vite`, `build` = `tsc --noEmit && vite build`, `test` = `vitest run`
     - `devDependencies`: `typescript` `^5.6.0`, `vite` `^5.4.0`, `vitest` `^2.1.0`
   - Write `tsconfig.json` compilerOptions: `target` `ES2022`, `module` `ESNext`, `moduleResolution` `bundler`, `strict` true, `noEmit` true, `skipLibCheck` true, `isolatedModules` true, `useDefineForClassFields` true, `lib` `['ES2022', 'DOM']`. `include` is `['src', 'tests']`.
   - Write `vite.config.ts`:
     - `import { defineConfig } from 'vitest/config'`
     - default export `defineConfig({ test: { include: ['tests/**/*.test.ts'] } })`
   - Write `index.html` with `lang="en"`, charset utf-8, viewport, title `Gridiron Tactics`, stylesheet `/src/style.css`, canvas `id="game"` width `1280` height `720`, module script `/src/main.ts`.
   - Write `src/style.css`:
     - `html, body { margin: 0; height: 100%; background: #0E1116; }`
     - `body { display: flex; align-items: center; justify-content: center; }`
     - `canvas { width: min(100vw, calc(100vh * 1280 / 720)); height: auto; background: #0E1116; }`

3. **Exact Mathematical Expressions:** Canvas CSS width is `min(100vw, 100vh * 1280 / 720)`. Hit testing divides by the CSS rect, so this scale does not change sim coordinates.

4. **Returns & Edge Cases:** `npm test` must be able to import the sim without a browser. DOM types exist only for `src/main.ts` and `src/render`. Tests import sim modules only.
