import { describe, expect, test } from "vitest";
import { buildDiscordRpcPresence } from "./discordRpc";
import { DEFAULT_PLANNER_STATE, type PlannerState } from "./planner";
import { DEFAULT_SETTINGS } from "./settings";
import type { AppSettings, EventInstance } from "./types";

const baseSettings: AppSettings = {
  ...DEFAULT_SETTINGS,
  discordRpc: {
    enabled: true,
    clientId: "",
    mode: "auto",
    safePreset: "planning",
    showButtons: true,
    requireSkyDetection: true,
  },
};

const baseEvent: EventInstance = {
  definitionId: "geyser",
  title: "Sanctuary Geyser",
  category: "wax",
  status: "upcoming",
  startsAtUtc: "2026-06-13T12:00:00.000Z",
  endsAtUtc: "2026-06-13T12:10:00.000Z",
  skyTimeLabel: "05:00",
  localTimeLabel: "17:30",
  countdownMs: 60_000,
  phaseLabel: "Wax event",
  location: "Sanctuary Islands",
  source: "wiki",
  priority: 100,
};

function build(input?: {
  settings?: AppSettings;
  events?: EventInstance[];
  planner?: PlannerState;
  skyProcessRunning?: boolean;
}) {
  return buildDiscordRpcPresence({
    settings: input?.settings ?? baseSettings,
    events: input?.events ?? [baseEvent],
    planner: input?.planner ?? DEFAULT_PLANNER_STATE,
    skyProcessRunning: input?.skyProcessRunning ?? true,
    sessionStartedAtMs: 1_765_000_000_000,
  });
}

describe("Discord RPC presence builder", () => {
  test("returns null when disabled or Sky is not detected", () => {
    expect(
      build({
        settings: {
          ...baseSettings,
          discordRpc: { ...baseSettings.discordRpc, enabled: false },
        },
      }),
    ).toBeNull();
    expect(build({ skyProcessRunning: false })).toBeNull();
  });

  test("can publish while Sky is not detected when gate is disabled", () => {
    const presence = build({
      skyProcessRunning: false,
      settings: {
        ...baseSettings,
        discordRpc: {
          ...baseSettings.discordRpc,
          requireSkyDetection: false,
        },
      },
    });

    expect(presence?.details).toBe("Waiting for Sanctuary Geyser");
  });

  test("auto mode prioritizes enabled event timers", () => {
    const presence = build();

    expect(presence?.details).toBe("Waiting for Sanctuary Geyser");
    expect(presence?.state).toContain("Sanctuary Islands");
    expect(presence?.endTimestamp).toBe(1_781_352_000);
  });

  test("manual mode forces safe preset fallback when source has no data", () => {
    const presence = build({
      settings: {
        ...baseSettings,
        discordRpc: {
          ...baseSettings.discordRpc,
          mode: "goals",
          safePreset: "watchingTimers",
        },
      },
      events: [],
    });

    expect(presence?.details).toBe("Watching Sky timers");
  });

  test("does not put free-form goal titles in presence", () => {
    const presence = build({
      settings: {
        ...baseSettings,
        discordRpc: { ...baseSettings.discordRpc, mode: "goals" },
      },
      events: [],
      planner: {
        ...DEFAULT_PLANNER_STATE,
        goals: [
          {
            id: "goal-1",
            title: "totally user typed gibberish",
            status: "active",
            createdAt: "2026-06-13T00:00:00.000Z",
          },
        ],
      },
    });

    expect(JSON.stringify(presence)).not.toContain("gibberish");
    expect(presence?.state).toBe("1 open goals with Isekai");
  });

  test("button setting controls fixed links", () => {
    expect(build()?.buttons).toHaveLength(2);
    expect(
      build({
        settings: {
          ...baseSettings,
          discordRpc: { ...baseSettings.discordRpc, showButtons: false },
        },
      })?.buttons,
    ).toEqual([]);
  });
});
