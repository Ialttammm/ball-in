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
