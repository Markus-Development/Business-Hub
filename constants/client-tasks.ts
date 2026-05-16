export const MONTHLY_TASK_NAMES = [
  "Book a Call",
  "Get Transactions",
  "Prepare Call",
  "Call Done",
] as const;

export type MonthlyTaskName = (typeof MONTHLY_TASK_NAMES)[number];
