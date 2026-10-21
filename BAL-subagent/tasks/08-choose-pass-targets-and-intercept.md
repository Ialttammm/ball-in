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
