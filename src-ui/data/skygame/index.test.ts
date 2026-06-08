import { describe, expect, test } from "vitest";
import { skyDataIndex } from "./index";

describe("SkyDataIndex", () => {
  test("loads bundled data", () => {
    expect(skyDataIndex.getMeta().source).toBe("skygame-data");
    expect(skyDataIndex.getStats().items).toBeGreaterThan(1000);
  });

  test("bundles the expected source groups", () => {
    const stats = skyDataIndex.getSourceStats();

    expect(stats.realms).toBeGreaterThan(0);
    expect(stats.areas).toBeGreaterThan(0);
    expect(stats.wingedLights).toBeGreaterThan(100);
    expect(stats.spirits).toBeGreaterThan(200);
    expect(stats.specialVisits).toBeGreaterThan(0);
    expect(stats.iaps).toBeGreaterThan(100);
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

  test("returns route targets grouped by area", () => {
    const realm = skyDataIndex
      .getRealms()
      .find((candidate) => skyDataIndex.getRealmRoute(candidate.guid)?.counts.total);
    expect(realm).toBeTruthy();

    const area = skyDataIndex
      .getAreasForRealm(realm!.guid)
      .find((candidate) => skyDataIndex.getAreaRoute(candidate.guid)?.counts.total);
    expect(area).toBeTruthy();

    const targets = skyDataIndex.getRouteTargets(area!.guid);
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((target) => target.areaGuid === area!.guid)).toBe(true);
  });

  test("returns mini map pins for route targets with map support", () => {
    const area = skyGameAreaWithPins();
    const pins = skyDataIndex.getMiniMapPins(area.guid);

    expect(pins.length).toBeGreaterThan(0);
    expect(pins.every((pin) => pin.x >= 0 && pin.x <= 100)).toBe(true);
    expect(pins.every((pin) => pin.y >= 0 && pin.y <= 100)).toBe(true);
  });
});

function skyGameAreaWithPins() {
  const area = skyDataIndex
    .getRealms()
    .flatMap((realm) => skyDataIndex.getAreasForRealm(realm.guid))
    .find((candidate) => skyDataIndex.getMiniMapPins(candidate.guid).length > 0);

  expect(area).toBeTruthy();
  return area!;
}
