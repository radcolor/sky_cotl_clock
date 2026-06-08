import { describe, expect, test } from "vitest";
import {
  DEFAULT_PLANNER_STATE,
  deserializePlannerState,
  moveActiveRouteTarget,
  resetAllRouteProgress,
  setActiveRoute,
  serializePlannerState,
  toggleRouteTargetComplete,
} from "./planner";

describe("planner storage", () => {
  test("round-trips planner state", () => {
    const state = {
      ...DEFAULT_PLANNER_STATE,
      goals: [
        {
          id: "goal-1",
          title: "Save candles",
          currencyNeeded: 42,
          status: "active" as const,
          createdAt: "2026-06-04T00:00:00.000Z",
        },
      ],
      wishlist: { item1: true },
    };

    expect(deserializePlannerState(serializePlannerState(state))).toEqual(state);
  });

  test("falls back on invalid data", () => {
    expect(deserializePlannerState("{bad")).toEqual(DEFAULT_PLANNER_STATE);
  });

  test("migrates old planner state without route fields", () => {
    const migrated = deserializePlannerState(
      JSON.stringify({
        goals: [],
        wishlist: { item1: true },
        completedGoals: {},
        calendarFilters: { events: false },
      }),
    );

    expect(migrated.wishlist.item1).toBe(true);
    expect(migrated.calendarFilters.events).toBe(false);
    expect(migrated.activeRoute.targetIndex).toBe(0);
    expect(migrated.activeRoute.filters.spirits).toBe(true);
    expect(migrated.routeProgress.completedTargets).toEqual({});
  });

  test("updates route state and progress", () => {
    const routed = setActiveRoute(DEFAULT_PLANNER_STATE, {
      realmGuid: "realm-1",
      areaGuid: "area-1",
      filters: { spirits: true, wingedLights: false },
    });
    const moved = moveActiveRouteTarget(routed, 1, 3);
    const completed = toggleRouteTargetComplete(moved, "spirit:one");
    const reset = resetAllRouteProgress(completed);

    expect(routed.activeRoute.realmGuid).toBe("realm-1");
    expect(routed.activeRoute.filters.wingedLights).toBe(false);
    expect(moved.activeRoute.targetIndex).toBe(1);
    expect(completed.routeProgress.completedTargets["spirit:one"]).toBe(true);
    expect(reset.routeProgress.completedTargets).toEqual({});
  });
});
