### TASK 02: Define the roster table `src/sim/roster.ts`

1. **Inputs & Data Shapes:** Import `Role`, `UnitKind` from `./types`. Export interface `UnitDef` with `kind: UnitKind`, `role: Role`, `cost: number`, `strength: number`, `speed: 1 | 2 | 3`.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - Export `ROSTER: Record<UnitKind, UnitDef>`:
     - sidewinder: offense, cost 2, strength 3, speed 2
     - passer: offense, cost 1, strength 2, speed 2
     - bline: offense, cost 2, strength 1, speed 3
     - bulldozer: offense, cost 6, strength 6, speed 1
     - pinball: offense, cost 3, strength 2, speed 3
     - blitz: offense, cost 2, strength 1, speed 3
     - guard: defense, cost 4, strength 4, speed 2
     - tripwire: defense, cost 2, strength 2, speed 2
     - interceptor: defense, cost 3, strength 2, speed 3
     - sweeper: defense, cost 5, strength 4, speed 1
   - Export `ALL_KINDS: UnitKind[]` in the order listed above.
   - Export `DEFAULT_DECK: UnitKind[]` equal to `['passer', 'sidewinder', 'bline', 'pinball', 'blitz', 'guard', 'tripwire', 'interceptor']`.
   - Export `function getDef(kind: UnitKind): UnitDef` with body `return ROSTER[kind]`.

3. **Exact Mathematical Expressions:** Stored unit strength later is `getDef(kind).strength * 100`. Do not multiply inside this file.

4. **Returns & Edge Cases:** `getDef` always returns a row because `kind` is a closed union. Do not throw.
