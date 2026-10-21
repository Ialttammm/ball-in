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
