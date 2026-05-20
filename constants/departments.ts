export const DEPARTMENTS = [
  "Fulfillment",
  "Accounting",
  "Marketing",
  "Sales",
  "Development",
  "Operations",
  "Content",
  "Personal",
] as const;

export type Department = (typeof DEPARTMENTS)[number];
