export type Standing = "none" | "funded" | "ahead" | "on-plan" | "behind";

export type StandingInput = {
  /** What the thing costs. Zero means there is nothing to be funded yet. */
  target: number;
  remaining: number;
  /** Contributed minus what the plan expected by today. */
  diff: number;
};

export type StandingResult = { kind: Standing; amount: number };

const TOLERANCE = 0.5;

/**
 * Where a fund or an item stands. "Funded" needs a target: with nothing to buy
 * there is no target to have reached.
 */
export function standing({
  target,
  remaining,
  diff,
}: StandingInput): StandingResult {
  if (target <= 0) return { kind: "none", amount: 0 };
  if (remaining <= 0) return { kind: "funded", amount: 0 };
  if (diff > TOLERANCE) return { kind: "ahead", amount: diff };
  if (diff < -TOLERANCE) return { kind: "behind", amount: -diff };
  return { kind: "on-plan", amount: 0 };
}

export type CatchUp = {
  /** Extra to set aside on each remaining payday to be back on plan. */
  perPayday: number;
  paydays: number;
  shortfall: number;
};

/**
 * A way back to plan: spread what you are behind over the paydays that are
 * left. Null when you are not behind, or when no payday is left to spread over.
 */
export function catchUp(input: {
  diff: number;
  paydaysLeft: number;
}): CatchUp | null {
  if (input.diff >= -TOLERANCE || input.paydaysLeft <= 0) return null;
  const shortfall = -input.diff;
  return {
    shortfall,
    paydays: input.paydaysLeft,
    perPayday: shortfall / input.paydaysLeft,
  };
}
