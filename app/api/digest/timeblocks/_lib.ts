// Shared row shape and column list for the time_block_suggestions table.
// Used by the list/POST route plus the per-id confirm and dismiss routes — keeping
// the type and the `.select(...)` column list in lockstep prevents silent drift
// (adding a column means editing one place, not three).

export type SuggestionRow = {
  id: string;
  created_at: string;
  date: string;
  project_name: string;
  start_at: string;
  end_at: string;
  rationale: string;
  status: string;
  google_event_id: string | null;
  batch_id: string;
};

export const ROW_COLS =
  "id, created_at, date, project_name, start_at, end_at, rationale, status, google_event_id, batch_id";
