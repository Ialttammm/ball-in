import { describe, expect, it } from 'vitest';
import { createMatch, addUnit } from '../src/sim/state';
import { giveBall, tryPickup } from '../src/sim/ball';
import { tick } from '../src/sim/tick';
import { applyDeploy } from '../src/sim/deploy';
import { DEFAULT_DECK } from '../src/sim/roster';
import { assertDeck, handOf } from '../src/sim/deck';
import { applyMomentum } from '../src/sim/move';
import { applyBulldozer, applyBurns } from '../src/sim/contest';
import { chooseAiCommand } from '../src/sim/ai';
import { easePassRadius, findPasserTarget, previewPass, transferPass, tryPass } from '../src/sim/pass';
import type { MatchState, UnitKind } from '../src/sim/types';

function match(bottom: UnitKind[] = DEFAULT_DECK, top: UnitKind[] = DEFAULT_DECK): MatchState {
  return createMatch(bottom.slice(), top.slice());
}

function parkBall(state: MatchState): void {
  state.ball.mode = 'loose';
  state.ball.lane = 0;
  state.ball.tile = 0;
  state.ball.carrierId = null;
}

function run(state: MatchState, n: number): void {
  for (let i = 0; i < n; i += 1) tick(state, []);
}

describe('simulation', () => {
  it('kickoff state', () => {
    const state = match();
    expect(state.ball.mode).toBe('neutral');
    expect(state.ball.lane).toBe(2);
    expect(state.ball.tile).toBe(10);
    expect(state.players.bottom.elixir).toBe(5);
    expect(state.players.top.elixir).toBe(5);
    expect(state.players.bottom.touchdowns).toBe(0);
    expect(state.players.top.touchdowns).toBe(0);
    expect(state.tickIndex).toBe(0);
    expect(handOf(state.players.bottom.queue)).toEqual(DEFAULT_DECK.slice(0, 4));
    expect(handOf(state.players.bottom.queue)).toHaveLength(4);
  });

  it('deck rejects duplicates', () => {
    expect(() =>
      assertDeck(['passer', 'passer', 'bline', 'pinball', 'blitz', 'guard', 'tripwire', 'interceptor']),
    ).toThrow('duplicate kind');
  });

  it('cycle index 1', () => {
    const state = match();
    expect(applyDeploy(state, { player: 'bottom', handIndex: 1, lane: 2 })).toBe(true);
    expect(state.players.bottom.elixir).toBe(3);
    const unit = state.units[0];
    expect(unit.tile).toBe(20);
    expect(unit.lane).toBe(2);
    expect(unit.kind).toBe('sidewinder');
    expect(unit.strength).toBe(300);
    const queue = state.players.bottom.queue;
    expect(queue[7]).toBe('sidewinder');
    expect(queue[0]).toBe('passer');
    expect(queue[1]).toBe('bline');
  });

  it('bulldozer costs more than 5', () => {
    const bottom: UnitKind[] = ['bulldozer', 'passer', 'sidewinder', 'bline', 'pinball', 'blitz', 'guard', 'tripwire'];
    const state = match(bottom, DEFAULT_DECK);
    expect(applyDeploy(state, { player: 'bottom', handIndex: 0, lane: 2 })).toBe(false);
    expect(state.players.bottom.elixir).toBe(5);
    expect(state.units).toHaveLength(0);
  });

  it('occupied spawn rejects', () => {
    const state = match();
    expect(applyDeploy(state, { player: 'bottom', handIndex: 0, lane: 2 })).toBe(true);
    expect(applyDeploy(state, { player: 'bottom', handIndex: 0, lane: 2 })).toBe(false);
  });

  it('speed 2 steps on tick 8', () => {
    const state = match();
    parkBall(state);
    const unit = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 16 });
    unit.moveAcc = 0;
    run(state, 8);
    expect(unit.tile).toBe(15);
    expect(unit.moveAcc).toBe(2);
  });

  it('speed 3 steps on tick 5', () => {
    const state = match();
    parkBall(state);
    const unit = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 10 });
    unit.speed = 3;
    unit.moveAcc = 0;
    run(state, 5);
    expect(unit.tile).toBe(9);
    expect(unit.moveAcc).toBe(0);
  });

  it('two free tiles give one momentum', () => {
    const state = match();
    parkBall(state);
    const unit = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 0, tile: 16 });
    unit.speed = 1;
    unit.moveAcc = 0;
    run(state, 20);
    expect(unit.tile).toBe(14);
    expect(unit.momentum).toBe(1);
    expect(unit.travelAcc).toBe(0);
    expect(unit.momentumSinceContest).toBe(1);
    expect(unit.moveAcc).toBe(0);
  });

  it('contest keeps travelAcc and resets since-contest', () => {
    const state = match();
    const bottom = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const top = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    bottom.travelAcc = 1;
    bottom.momentum = 4;
    bottom.momentumSinceContest = 5;
    bottom.strength = 500;
    top.strength = 500;
    run(state, 1);
    expect(bottom.strength).toBe(490);
    expect(top.strength).toBe(490);
    expect(bottom.tile).toBe(12);
    expect(top.tile).toBe(11);
    expect(bottom.inContest).toBe(true);
    expect(top.inContest).toBe(true);
    expect(bottom.travelAcc).toBe(1);
    expect(bottom.momentum).toBe(4);
    expect(bottom.momentumSinceContest).toBe(0);
  });

  it('lower strength dies and winner stays', () => {
    const state = match();
    const bottom = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const top = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    bottom.strength = 300;
    top.strength = 100;
    run(state, 10);
    expect(state.units.find(u => u.id === top.id)).toBeUndefined();
    expect(bottom.strength).toBe(200);
    expect(bottom.tile).toBe(12);
    expect(bottom.alive).toBe(true);
    expect(bottom.inContest).toBe(false);
  });

  it('mutual death drops the ball on the holder tile', () => {
    const state = match();
    const bottom = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 1, tile: 12 });
    const top = addUnit(state, { owner: 'top', kind: 'passer', lane: 1, tile: 11 });
    bottom.strength = 10;
    top.strength = 10;
    giveBall(state, bottom);
    run(state, 1);
    expect(state.units).toHaveLength(0);
    expect(state.ball.mode).toBe('loose');
    expect(state.ball.lane).toBe(1);
    expect(state.ball.tile).toBe(12);
  });

  it('winner does not jump onto the unit behind', () => {
    const state = match();
    const a = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const b = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    const c = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 10 });
    a.strength = 300;
    b.strength = 10;
    c.strength = 300;
    run(state, 1);
    expect(state.units.find(u => u.id === b.id)).toBeUndefined();
    expect(a.tile).toBe(12);
    expect(c.tile).toBe(10);
    expect(a.inContest).toBe(false);
    expect(c.inContest).toBe(false);
  });

  it('contest does not lateral the ball', () => {
    const state = match();
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const mate = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 1, tile: 12 });
    const enemy = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    giveBall(state, carrier);
    run(state, 1);
    expect(carrier.holdingBall).toBe(true);
    expect(carrier.tile).toBe(12);
    expect(mate.holdingBall).toBe(false);
    expect(carrier.inContest).toBe(true);
    expect(enemy.inContest).toBe(true);
  });

  it('friendly block refunds the step', () => {
    const state = match();
    parkBall(state);
    addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 11 });
    const rear = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    rear.speed = 1;
    rear.moveAcc = 27;
    run(state, 1);
    expect(rear.tile).toBe(12);
    expect(rear.moveAcc).toBe(30);
  });

  it('blitz does not toss at two tiles', () => {
    const state = match();
    parkBall(state);
    const blitz = addUnit(state, { owner: 'bottom', kind: 'blitz', lane: 2, tile: 12 });
    blitz.tilesSinceDeploy = 2;
    giveBall(state, blitz);
    addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    run(state, 1);
    expect(blitz.holdingBall).toBe(true);
    expect(blitz.tile).toBe(12);
    expect(blitz.inContest).toBe(true);
  });

  it('blitz tosses after more than two tiles', () => {
    const state = match();
    parkBall(state);
    const blitz = addUnit(state, { owner: 'bottom', kind: 'blitz', lane: 2, tile: 12 });
    blitz.tilesSinceDeploy = 3;
    giveBall(state, blitz);
    addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    run(state, 1);
    expect(state.ball.mode).toBe('loose');
    expect(state.ball.tile).toBe(13);
    expect(blitz.holdingBall).toBe(false);
    expect(blitz.tile).toBe(12);
    expect(blitz.inContest).toBe(true);
  });

  it('tripwire snatch', () => {
    const state = match();
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const trip = addUnit(state, { owner: 'top', kind: 'tripwire', lane: 2, tile: 11 });
    carrier.strength = 300;
    trip.strength = 200;
    giveBall(state, carrier);
    run(state, 1);
    expect(state.ball.mode).toBe('loose');
    expect(state.ball.tile).toBe(10);
    expect(carrier.holdingBall).toBe(false);
    expect(carrier.tile).toBe(12);
    expect(trip.tile).toBe(11);
    expect(carrier.inContest).toBe(true);
    expect(trip.inContest).toBe(true);
  });

  it('tripwire strips 100 from a non-carrier', () => {
    const state = match();
    const passer = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const trip = addUnit(state, { owner: 'top', kind: 'tripwire', lane: 2, tile: 11 });
    passer.strength = 300;
    trip.strength = 200;
    run(state, 1);
    expect(passer.strength).toBe(190);
    expect(trip.strength).toBe(190);
    expect(passer.alive).toBe(true);
    expect(trip.alive).toBe(true);
    expect(passer.tile).toBe(12);
    expect(trip.tile).toBe(11);
    expect(passer.inContest).toBe(true);
    expect(trip.inContest).toBe(true);
  });

  it('interceptor steals a pass', () => {
    const state = match();
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 8 });
    const mate = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 3, tile: 8 });
    const interceptor = addUnit(state, { owner: 'top', kind: 'interceptor', lane: 4, tile: 9 });
    giveBall(state, carrier);
    expect(interceptor.inContest).toBe(false);
    expect(transferPass(state, carrier, mate)).toBe('intercepted');
    expect(interceptor.lane).toBe(3);
    expect(interceptor.tile).toBe(9);
    expect(interceptor.holdingBall).toBe(true);
    expect(mate.holdingBall).toBe(false);
  });

  it('bulldozer pushes three tiles', () => {
    const state = match();
    const bull = addUnit(state, { owner: 'bottom', kind: 'bulldozer', lane: 2, tile: 12 });
    const opp = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    bull.strength = 600;
    opp.strength = 250;
    applyBulldozer(state, bull, opp);
    expect(opp.tile).toBe(8);
    expect(bull.tile).toBe(12);
    expect(bull.inContest).toBe(false);
    expect(opp.inContest).toBe(false);
  });

  it('bulldozer burn lasts ten ticks', () => {
    const state = match();
    const bull = addUnit(state, { owner: 'bottom', kind: 'bulldozer', lane: 2, tile: 12 });
    const opp = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    bull.strength = 600;
    opp.strength = 1000;
    opp.burnLeft = 0;
    applyBulldozer(state, bull, opp);
    expect(bull.alive).toBe(false);
    expect(opp.burnLeft).toBe(600);
    applyBurns(state);
    expect(opp.strength).toBe(940);
    expect(opp.burnLeft).toBe(540);
    for (let i = 0; i < 9; i += 1) applyBurns(state);
    expect(opp.strength).toBe(400);
    expect(opp.burnLeft).toBe(0);
    expect(opp.alive).toBe(true);
  });

  it('blocked bulldozer shove burns out', () => {
    const state = match();
    parkBall(state);
    const bull = addUnit(state, { owner: 'bottom', kind: 'bulldozer', lane: 2, tile: 12 });
    const opp = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    const trailer = addUnit(state, { owner: 'top', kind: 'guard', lane: 2, tile: 10 });
    bull.strength = 600;
    bull.moveAcc = 27;
    opp.strength = 200;
    run(state, 1);
    expect(bull.alive).toBe(false);
    expect(opp.tile).toBe(11);
    expect(opp.burnLeft).toBe(540);
    expect(opp.strength).toBe(140);
    expect(trailer.strength).toBe(400);
    expect(trailer.tile).toBe(10);
  });

  it('bline and guard contest and the trailer steps in', () => {
    const state = match();
    parkBall(state);
    const trailer = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 1, tile: 13 });
    const bline = addUnit(state, { owner: 'bottom', kind: 'bline', lane: 1, tile: 12 });
    const guard = addUnit(state, { owner: 'top', kind: 'guard', lane: 1, tile: 11 });
    const rear = addUnit(state, { owner: 'top', kind: 'passer', lane: 1, tile: 10 });
    run(state, 10);
    expect(bline.alive).toBe(false);
    expect(guard.strength).toBe(300);
    expect(guard.tile).toBe(11);
    expect(trailer.strength).toBe(200);
    expect(trailer.tile).toBe(13);
    expect(rear.strength).toBe(200);
    run(state, 1);
    expect(trailer.tile).toBe(12);
    expect(trailer.inContest).toBe(true);
    expect(guard.inContest).toBe(true);
    expect(guard.tile).toBe(11);
    expect(rear.tile).toBe(10);
    expect(rear.strength).toBe(200);
  });

  it('first touchdown keeps troops and respawns the ball', () => {
    const state = match();
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 1 });
    carrier.speed = 1;
    carrier.moveAcc = 27;
    giveBall(state, carrier);
    run(state, 1);
    expect(state.players.bottom.touchdowns).toBe(1);
    expect(state.phase).toBe('playing');
    expect(carrier.alive).toBe(true);
    expect(carrier.holdingBall).toBe(false);
    expect(state.units.some(u => u.id === carrier.id)).toBe(true);
    expect(state.players.bottom.elixir).toBe(10);
    expect(state.players.top.elixir).toBe(10);
    expect(state.ball.mode).toBe('hidden');
    expect(state.kickoffTicks).toBe(10);
    const spawned = applyDeploy(state, { player: 'bottom', handIndex: 0, lane: 0 });
    expect(spawned).toBe(true);
    expect(state.units.find(u => u.lane === 0)?.tile).toBe(20);
    run(state, 9);
    expect(state.ball.mode).toBe('hidden');
    expect(state.kickoffTicks).toBe(1);
    const waiter = addUnit(state, { owner: 'bottom', kind: 'guard', lane: 2, tile: 10 });
    waiter.moveAcc = 0;
    run(state, 1);
    expect(state.ball.mode).toBe('carried');
    expect(state.ball.lane).toBe(2);
    expect(state.ball.tile).toBe(10);
    expect(waiter.holdingBall).toBe(true);
    expect(waiter.tile).toBe(10);
  });

  it('second touchdown ends', () => {
    const state = match();
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 1 });
    carrier.speed = 1;
    carrier.moveAcc = 27;
    giveBall(state, carrier);
    state.players.bottom.touchdowns = 1;
    run(state, 1);
    expect(state.phase).toBe('ended');
    expect(state.winner).toBe('bottom');
    expect(state.endReason).toBe('touchdowns');
  });

  it('tick 1200 draws', () => {
    const state = match();
    state.tickIndex = 1199;
    run(state, 1);
    expect(state.phase).toBe('ended');
    expect(state.winner).toBe('draw');
    expect(state.endReason).toBe('time');
    expect(state.tickIndex).toBe(1200);
  });

  it('sidewinder on L1 shifts to L2', () => {
    const state = match();
    const unit = addUnit(state, { owner: 'bottom', kind: 'sidewinder', lane: 0, tile: 10 });
    unit.momentum = 3;
    applyMomentum(state, unit);
    expect(unit.lane).toBe(1);
  });

  it('pinball flips off L1', () => {
    const state = match();
    const unit = addUnit(state, { owner: 'bottom', kind: 'pinball', lane: 0, tile: 10 });
    unit.pinballHeading = -1;
    unit.momentum = 1;
    applyMomentum(state, unit);
    expect(unit.lane).toBe(1);
    expect(unit.pinballHeading).toBe(1);
  });

  it('passer prefers level over forward', () => {
    const state = match();
    const passer = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 8 });
    const level = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 4, tile: 8 });
    addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 7 });
    expect(findPasserTarget(state, passer)).toBe(level);
  });

  it('sweeper shifts once at midfield', () => {
    const state = match();
    parkBall(state);
    const sweeper = addUnit(state, { owner: 'top', kind: 'sweeper', lane: 0, tile: 10 });
    sweeper.momentum = 3;
    sweeper.speed = 1;
    sweeper.moveAcc = 0;
    sweeper.sweeperShifted = false;
    addUnit(state, { owner: 'bottom', kind: 'passer', lane: 4, tile: 4 });
    addUnit(state, { owner: 'bottom', kind: 'passer', lane: 4, tile: 5 });
    addUnit(state, { owner: 'bottom', kind: 'passer', lane: 4, tile: 6 });
    run(state, 1);
    expect(sweeper.lane).toBe(3);
    expect(sweeper.tile).toBe(10);
    expect(sweeper.sweeperShifted).toBe(true);
    run(state, 1);
    expect(sweeper.lane).toBe(3);
  });

  it('bulldozer ignores a loose ball', () => {
    const state = match();
    const bull = addUnit(state, { owner: 'bottom', kind: 'bulldozer', lane: 2, tile: 10 });
    expect(tryPickup(state, bull)).toBe(false);
    expect(state.ball.mode).toBe('neutral');
  });

  it('elixir regen caps at 10', () => {
    const capped = match();
    capped.players.bottom.elixir = 10;
    capped.players.top.elixir = 10;
    capped.tickIndex = 19;
    run(capped, 1);
    expect(capped.players.bottom.elixir).toBe(10);
    expect(capped.players.top.elixir).toBe(10);

    const fresh = match();
    run(fresh, 20);
    expect(fresh.players.bottom.elixir).toBe(6);
    expect(fresh.players.top.elixir).toBe(6);
  });

  it('edge drain removes a non-carrier on the far goal', () => {
    const state = match();
    const stuck = addUnit(state, { owner: 'top', kind: 'passer', lane: 1, tile: 20 });
    const otherEdge = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 3, tile: 0 });
    const spawned = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 4, tile: 20 });
    run(state, 6);
    expect(stuck.alive).toBe(true);
    expect(stuck.strength).toBe(20);
    expect(stuck.tile).toBe(20);
    expect(otherEdge.alive).toBe(true);
    expect(otherEdge.strength).toBe(20);
    expect(otherEdge.tile).toBe(0);
    expect(spawned.strength).toBe(200);
    run(state, 1);
    expect(stuck.alive).toBe(false);
    expect(otherEdge.alive).toBe(false);
    expect(state.units.some(u => u.id === stuck.id)).toBe(false);
    expect(state.units.some(u => u.id === otherEdge.id)).toBe(false);
    expect(spawned.alive).toBe(true);
    expect(spawned.strength).toBe(200);
  });

  it('ai plays the cheapest leading card at the ball lane', () => {
    const state = match();
    expect(chooseAiCommand(state)).toEqual({ player: 'top', handIndex: 0, lane: 2 });
  });

  it('both sides deploy on their own yard 0', () => {
    const state = match();
    expect(applyDeploy(state, { player: 'bottom', handIndex: 0, lane: 2 })).toBe(true);
    expect(state.units[0].tile).toBe(20);
    expect(state.units[0].lane).toBe(2);
    expect(applyDeploy(state, { player: 'top', handIndex: 0, lane: 1 })).toBe(true);
    expect(state.units[1].tile).toBe(0);
    expect(state.units[1].lane).toBe(1);
  });

  it('pass spends 2 elixir', () => {
    const state = match();
    parkBall(state);
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const mate = addUnit(state, { owner: 'bottom', kind: 'bline', lane: 3, tile: 12 });
    giveBall(state, carrier);
    state.players.bottom.elixir = 1;
    expect(tryPass(state, 'bottom')).toBe(false);
    expect(carrier.holdingBall).toBe(true);
    state.players.bottom.elixir = 5;
    expect(tryPass(state, 'bottom')).toBe(true);
    expect(state.players.bottom.elixir).toBe(3);
    expect(mate.holdingBall).toBe(true);
    expect(carrier.holdingBall).toBe(false);
  });

  it('a shrinking ring drops the tile it is about to lose', () => {
    const state = match();
    parkBall(state);
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const mate = addUnit(state, { owner: 'bottom', kind: 'bline', lane: 2, tile: 10 });
    giveBall(state, carrier);
    carrier.passRadius = 3;
    carrier.strength = 200;
    expect(previewPass(state, 'bottom')?.unitId).toBe(mate.id);
    for (let i = 0; i < 8; i += 1) easePassRadius(carrier);
    expect(carrier.passRadius).toBe(2);
    expect(previewPass(state, 'bottom')).toBeNull();
    expect(tryPass(state, 'bottom')).toBe(false);
    expect(state.players.bottom.elixir).toBe(5);
    expect(carrier.holdingBall).toBe(true);
  });

  it('a north tile enemy takes a straight pass', () => {
    const state = match();
    parkBall(state);
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 12 });
    const mate = addUnit(state, { owner: 'bottom', kind: 'bline', lane: 2, tile: 8 });
    const enemy = addUnit(state, { owner: 'top', kind: 'passer', lane: 2, tile: 11 });
    giveBall(state, carrier);
    carrier.passRadius = 5;
    expect(tryPass(state, 'bottom')).toBe(true);
    expect(state.players.bottom.elixir).toBe(3);
    expect(enemy.holdingBall).toBe(true);
    expect(mate.holdingBall).toBe(false);
    expect(carrier.holdingBall).toBe(false);
    expect(enemy.tile).toBe(11);
  });

  it('a center-lane kick scores', () => {
    const state = match();
    parkBall(state);
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 2, tile: 3 });
    giveBall(state, carrier);
    carrier.strength = 400;
    carrier.passRadius = 4;
    expect(previewPass(state, 'bottom')?.kind).toBe('post');
    expect(tryPass(state, 'bottom')).toBe(true);
    expect(state.players.bottom.touchdowns).toBe(1);
    expect(state.phase).toBe('playing');
    expect(state.ball.mode).toBe('hidden');
    expect(state.kickoffTicks).toBe(10);
    expect(state.players.bottom.elixir).toBe(10);
    expect(carrier.alive).toBe(true);
    expect(carrier.holdingBall).toBe(false);
  });

  it('a side-lane kick does not score', () => {
    const state = match();
    parkBall(state);
    const carrier = addUnit(state, { owner: 'bottom', kind: 'passer', lane: 1, tile: 3 });
    giveBall(state, carrier);
    carrier.strength = 400;
    carrier.passRadius = 4;
    expect(tryPass(state, 'bottom')).toBe(false);
    expect(state.players.bottom.touchdowns).toBe(0);
    expect(state.players.bottom.elixir).toBe(5);
    expect(carrier.holdingBall).toBe(true);
    expect(state.ball.mode).toBe('carried');
  });
});
