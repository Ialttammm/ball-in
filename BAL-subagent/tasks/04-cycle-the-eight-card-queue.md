### TASK 04: Cycle the eight-card queue `src/sim/deck.ts`

1. **Inputs & Data Shapes:** Import `DECK_SIZE`, `HAND_SIZE`, `UnitKind` from `./types`. Import `ROSTER` from `./roster`. A queue is `UnitKind[]` of length 8. Hand is the first 4 entries. Preview is index 4.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function assertDeck(queue: UnitKind[]): void`
     - if `queue.length !== DECK_SIZE`: `throw new Error('deck length')`
     - `const seen = new Set<string>()`
     - for each `kind` of `queue`:
       - if `ROSTER[kind] === undefined`: `throw new Error('unknown kind')`
       - if `seen.has(kind)`: `throw new Error('duplicate kind')`
       - `seen.add(kind)`
   - `export function handOf(queue: UnitKind[]): UnitKind[]`
     - return `queue.slice(0, HAND_SIZE)`
   - `export function previewOf(queue: UnitKind[]): UnitKind`
     - return `queue[HAND_SIZE]`
   - `export function cycleHand(queue: UnitKind[], handIndex: number): void`
     - `const card = queue[handIndex]`
     - `queue.splice(handIndex, 1)`
     - `queue.push(card)`

3. **Exact Mathematical Expressions:** Hand indices are `0, 1, 2, 3`. After cycling index `i`, the length is still 8 and the played kind is at index 7.

4. **Returns & Edge Cases:** `assertDeck` returns `void` on success. `cycleHand` mutates the array in place and returns `void`. Callers must reject a `handIndex` outside `0..3` before calling. This function does not check elixir.
