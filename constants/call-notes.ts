// Call Notes — taxonomy for the Notion Call Notes DB. Consumed by
// /api/calls/create (called by the external "Call Miner" Cowork skill).
// Values are case-sensitive and must match the Call Notes DB select options
// exactly — Notion silently returns empty results on a mismatch.

export const CALL_TYPES = ["Sales", "Client", "Other"] as const;
export type CallType = (typeof CALL_TYPES)[number];

// Outcomes split by call type. Sales outcomes pair with Call Type "Sales";
// Client outcomes with Call Type "Client" (enforced in the route).
export const OUTCOMES_SALES = ["Won", "Lost", "Follow-up", "Disqualified"] as const;
export const OUTCOMES_CLIENT = [
  "Healthy",
  "At Risk",
  "Upsell Opportunity",
  "Issue Raised",
] as const;
export const ALL_OUTCOMES = [...OUTCOMES_SALES, ...OUTCOMES_CLIENT] as const;
export type Outcome = (typeof ALL_OUTCOMES)[number];

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
