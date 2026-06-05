import { describe, expect, test } from "vitest";
import { Temporal } from "@js-temporal/polyfill";
import { DEFAULT_SETTINGS } from "./settings";
import { generateEventInstances } from "./events";
import { predictShardForSkyDate } from "./shards";
import { skyWallTimeToInstant } from "./skyTime";

describe("Sky time conversion", () => {
  test("January daily reset uses PST", () => {
    const instant = skyWallTimeToInstant(
      Temporal.PlainDate.from("2026-01-15"),
      0,
      0,
    );

    expect(instant?.toString()).toBe("2026-01-15T08:00:00Z");
  });

  test("July daily reset uses PDT", () => {
    const instant = skyWallTimeToInstant(
      Temporal.PlainDate.from("2026-07-15"),
      0,
      0,
    );

    expect(instant?.toString()).toBe("2026-07-15T07:00:00Z");
  });

  test("spring-forward nonexistent Sky local times are skipped", () => {
    const instant = skyWallTimeToInstant(
      Temporal.PlainDate.from("2026-03-08"),
      2,
      0,
    );

    expect(instant).toBeNull();
  });
});

describe("event generation", () => {
  test("geyser is every even Sky hour with a 15-minute duration", () => {
    const events = generateEventInstances(
      new Date("2026-01-15T08:00:00Z"),
      DEFAULT_SETTINGS,
    );
    const geyser = events.find(
      (event) =>
        event.definitionId === "geyser" &&
        event.startsAtUtc === "2026-01-15T08:00:00Z",
    );

    expect(geyser?.endsAtUtc).toBe("2026-01-15T08:15:00Z");
  });

  test("grandma runs from :30 to :45", () => {
    const events = generateEventInstances(
      new Date("2026-01-15T08:00:00Z"),
      DEFAULT_SETTINGS,
    );
    const grandma = events.find(
      (event) =>
        event.definitionId === "grandma" &&
        event.startsAtUtc === "2026-01-15T08:30:00Z",
    );

    expect(grandma?.endsAtUtc).toBe("2026-01-15T08:45:00Z");
  });

  test("turtle pre-event starts at :45 and active window ends at the hour", () => {
    const events = generateEventInstances(
      new Date("2026-01-15T08:00:00Z"),
      DEFAULT_SETTINGS,
    );
    const turtle = events.find(
      (event) =>
        event.definitionId === "turtle" &&
        event.startsAtUtc === "2026-01-15T08:45:00Z",
    );

    expect(turtle?.endsAtUtc).toBe("2026-01-15T09:00:00Z");
  });

  test("weekly reset is generated on Sunday Sky Time", () => {
    const events = generateEventInstances(
      new Date("2026-01-18T08:00:00Z"),
      DEFAULT_SETTINGS,
    );

    expect(
      events.some(
        (event) =>
          event.definitionId === "eden-reset" &&
          event.startsAtUtc === "2026-01-18T08:00:00Z",
      ),
    ).toBe(true);
  });

  test("DST fall-back does not duplicate even-hour geyser events", () => {
    const events = generateEventInstances(
      new Date("2026-11-01T07:00:00Z"),
      DEFAULT_SETTINGS,
    );
    const starts = events
      .filter(
        (event) =>
          event.definitionId === "geyser" &&
          event.startsAtUtc.startsWith("2026-11-01"),
      )
      .map((event) => event.startsAtUtc);

    expect(new Set(starts).size).toBe(starts.length);
  });
});

describe("shard prediction", () => {
  test("fixtures a red shard date", () => {
    const shard = predictShardForSkyDate(Temporal.PlainDate.from("2026-04-01"));

    expect(shard?.color).toBe("red");
    expect(shard?.location).toBe("Cave");
    expect(shard?.rewardLabel).toBe("Ascended Candle light");
  });

  test("fixtures a no-shard day", () => {
    const shard = predictShardForSkyDate(Temporal.PlainDate.from("2026-04-26"));

    expect(shard).toBeNull();
  });
});
