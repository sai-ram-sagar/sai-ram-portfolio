/*
 * The four beats of an ERSS incident, for the card's HTML step rail. Kept apart
 * from the scene code so the rail can use them without loading three.js.
 */
export const PHASES = ["Call", "Locate", "Dispatch", "Respond"];

/** Which beat a time within the cycle belongs to. */
export const phaseAt = (t) => (t < 4.6 ? 0 : t < 8.2 ? 1 : t < 11.4 ? 2 : 3);
