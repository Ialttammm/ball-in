// src/sim/deck.ts
// TASK 04 — eight-card queue: validation, hand, preview, and cycling.
// Hand = indices 0..3, preview = index 4. cycleHand mutates in place.

import type { UnitKind } from './types';
import { DECK_SIZE, HAND_SIZE } from './types';
import { ROSTER } from './roster';

/** Validate a deck: length 8, every kind known, no duplicates. */
export function assertDeck(queue: UnitKind[]): void {
  if (queue.length !== DECK_SIZE) throw new Error('deck length');
  const seen = new Set<string>();
  for (const kind of queue) {
    if (ROSTER[kind] === undefined) throw new Error('unknown kind');
    if (seen.has(kind)) throw new Error('duplicate kind');
    seen.add(kind);
  }
}

/** The playable hand: first 4 entries (indices 0..3). */
export function handOf(queue: UnitKind[]): UnitKind[] {
  return queue.slice(0, HAND_SIZE);
}

/** The next-up card, index 4. */
export function previewOf(queue: UnitKind[]): UnitKind {
  return queue[HAND_SIZE];
}

/** Play a card by cycling it to the back (index 7). Mutates in place.
 * Callers must reject handIndex outside 0..3 before calling. No elixir check here. */
export function cycleHand(queue: UnitKind[], handIndex: number): void {
  const card = queue[handIndex];
  queue.splice(handIndex, 1);
  queue.push(card);
}
