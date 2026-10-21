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
