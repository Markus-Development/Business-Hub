export const AREAS = [
  "Fulfillment",
  "Accounting",
  "Marketing",
  "Sales",
  "Development",
  "Operations",
  "Content",
  "Personal",
] as const;

export type Area = (typeof AREAS)[number];
