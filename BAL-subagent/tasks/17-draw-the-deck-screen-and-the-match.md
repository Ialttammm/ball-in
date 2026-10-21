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
