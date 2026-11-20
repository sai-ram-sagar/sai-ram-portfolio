/*
 * The three lifecycle states of the simulated call, for the card's HTML step
 * rail. Kept apart from the scene code so the rail can use them without
 * loading three.js. Boundaries mirror CALL in timeline.js.
 */
export const PHASES = ["Connect", "Live call", "Call ended"];

/** Which state a time within the cycle belongs to. */
export const phaseAt = (t) => (t < 5.4 ? 0 : t < 31.0 ? 1 : 2);
