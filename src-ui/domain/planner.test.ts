import { describe, expect, test } from "vitest";
import {
  DEFAULT_PLANNER_STATE,
  deserializePlannerState,
  serializePlannerState,
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
});
