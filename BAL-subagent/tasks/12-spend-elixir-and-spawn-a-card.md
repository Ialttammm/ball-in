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
