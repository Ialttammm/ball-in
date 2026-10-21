### TASK 09: Compute passive shift targets `src/sim/abilities.ts`

1. **Inputs & Data Shapes:** Import `STRENGTH_SCALE`, `Unit` from `./types`. Densest-lane input is the living unit list plus the sweeper's current lane.

2. **Explicit Control Flow & Logic (MANDATORY):**
   - `export function momentumStrengthBonus(unit: Unit): number`
     - `let bonus = 0`
     - if `unit.kind === 'bline' && unit.momentumSinceContest > 0 && unit.momentumSinceContest % 3 === 0`: `bonus += STRENGTH_SCALE`
     - if `unit.kind === 'guard' && unit.momentum > 0 && unit.momentum % 2 === 0`: `bonus += STRENGTH_SCALE`
     - return `bonus`
   - `export function sidewinderLane(unit: Unit): number`
     - if `unit.lane === 0`: return `1`
     - return `unit.lane - 1`
   - `export function pinballDestination(unit: Unit): { lane: number, heading: -1 | 1 }`
     - `let heading = unit.pinballHeading`
     - `let lane = unit.lane + heading`
     - if `lane < 0 || lane > 4`:
       - `heading = heading === -1 ? 1 : -1`
       - `lane = unit.lane + heading`
     - return `{ lane, heading }`
   - `export function densestOffenseLane(units: Unit[], fromLane: number): number`
     - `const counts = [0, 0, 0, 0, 0]`
     - for each `u` of `units`:
       - if `!u.alive || u.role !== 'offense'`: continue
       - if `u.lane < 0 || u.lane > 4`: continue
       - `counts[u.lane] += 1`
     - `let best = 0`
     - for `let lane = 1; lane <= 4; lane += 1`:
       - if `counts[lane] > counts[best]`: `best = lane`
       - else if `counts[lane] === counts[best]`:
         - `const dNew = Math.abs(lane - fromLane)`
         - `const dOld = Math.abs(best - fromLane)`
         - if `dNew < dOld || (dNew === dOld && lane < best)`: `best = lane`
     - return `best`

3. **Exact Mathematical Expressions:**
   - B-Line bonus when `momentumSinceContest` is a positive multiple of 3.
   - Guard bonus when `momentum` is a positive multiple of 2.
   - Sidewinder from lane `0` targets lane `1`. Otherwise the target is `lane - 1`.
   - Pinball step is `lane + heading`, with heading negated when the raw lane is outside `0..4`.

4. **Returns & Edge Cases:** `momentumStrengthBonus` returns `0` or `100`. `densestOffenseLane` with all counts at `0` returns the lane closest to `fromLane`, then the lower index. `pinballDestination` does not mutate the unit.
