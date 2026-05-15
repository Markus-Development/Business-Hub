export const PRIORITIES = ["High", "Medium", "Low"] as const;

export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ["Active", "On Hold", "Done"] as const;

export type Status = (typeof STATUSES)[number];
