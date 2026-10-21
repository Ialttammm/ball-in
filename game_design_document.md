# Gridiron Tactics: Game Mechanics & Design Specification

---

## 1. Executive Summary & Core Concept

**Gridiron Tactics** is a fast-paced, real-time lane-based tactical strategy game. It fuses the deck-building and deployment mechanics of top-down card battlers with the raw physicality, spatial positioning, momentum, and ball-handling dynamics of American Football.

Rather than relying on classic fantasy combat or health bars, gameplay centers on **Mass, Stopping Power, Line-of-Sight Passes, and Momentum**. Players deploy specialized football units into five distinct lanes. Victory requires out-maneuvering defenders, executing lateral offloads, managing field territory, and driving the football into the opponent's endzone for a Touchdown.

---

## 2. Pitch Architecture & Spatial Grid

The battlefield is arranged as a uniform $5 \times 100$ grid representing the lanes and yard lines.

```
+-----------------------------------------------------------------------+
|                       ENEMY ENDZONE (Goal Line: 0)                    |
|   [Left 1]  |  [Left 2]  |  [Central]  |  [Right 2]  |  [Right 1]     |
|             |            |             |            |                 |
|   ................... ENEMY 25-YARD LINE ....................         |
|             |            |             |            |                 |
|===================== MIDFIELD 50-YARD LINE ===========================|
|             |            | (BALL STARTS)|           |                 |
|   ................... YOUR 25-YARD LINE .....................         |
|             |            |             |            |                 |
|   [Left 1]  |  [Left 2]  |  [Central]  |  [Right 2]  |  [Right 1]     |
|                        YOUR ENDZONE (Goal Line: 100)                  |
+-----------------------------------------------------------------------+
```

* **5 Vertical Lanes:** `Left 1` (L1), `Left 2` (L2), `Central` (C), `Right 2` (R2), and `Right 1` (R1).
* **100 Horizontal Yard Lines:** Ranked from `Yard 100` (Your Endzone/Spawn) to `Yard 0` (Enemy Endzone).
* **Kickoff Point:** At match start or play resets, the ball starts neutral on the **Midfield 50-Yard Line on Lane Central**.

---

## 3. Core Physics & System Rules

### 3.1 Universal Flat Contest Drain Rate
When two opposing units meet in the same lane and yard increment, movement halts, and they enter a **Contest State**. 
* **Flat Drain Rate:** Both contesting units lose strength at a constant rate:
  $$\text{Universal Drain Rate} = 1.0\text{ Strength / second}$$
* A unit's **Strength** stat directly dictates its survival duration ($T$) in seconds during a head-to-head contest:
  $$T = \text{Base Strength}$$

### 3.2 Unobstructed Momentum Accumulation
**Momentum** is the engine powering passive skills and tactical triggers.
* **Accumulation Rate:** A unit generates **$+1\text{ Momentum}$** for every **$10\text{ yards}$** ($1\text{ yard line increment}$) traveled continuously downfield without entering a contest.
* **Contest Interruption:** Getting locked into a contest immediately pauses momentum accumulation.

### 3.3 Movement Speed Constants
Units operate across three fixed movement speed tiers:
1. **Slow:** $1.0\text{ tile / sec}$ (Heavy Linemen, Anchors)
2. **Moderate:** $2.0\text{ tiles / sec}$ (Carriers, Linebackers)
3. **Fast / Sprint:** $3.0\text{ tiles / sec}$ (Receivers, Gunners, Blitzers)

### 3.4 Territory Exhaustion Penalty
Defenders operating deep in offensive territory suffer a physical toll:
* Any defensive unit advancing **past the 50-Yard Line** suffers a passive **Exhaustion Drain of $0.5\text{ Str/sec}$** continuously, even when moving outside of a contest.
* **Defensive Ball Carriers:** If a defensive unit intercepts or recovers the ball past the 50-Yard Line, any contest they enter incurs a **$2\times\text{ Drain Rate}$ ($2.0\text{ Str/sec}$)** penalty.

### 3.5 The Universal Advance & Block Rule
When a $1\text{v}1$ contest resolves:
1. If Unit $A$ defeats Unit $B$, Unit $A$ immediately advances into Unit $B$'s vacated yard tile.
2. If Unit $C$ (same team as $B$) is positioned directly behind $B$, Unit $C$ **does not advance**.
3. Unit $A$ entering Unit $B$'s tile instantly initiates a fresh $1\text{v}1$ contest against Unit $C$.

```
BEFORE RESOLUTION:
[ Lane 1 ]  -->  [ Unit A (Offense) ]  vs  [ Unit B (Defense) ] [ Unit C (Defense) ]

AFTER UNIT A DEFEATS B:
[ Lane 1 ]  -->                            [ Unit A (Offense) ] [ Unit C (Defense) ]
                                           (New Contest Initiated!)
```

### 3.6 Automatic Adjacent Lateral Passes
When a ball-carrying unit (Carrier $A$) enters a contest:
* If a friendly unit (Receiver $B$) is positioned on the **same yard line increment** and in an **adjacent lane** ($1\text{ lane}$ Left or Right), Carrier $A$ automatically passes the ball to Receiver $B$, rescuing the play and bypassing the contest.

---

## 4. Character Roster & Ability Specifications

All character abilities function on **100% passive, condition-driven triggers**.

### 4.1 Offensive Roster

#### **Sidewinder**
* **Role:** Offense / Dynamic Weaver
* **Cost:** 2 Deployment Budget | **Base Strength:** 3 | **Speed:** Moderate
* **Passive Mechanics (Seek Left):**
  * Every $3\text{ Momentum}$ gained ($30\text{ yards}$), shifts $1\text{ lane}$ Left.
  * **Boundary Rule:** If standing on `Left 1`, takes $1\text{ detour shift}$ Right to `Left 2`, then immediately seeks Left again on the next trigger.

#### **Passer**
* **Role:** Offense / Playmaker
* **Cost:** 1 Deployment Budget | **Base Strength:** 2 | **Speed:** Moderate
* **Passive Mechanics (Auto-Offload):**
  * While holding the ball, automatically passes to the nearest forward or parallel teammate every time $1\text{ Momentum}$ ($10\text{ yards}$) is gained.

#### **B-Line**
* **Role:** Offense / Momentum Scaler
* **Cost:** 2 Deployment Budget | **Base Strength:** 1 | **Speed:** Fast
* **Passive Mechanics (Freight Train):**
  * Gains $+1\text{ Strength}$ for every $3\text{ Momentum}$ ($30\text{ yards}$) accumulated continuously without interruption.

#### **Bulldozer**
* **Role:** Offense / Wedge Cleaver (Non-Carrier)
* **Cost:** 6 Deployment Budget | **Base Strength:** 6 | **Speed:** Slow
* **Passive Mechanics (Lead Block):**
  * **Condition:** Does **NOT** carry the ball.
  * **Vs Opponent with LESS Strength ($<\text{Bulldozer Str}$):** Pushes the opponent backward by $N\text{ yard lines}$, where $N = (\text{Bulldozer Str} - \text{Opponent Str})$.
  * **Vs Opponent with EQUAL or GREATER Strength ($\ge\text{Bulldozer Str}$):** Rapid Burnout. Bulldozer is instantly destroyed, forcing an accelerated **$1\text{-second}$ drain** that strips its full base strength ($6\text{ Str}$) off the opponent's total strength.

#### **Pinball**
* **Role:** Offense / Cross-Lane Distractor
* **Cost:** 3 Deployment Budget | **Base Strength:** 2 | **Speed:** Fast
* **Passive Mechanics (Ping-Pong Sweep):**
  * On deployment, shifts $1\text{ lane}$ Left every $1\text{ Momentum}$ ($10\text{ yards}$).
  * Upon reaching `Left 1`, reverses shift bias to Right every $1\text{ Momentum}$ until hitting `Right 1`, repeating across the field.

#### **Blitz Runner**
* **Role:** Offense / Bait & Fumble
* **Cost:** 2 Deployment Budget | **Base Strength:** 1 | **Speed:** Fast
* **Passive Mechanics (Back-Toss Fumble):**
  * Runs in a straight line.
  * When entering a contest while holding the ball, instantly tosses the ball **$1\text{ yard line}$ backward** in its current lane.
  * **Exception:** Does not trigger if caught within the first $10\text{ yards}$ of deployment (Yard 90–100).

---

### 4.2 Defensive Roster

#### **Guard**
* **Role:** Defense / Charging Enforcer
* **Cost:** 4 Deployment Budget | **Base Strength:** 4 | **Speed:** Moderate
* **Passive Mechanics (Downhill Charge):**
  * Gains $+1\text{ Strength}$ for every $2\text{ Momentum}$ ($20\text{ yards}$) gained charging downfield toward the opponent.

#### **Tripwire**
* **Role:** Defense / Trap & Strip Unit
* **Cost:** 2 Deployment Budget | **Base Strength:** 2 | **Speed:** Moderate
* **Passive Mechanics (Ball Snatch / Drain):**
  * **Vs Ball-Carrying Opponent (Str $>$ Tripwire):** Instantly snatches the ball upon collision and drops it $1\text{ yard line}$ directly behind itself.
  * **Vs Non-Ball-Carrying Opponent:** Strips $1\text{ Strength}$ off the opponent's total strength instantly upon entering the contest.

#### **Interceptor**
* **Role:** Defense / Air Defense Guard
* **Cost:** 3 Deployment Budget | **Base Strength:** 2 | **Speed:** Fast
* **Passive Mechanics (Home-Turf Air Catch):**
  * **Spatial Constraint:** Active **ONLY** on your side of the pitch ($>\text{Yard 50}$).
  * If an enemy within range ($1\text{ yard line}$ forward/backward) triggers an adjacent air pass, Interceptor leaps $1\text{ lane}$ laterally to catch and steal the ball, initiating a turnover run.

#### **Sweeper**
* **Role:** Defense / Panic Cutoff
* **Cost:** 5 Deployment Budget | **Base Strength:** 4 | **Speed:** Slow
* **Passive Mechanics (Midfield Magnet Shift):**
  * Does not shift prior to an active contest.
  * **Mandatory Midfield Trigger:** Upon reaching the 50-Yard Line, forces a lane shift toward the highest-density offensive lane. The shift distance equals total Momentum accumulated (e.g., $3\text{ Momentum} = 3\text{ lanes}$ shift).

---

## 5. Match Mechanics & Gameplay Loop

```
+-----------------------------------------------------------------------+
|                         GAMEPLAY FLOW LOOP                            |
+-----------------------------------------------------------------------+
|  1. DEPLOYMENT PHASE:                                                 |
|     - Spend Deployment Budget (Elixir) to spawn units at baseline.     |
|                                                                       |
|  2. MOMENTUM & ENGAGEMENT PHASE:                                      |
|     - Units rush forward, generating Momentum per 10 yards.          |
|     - Units engage in 1v1 Contests (Flat 1 Str/sec drain rate).        |
|                                                                       |
|  3. PIVOT & TACTICAL PHASE:                                           |
|     - Sidewinder/Pinball shift lanes to bypass defenders.             |
|     - Contested carriers auto-pass to adjacent level teammates.       |
|     - Blitz/Tripwire pop loose balls backward into open lanes.         |
|                                                                       |
|  4. SCORE OR TURNOVER:                                                |
|     - Carrier reaches Goal Line (Yard 0) --> TOUCHDOWN!               |
|     - Score increases, pitch resets to Midfield 50-Yard Kickoff.      |
+-----------------------------------------------------------------------+
```

1. **Deployment Budget:** Regenerates at a steady rate throughout the match.
2. **Scoring:** The first player to score **2 Touchdowns**, or the player with the highest score at the end of a **3-Minute Timer**, wins the match.
3. **Field Reset:** Following a Touchdown, all units are cleared from the field, and the ball is reset to neutral at **Midfield 50-Yard Line on Lane Central**.
```

I have created the full Game Design Document (`game_design_document.md`) incorporating all your rules, stats, spatial interactions, and character mechanics.