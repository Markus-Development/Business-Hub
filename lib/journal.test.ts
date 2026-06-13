import { describe, it, expect } from "vitest";
import {
  mapWeek,
  mapErfolg,
  erfolgeForWeek,
  groupErfolgeByWeek,
  isoWeekday,
  mondayOf,
  addDaysIso,
  isoWeekNumber,
  weekRangeLabel,
  computeOverdue,
  normalizeId,
  type Erfolg,
} from "./journal";

// --- raw Notion payload fixtures -------------------------------------------

const weekPage = {
  id: "11111111-1111-1111-1111-111111111111",
  url: "https://notion.so/week",
  created_time: "2026-06-01T00:00:00.000Z",
  properties: {
    Name: { type: "title", title: [{ plain_text: "KW 23 - 01.06.2026 - 07.06.2026" }] },
    "Woche (Start)": { type: "date", date: { start: "2026-06-01" } },
    Status: { type: "select", select: { name: "Abgeschlossen" } },
  },
};

const winPage = {
  id: "22222222-2222-2222-2222-222222222222",
  url: "https://notion.so/win",
  created_time: "2026-06-02T00:00:00.000Z",
  properties: {
    Name: { type: "title", title: [{ plain_text: "Closed Massimo deal" }] },
    Kategorie: { type: "select", select: { name: "Business" } },
    Area: { type: "select", select: { name: "Sales" } },
    Woche: { type: "relation", relation: [{ id: "11111111-1111-1111-1111-111111111111" }] },
    Status: { type: "status", status: { name: "Done" } },
  },
};

describe("mappers", () => {
  it("maps a Weekly-Journal page", () => {
    expect(mapWeek(weekPage)).toEqual({
      id: "11111111-1111-1111-1111-111111111111",
      name: "KW 23 - 01.06.2026 - 07.06.2026",
      weekStart: "2026-06-01",
      status: "Abgeschlossen",
      url: "https://notion.so/week",
    });
  });

  it("maps an Erfolg page incl. the week relation + status property", () => {
    expect(mapErfolg(winPage)).toEqual({
      id: "22222222-2222-2222-2222-222222222222",
      name: "Closed Massimo deal",
      kategorie: "Business",
      area: "Sales",
      weekIds: ["11111111-1111-1111-1111-111111111111"],
      status: "Done",
      url: "https://notion.so/win",
    });
  });

  it("tolerates missing / wrong-typed properties without throwing", () => {
    const bare = { id: "x", properties: {} };
    expect(mapWeek(bare)).toEqual({ id: "x", name: "", weekStart: null, status: null, url: "" });
    expect(mapErfolg(bare)).toEqual({
      id: "x",
      name: "",
      kategorie: null,
      area: null,
      weekIds: [],
      status: null,
      url: "",
    });
  });

  it("strips time from the week-start date", () => {
    const withTime = {
      id: "w",
      properties: { "Woche (Start)": { type: "date", date: { start: "2026-06-01T12:00:00.000+02:00" } } },
    };
    expect(mapWeek(withTime).weekStart).toBe("2026-06-01");
  });
});

describe("win ↔ week assignment", () => {
  const wins: Erfolg[] = [
    { id: "a", name: "A", kategorie: "Business", area: "Sales", weekIds: ["WEEK-1"], status: "Done", url: "" },
    { id: "b", name: "B", kategorie: "Privat", area: "Gym", weekIds: ["WEEK-2"], status: "In progress", url: "" },
    { id: "c", name: "C", kategorie: "Business", area: "Marketing", weekIds: ["WEEK-1", "WEEK-2"], status: "Done", url: "" },
    { id: "d", name: "D", kategorie: "Privat", area: "Dancing", weekIds: [], status: "Not started", url: "" },
  ];

  it("returns only the wins related to a given week", () => {
    expect(erfolgeForWeek(wins, "WEEK-1").map((e) => e.id)).toEqual(["a", "c"]);
    expect(erfolgeForWeek(wins, "WEEK-2").map((e) => e.id)).toEqual(["b", "c"]);
  });

  it("joins regardless of dashes/casing in the relation id", () => {
    expect(erfolgeForWeek(wins, "week1").map((e) => e.id)).toEqual(["a", "c"]);
    expect(normalizeId("AB-CD")).toBe("abcd");
  });

  it("groups wins by week, repeating multi-week wins under each week", () => {
    const grouped = groupErfolgeByWeek(wins);
    expect(grouped["week1"].map((e) => e.id)).toEqual(["a", "c"]);
    expect(grouped["week2"].map((e) => e.id)).toEqual(["b", "c"]);
    // win "d" has no week → appears nowhere
    expect(Object.keys(grouped).sort()).toEqual(["week1", "week2"]);
  });
});

describe("ISO-week helpers", () => {
  it("computes ISO week numbers for known dates", () => {
    expect(isoWeekNumber("2026-06-01")).toBe(23); // matches the example "KW 23"
    expect(isoWeekNumber("2026-06-07")).toBe(23); // Sunday of the same week
    expect(isoWeekNumber("2026-01-01")).toBe(1); // Thu → ISO week 1 of 2026
    expect(isoWeekNumber("2025-12-29")).toBe(1); // Mon → already ISO week 1 of 2026
    expect(isoWeekNumber("2026-12-31")).toBe(53); // Thu → ISO week 53
  });

  it("returns Mon=1 … Sun=7 for isoWeekday", () => {
    expect(isoWeekday("2026-06-01")).toBe(1); // Monday
    expect(isoWeekday("2026-06-03")).toBe(3); // Wednesday
    expect(isoWeekday("2026-06-07")).toBe(7); // Sunday
  });

  it("snaps any day to its ISO-week Monday", () => {
    expect(mondayOf("2026-06-01")).toBe("2026-06-01"); // Monday → itself
    expect(mondayOf("2026-06-03")).toBe("2026-06-01"); // Wednesday
    expect(mondayOf("2026-06-07")).toBe("2026-06-01"); // Sunday
    expect(mondayOf("2026-06-08")).toBe("2026-06-08"); // next Monday
  });

  it("adds days across month boundaries", () => {
    expect(addDaysIso("2026-06-01", 6)).toBe("2026-06-07");
    expect(addDaysIso("2026-05-31", 1)).toBe("2026-06-01");
    expect(addDaysIso("2026-06-01", -1)).toBe("2026-05-31");
  });

  it("formats a human week-range label", () => {
    expect(weekRangeLabel("2026-06-03")).toBe("KW 23 (01.06.2026 – 07.06.2026)");
  });
});

describe("computeOverdue", () => {
  const monday = "2026-06-01";
  const completedWeek = [{ weekStart: monday, status: "Abgeschlossen" }];
  const draftWeek = [{ weekStart: monday, status: "Entwurf" }];

  it("is NOT overdue when the current week is Abgeschlossen — even on Sunday", () => {
    const r = computeOverdue({ weeks: completedWeek, todayIso: "2026-06-07" });
    expect(r.ueberfaellig).toBe(false);
  });

  it("IS overdue when the current week is missing/unfinished and it's Sunday", () => {
    expect(computeOverdue({ weeks: [], todayIso: "2026-06-07" }).ueberfaellig).toBe(true);
    expect(computeOverdue({ weeks: draftWeek, todayIso: "2026-06-07" }).ueberfaellig).toBe(true);
  });

  it("is NOT overdue mid-week (Wednesday) even when the week is unfinished", () => {
    expect(computeOverdue({ weeks: [], todayIso: "2026-06-03" }).ueberfaellig).toBe(false);
    expect(computeOverdue({ weeks: draftWeek, todayIso: "2026-06-03" }).ueberfaellig).toBe(false);
  });

  it("ignores a completed row from a DIFFERENT week", () => {
    const otherWeek = [{ weekStart: "2026-05-25", status: "Abgeschlossen" }];
    expect(computeOverdue({ weeks: otherWeek, todayIso: "2026-06-07" }).ueberfaellig).toBe(true);
  });

  it("respects a custom, earlier threshold weekday", () => {
    // threshold = Wednesday(3): unfinished week on Wed is now overdue
    expect(
      computeOverdue({ weeks: [], todayIso: "2026-06-03", thresholdWeekday: 3 }).ueberfaellig,
    ).toBe(true);
    // …but Tuesday is still fine
    expect(
      computeOverdue({ weeks: [], todayIso: "2026-06-02", thresholdWeekday: 3 }).ueberfaellig,
    ).toBe(false);
  });

  it("reports the current week label as fehlendeKw", () => {
    expect(computeOverdue({ weeks: [], todayIso: "2026-06-03" }).fehlendeKw).toBe(
      "KW 23 (01.06.2026 – 07.06.2026)",
    );
  });
});
