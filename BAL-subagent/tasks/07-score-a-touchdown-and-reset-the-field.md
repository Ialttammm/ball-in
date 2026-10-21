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
