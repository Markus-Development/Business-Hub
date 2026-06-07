// Server-side question bank for the Areas Review wizard, keyed by the BASE area
// name (the Notion page name with the " (vN)" version suffix stripped). Every
// area gets the four universal questions plus its own two. Question label text
// lives in constants/translations.ts (DE+EN) — referenced here by key so the
// wizard renders it through the normal `t()` path.

import type { TranslationKey } from "@/constants/translations";

export type ReviewQuestionType = "text" | "textarea" | "status" | "date";

export type ReviewQuestion = {
  // Stable id — used as the answers-map key and threaded into the draft prompt.
  id: string;
  type: ReviewQuestionType;
  labelKey: TranslationKey;
};

// 1. Erledigt, das nicht in der Projektliste steht?
// 2. Status korrekt? (Active / Needs Attention / Paused)
// 3. Milestone erreicht / ändern? (+ Datum)
// 4. Health-Metric Ist-Wert?
export const UNIVERSAL_QUESTIONS: ReviewQuestion[] = [
  { id: "done_extra", type: "textarea", labelKey: "areasReview.q.doneExtra" },
  { id: "status", type: "status", labelKey: "areasReview.q.status" },
  { id: "milestone", type: "text", labelKey: "areasReview.q.milestone" },
  { id: "milestone_due", type: "date", labelKey: "areasReview.q.milestoneDue" },
  { id: "health", type: "text", labelKey: "areasReview.q.health" },
];

// Two individual questions per area. Keys must match the normalised base names
// of the Areas DB pages.
export const AREA_QUESTIONS: Record<string, ReviewQuestion[]> = {
  Content: [
    { id: "content_posts", type: "text", labelKey: "areasReview.q.content.posts" },
    { id: "content_reactivation", type: "text", labelKey: "areasReview.q.content.reactivation" },
  ],
  Marketing: [
    { id: "marketing_profitable", type: "text", labelKey: "areasReview.q.marketing.profitable" },
    { id: "marketing_nextChannel", type: "text", labelKey: "areasReview.q.marketing.nextChannel" },
  ],
  Sales: [
    { id: "sales_callsWon", type: "text", labelKey: "areasReview.q.sales.callsWon" },
    { id: "sales_objection", type: "text", labelKey: "areasReview.q.sales.objection" },
  ],
  Fulfillment: [
    { id: "fulfillment_callsDone", type: "text", labelKey: "areasReview.q.fulfillment.callsDone" },
    { id: "fulfillment_atRisk", type: "text", labelKey: "areasReview.q.fulfillment.atRisk" },
  ],
  Accounting: [
    { id: "accounting_booksCurrent", type: "text", labelKey: "areasReview.q.accounting.booksCurrent" },
    { id: "accounting_ownBooks", type: "text", labelKey: "areasReview.q.accounting.ownBooks" },
  ],
  Operations: [
    { id: "operations_timeSink", type: "text", labelKey: "areasReview.q.operations.timeSink" },
    { id: "operations_sop", type: "text", labelKey: "areasReview.q.operations.sop" },
  ],
  Development: [
    { id: "development_shipped", type: "text", labelKey: "areasReview.q.development.shipped" },
    { id: "development_blocker", type: "text", labelKey: "areasReview.q.development.blocker" },
  ],
  Personal: [
    { id: "personal_energy", type: "textarea", labelKey: "areasReview.q.personal.energy" },
    { id: "personal_goal", type: "text", labelKey: "areasReview.q.personal.goal" },
  ],
};

export function questionsForArea(base: string): ReviewQuestion[] {
  return [...UNIVERSAL_QUESTIONS, ...(AREA_QUESTIONS[base] ?? [])];
}
