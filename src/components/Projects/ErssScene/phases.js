/*
 * The five beats of an ERSS incident, for the card's HTML step rail. Kept apart
 * from the scene code so the rail can use them without loading three.js.
 */
export const PHASES = ["Call", "Match", "Dispatch", "Respond", "Return"];

/** Which beat a time within the cycle belongs to. */
export const phaseAt = (t) => (t < 9.4 ? 0 : t < 14.0 ? 1 : t < 19.0 ? 2 : t < 26.0 ? 3 : 4);
