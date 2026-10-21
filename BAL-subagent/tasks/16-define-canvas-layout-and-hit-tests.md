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
