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
