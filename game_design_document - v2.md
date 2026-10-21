# # Gridiron Tactics — Comprehensive Game Design Document (GDD)

## 1. Core Concept

**Gridiron Tactics** is a real-time, lane-pushing tactical sports game that merges American football's core principles—territory control, physical blocking, momentum, ball retention, and playmaking—with *Clash Royale*-style deck management and **Touchdown Mode**[cite: 1, 2]. 

Instead of traditional fantasy combat with abstract health pools, units use **Mass, Strength, and Momentum** to engage in physical tug-of-wars, execute lateral passes, bait defenders, and cross the goal line for touchdowns[cite: 1, 2].

---

## 2. Updated Spatial Grid & Field Architecture

To ensure lightning-fast tactical pacing and responsive defensive rotations, the field uses a compressed, highly readable discrete grid:

* **5 Vertical Lanes:** `Left 1 (L1)`, `Left 2 (L2)`, `Central (C)`, `Right 2 (R2)`, `Right 1 (R1)`[cite: 1].

* **Longitudinal Length:** **20 Tiles total** from endzone to endzone[cite: 1, 2].

  * **Thematic Skin:** 1 tile equals **5 thematic yards**, scaling to a total 100-yard arena field[cite: 1, 2].

  * **Midfield:** Located precisely at **Tile 10** (the 50-yard line)[cite: 1].

  * **Spawn Lines:** Bottom player spawns units at **Tile 20** (Yard 100 / Home Goal Line); Top player spawns at **Tile 0** (Yard 0 / Enemy Goal Line)[cite: 1].

* **Yard-Line Checkpoints:** Drawn every 2 tiles (every 10 yards). These checkpoints exist strictly to serve as **Momentum Milestones**[cite: 1, 2].

---

## 3. Tile Occupancy & Collision Rules

* **Single-Unit Capacity:** Exactly **1 unit per tile max**[cite: 1]. Friendly units block friendly units; you cannot stack multiple friendly characters onto the same tile[cite: 1].

* **Longitudinal Face-to-Face Contact:** 

  * Units march forward tile-by-tile along their lane's longitudinal axis[cite: 1].

  * When a unit attempts to step into a tile occupied by an enemy, movement halts instantly[cite: 1]. 

   *Rather than sharing a single coordinate, the units occupy* *distinct, adjacent sequential tiles** facing each other, locking into an active **Contest State** across their shared boundary line[cite: 1].

* **Lateral Shifts (Side-to-Side):** 

  * Lateral movements (such as Sidewinder or Pinball lane shifts) occur instantly across the X-axis (lanes) based on momentum triggers, provided the target lateral tile is empty[cite: 1].

---

## 4. Movement Speeds & Arena Timing

The game runs on a fixed engine tick rate of **10 ticks per second**[cite: 1, 2]. Movement is handled via an accumulator system `moveAcc`) that translates into clean, discrete tile steps[cite: 1]. 

Speeds are balanced so that units cross the full 20-tile arena within a snappy window:

| Speed Tier | Functional Speed | Crossing Time (20 Tiles) | Step Frequency |

| :--- | :--- | :--- | :--- |

| **Fast** (Speed 3) | High-speed sprinters (B-Line, Pinball, Blitz, Interceptor)[cite: 1] | **10 seconds**[cite: 2] (100 ticks)[cite: 1] | 1 tile every tick[cite: 1] |

| **Moderate** (Speed 2) | Balanced runners & defenders (Sidewinder, Passer, Guard, Tripwire)[cite: 1] | **15 seconds**[cite: 2] | 1 tile every 1.5 ticks[cite: 1] |

| **Slow** (Speed 1) | Heavy tanks & anchors (Bulldozer, Sweeper)[cite: 1] | **20 seconds**[cite: 2] (200 ticks)[cite: 1] | 1 tile every 2 ticks[cite: 1] |

---

## 5. Match Structure, Deployment & Economy

* **Match Duration & Win Conditions:**

  * **Time Limit:** Matches are capped at **2 minutes** (1,200 ticks total). At time expiration, the player with the higher touchdown total wins; equal totals result in a draw[cite: 1, 2].

  * **Touchdowns:** First side to score **2 Touchdowns** wins immediately, ending the match early and allowing one side to claim victory[cite: 1, 2].

  * **Field Reset:** Scoring a touchdown clears all active units, resets the ball to neutral at `Central, Tile 10` (Yard 50), and resumes play while keeping current scores and elixir[cite: 1, 2].

* **Deployment System:**

  * **Anytime Deployment:** Players can deploy cards dynamically at any time during the match as long as they have sufficient Elixir[cite: 1, 2].

  * **Spawn Rule:** Units spawn exclusively on the deployer's own goal line in the selected lane[cite: 1, 2].

* **Deployment Budget (Elixir):**

   *Starts at* *5 Elixir**, capped at **10 Elixir**[cite: 1, 2].

   *Regenerates* *+1 Elixir every 2 seconds** (every 20 ticks)[cite: 1, 2]. No field cap and no global deploy cooldown[cite: 1, 2].

* **Deck Management:**

  * Players bring an 8-card deck selected from the full character roster[cite: 1, 2].

  * An active hand of 4 cards rotates dynamically as cards are played[cite: 1, 2]. A preview card shows the next card up in the queue[cite: 1, 2].

---

## 6. The Momentum Engine

* **Accumulation:** For every **10 yards** (every 2 tiles) traveled continuously *without* being locked in a contest, a unit gains **$+1\text{ Momentum}$**[cite: 1, 2].

* **Contest Interruption:** Entering an active contest pauses momentum accumulation and resets the active milestone counter `momentumSinceContest`), though lifetime/total momentum values are preserved for passive traits[cite: 1, 2].

* **Triggers:** Abilities for units like Sidewinder, Pinball, B-Line, and Guard fire automatically upon reaching specific momentum thresholds[cite: 2].

---

## 7. Character Roster Specifications

### **Offense Roster**

1. **Sidewinder (Cost: 2 | Str: 3 | Speed: Moderate):** 

   * *Passive:* Seeks Left every 3 Momentum[cite: 1, 2]. When hitting the left boundary wall `Left 1`), takes 1 detour shift Right before resuming its Left-seeking wave pattern[cite: 1, 2].

2. **Passer (Cost: 1 | Str: 2 | Speed: Moderate):** 

   * *Passive:* Automatically passes the ball to the nearest eligible forward/level teammate upon gaining momentum[cite: 1, 2].

3. **B-Line (Cost: 2 | Str: 1 | Speed: Fast):** 

   * *Passive:* Gains $+1\text{ Strength}$ for every 3 Momentum accumulated since the last contest[cite: 1, 2].

4. **Bulldozer (Cost: 6 | Str: 6 | Speed: Slow):** 

   * *Passive:* Non-carrier wedge[cite: 1, 2]. When colliding with a weaker opponent, pushes them back by a distance equal to the strength difference[cite: 1, 2]. Against equal/stronger opponents, instantly evaporates while inflicting a massive $600\text{ Strength}$ burn on the opponent over 1 second[cite: 1, 2].

5. **Pinball (Cost: 3 | Str: 2 | Speed: Fast):** 

   * *Passive:* Shifts 1 lane every 1 Momentum, ping-ponging aggressively across the board and reversing direction exclusively upon hitting outer boundary walls `Left 1` / `Right 1`)[cite: 1, 2].

6. **Blitz Runner (Cost: 2 | Str: 1 | Speed: Fast):** 

   * *Passive:* Straight-line sprint[cite: 1, 2]. If entering a contest after traveling $>10$ yards, instantly tosses the ball 1 yard backward in-lane for trailing teammates before engaging[cite: 1, 2].

### **Defense Roster**

7. **Guard (Cost: 4 | Str: 4 | Speed: Moderate):** 

   * *Passive:* Gains $+1\text{ Strength}$ for every 2 Momentum gained charging downfield[cite: 1, 2].

8. **Tripwire (Cost: 2 | Str: 2 | Speed: Moderate):** 

   * *Passive:* Against a stronger ball carrier, snatches the ball and drops it directly behind itself[cite: 1, 2]. Against non-carriers, strips $-1\text{ Strength}$ off the opponent upon contact[cite: 1, 2].

9. **Interceptor (Cost: 3 | Str: 2 | Speed: Fast):** 

   * *Passive:* Active exclusively on home territory (own half of the field)[cite: 1, 2]. Leaps laterally to intercept and steal adjacent air passes[cite: 1, 2].

10. **Sweeper (Cost: 5 | Str: 4 | Speed: Slow):** 

    * *Passive:* Remains inactive until reaching Midfield (Tile 10 / Yard 50)[cite: 1, 2]. Upon crossing midfield, performs a 1-time shift toward the densest offensive lane by a distance equal to its accumulated momentum[cite: 1, 2].