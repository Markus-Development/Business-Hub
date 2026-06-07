// Call Notes — taxonomy for the Notion Call Notes DB. Consumed by
// /api/calls/create (called by the external "Call Miner" Cowork skill).
// Values are case-sensitive and must match the Call Notes DB select options
// exactly — Notion silently returns empty results on a mismatch.

export const CALL_TYPES = ["Sales", "Client", "Coaching", "Other"] as const;
export type CallType = (typeof CALL_TYPES)[number];

// Outcomes split by call type. Sales outcomes pair with Call Type "Sales";
// Client outcomes with Call Type "Client"; Coaching outcomes with Call Type
// "Coaching" (enforced in the route). "At Risk" is intentionally shared between
// the Client and Coaching sets — same string, deduped in ALL_OUTCOMES.
export const OUTCOMES_SALES = ["Won", "Lost", "Follow-up", "Disqualified"] as const;
export const OUTCOMES_CLIENT = [
  "Healthy",
  "At Risk",
  "Upsell Opportunity",
  "Issue Raised",
] as const;
export const OUTCOMES_COACHING = [
  "On Track",
  "At Risk",
  "Breakthrough",
  "Action Needed",
] as const;
// Deduped union across all three sets ("At Risk" appears once).
export const ALL_OUTCOMES = [
  ...new Set([...OUTCOMES_SALES, ...OUTCOMES_CLIENT, ...OUTCOMES_COACHING]),
] as const;
export type Outcome =
  | (typeof OUTCOMES_SALES)[number]
  | (typeof OUTCOMES_CLIENT)[number]
  | (typeof OUTCOMES_COACHING)[number];

export const ENGAGEMENT_LEVELS = ["High", "Medium", "Low"] as const;
export type EngagementLevel = (typeof ENGAGEMENT_LEVELS)[number];

export const OBJECTION_TAGS = [
  "Pricing",
  "Timing",
  "Trust",
  "Already has bookkeeper",
  "Software/EasyFinance",
  "Stripe/SEPA resistance",
  "Other",
] as const;
export type ObjectionTag = (typeof OBJECTION_TAGS)[number];
