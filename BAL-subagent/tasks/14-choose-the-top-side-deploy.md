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
