import { describe, expect, test } from "vitest";
import { skyDataIndex } from "./index";

describe("SkyDataIndex", () => {
  test("loads bundled data", () => {
    expect(skyDataIndex.getMeta().source).toBe("skygame-data");
    expect(skyDataIndex.getStats().items).toBeGreaterThan(1000);
  });

  test("returns dated calendar entries", () => {
    const entries = skyDataIndex.getCalendarEntries({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });

    expect(entries.every((entry) => entry.date && entry.endDate)).toBe(true);
  });

  test("searches items by name or origin", () => {
    const results = skyDataIndex.searchItems("cape");
    expect(results.length).toBeGreaterThan(0);
  });
});
