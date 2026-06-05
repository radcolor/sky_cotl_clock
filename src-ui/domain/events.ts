import { Temporal } from "@js-temporal/polyfill";
import { EVENT_DEFINITIONS } from "./settings";
import { getShardWindows } from "./shards";
import {
  formatLocalTime,
  formatSkyTime,
  skyNow,
  skyWallTimeToInstant,
} from "./skyTime";
import type { AppSettings, EventCategory, EventInstance } from "./types";

interface ScheduledEvent {
  definitionId: string;
  title: string;
  category: EventCategory;
  startsAt: Temporal.Instant;
  startsAtMs: number;
  startsAtUtc: string;
  activeAt?: Temporal.Instant;
  activeAtMs: number;
  endsAt?: Temporal.Instant;
  endsAtMs?: number;
  endsAtUtc?: string;
  skyTimeLabel: string;
  phaseLabel?: string;
  activePhaseLabel?: string;
  location?: string;
  rewardLabel?: string;
}

const definitionsById = new Map(
  EVENT_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const scheduleCache = new Map<string, ScheduledEvent[]>();

export function generateEventInstances(
  nowDate: Date,
  settings: AppSettings,
): EventInstance[] {
  const nowMs = nowDate.getTime();
  const skyDate = skyNow(nowDate).toPlainDate();
  const scheduled = getScheduledEvents(skyDate);

  return scheduled
    .filter((event) => settings.events[event.definitionId] !== false)
    .map((event) => toInstance(event, nowMs, settings))
    .filter(
      (event) => event.status !== "ended" || event.countdownMs < 30 * 60_000,
    )
    .sort(sortEvents);
}

export function getOverlayEvents(
  nowDate: Date,
  settings: AppSettings,
): EventInstance[] {
  return generateEventInstances(nowDate, settings).slice(
    0,
    settings.overlay.maxEvents,
  );
}

function getScheduledEvents(skyDate: Temporal.PlainDate): ScheduledEvent[] {
  const cacheKey = skyDate.toString();
  const cached = scheduleCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const scheduled = generateScheduledEvents(skyDate);
  scheduleCache.set(cacheKey, scheduled);

  for (const key of scheduleCache.keys()) {
    if (key !== cacheKey && scheduleCache.size > 3) {
      scheduleCache.delete(key);
    }
  }

  return scheduled;
}

function generateScheduledEvents(skyDate: Temporal.PlainDate): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  const startDate = skyDate.subtract({ days: 1 });

  for (let dayOffset = 0; dayOffset <= 15; dayOffset += 1) {
    const date = startDate.add({ days: dayOffset });

    pushDailyReset(events, date);
    pushWeeklyReset(events, date);
    pushSocialWax(events, date);
    pushForestRainbow(events, date);
    pushShardEvents(events, date);
  }

  return events;
}

function pushDailyReset(events: ScheduledEvent[], date: Temporal.PlainDate) {
  const startsAt = skyWallTimeToInstant(date, 0, 0);

  if (!startsAt) {
    return;
  }

  events.push({
    definitionId: "daily-reset",
    title: "Daily Reset",
    category: "reset",
    ...makeScheduleTimes(startsAt, startsAt, startsAt.add({ minutes: 5 })),
    endsAt: startsAt.add({ minutes: 5 }),
    phaseLabel: "New quests and candles",
  });
}

function pushWeeklyReset(events: ScheduledEvent[], date: Temporal.PlainDate) {
  if (date.dayOfWeek !== 7) {
    return;
  }

  const startsAt = skyWallTimeToInstant(date, 0, 0);

  if (!startsAt) {
    return;
  }

  events.push({
    definitionId: "eden-reset",
    title: "Eden Reset",
    category: "weekly",
    ...makeScheduleTimes(startsAt, startsAt, startsAt.add({ minutes: 5 })),
    endsAt: startsAt.add({ minutes: 5 }),
    phaseLabel: "Statues refresh",
  });
}

function pushSocialWax(events: ScheduledEvent[], date: Temporal.PlainDate) {
  for (let hour = 0; hour < 24; hour += 2) {
    pushWindow(events, {
      definitionId: "geyser",
      title: "Sanctuary Geyser",
      category: "wax",
      date,
      hour,
      minute: 0,
      prepMinutes: 5,
      durationMinutes: 15,
      phaseLabel: "Pollution erupts",
      activePhaseLabel: "Wax window",
      location: "Sanctuary Islands",
    });

    pushWindow(events, {
      definitionId: "grandma",
      title: "Grandma Dinner",
      category: "wax",
      date,
      hour,
      minute: 30,
      prepMinutes: 5,
      durationMinutes: 15,
      phaseLabel: "Table opens",
      activePhaseLabel: "Dinner wax",
      location: "Elevated Clearing",
    });

    pushWindow(events, {
      definitionId: "turtle",
      title: "Sunset Turtle",
      category: "wax",
      date,
      hour,
      minute: 45,
      prepMinutes: 5,
      durationMinutes: 15,
      phaseLabel: "Sunset begins",
      activePhaseLabel: "Turtle wax",
      location: "Sanctuary Islands",
    });
  }
}

function pushForestRainbow(events: ScheduledEvent[], date: Temporal.PlainDate) {
  for (const hour of [5, 17]) {
    pushWindow(events, {
      definitionId: "forest-rainbow",
      title: "Forest Rainbow",
      category: "wax",
      date,
      hour,
      minute: 0,
      prepMinutes: 0,
      durationMinutes: 60,
      phaseLabel: "Rainbow candle",
      activePhaseLabel: "Rainbow candle",
      location: "Forest Brook",
    });
  }
}

function pushShardEvents(events: ScheduledEvent[], date: Temporal.PlainDate) {
  for (const shard of getShardWindows(date)) {
    events.push({
      definitionId: "shard-eruption",
      title: `${shard.color === "red" ? "Red" : "Black"} Shard`,
      category: "shard",
      ...makeScheduleTimes(shard.gateVisibleAt, shard.landsAt, shard.clearsAt),
      phaseLabel: "Visible at gate",
      activePhaseLabel: "Landed",
      location: `${shard.realm} - ${shard.location}`,
      rewardLabel: shard.rewardLabel,
    });
  }
}

function pushWindow(
  events: ScheduledEvent[],
  input: {
    definitionId: string;
    title: string;
    category: EventCategory;
    date: Temporal.PlainDate;
    hour: number;
    minute: number;
    prepMinutes: number;
    durationMinutes: number;
    phaseLabel: string;
    activePhaseLabel: string;
    location?: string;
  },
) {
  const startsAt = skyWallTimeToInstant(input.date, input.hour, input.minute);

  if (!startsAt) {
    return;
  }

  events.push({
    definitionId: input.definitionId,
    title: input.title,
    category: input.category,
    ...makeScheduleTimes(
      startsAt,
      startsAt.add({ minutes: input.prepMinutes }),
      startsAt.add({ minutes: input.durationMinutes }),
    ),
    phaseLabel: input.phaseLabel,
    activePhaseLabel: input.activePhaseLabel,
    location: input.location,
  });
}

function makeScheduleTimes(
  startsAt: Temporal.Instant,
  activeAt: Temporal.Instant,
  endsAt?: Temporal.Instant,
) {
  return {
    startsAt,
    startsAtMs: startsAt.epochMilliseconds,
    startsAtUtc: startsAt.toString(),
    activeAt,
    activeAtMs: activeAt.epochMilliseconds,
    endsAt,
    endsAtMs: endsAt?.epochMilliseconds,
    endsAtUtc: endsAt?.toString(),
    skyTimeLabel: formatSkyTime(startsAt),
  };
}

function toInstance(
  event: ScheduledEvent,
  nowMs: number,
  settings: AppSettings,
): EventInstance {
  const definition = definitionsById.get(event.definitionId);
  const status = getStatus(
    nowMs,
    event.startsAtMs,
    event.activeAtMs,
    event.endsAtMs,
  );
  const target =
    status === "active" || status === "endingSoon" || status === "preparing"
      ? event.endsAtMs ?? event.startsAtMs
      : event.startsAtMs;

  return {
    definitionId: event.definitionId,
    title: event.title,
    category: event.category,
    status,
    startsAtUtc: event.startsAtUtc,
    endsAtUtc: event.endsAtUtc,
    skyTimeLabel: event.skyTimeLabel,
    localTimeLabel: formatLocalTime(
      event.startsAt,
      settings.display.timeFormat,
      settings.display.localTimeZone,
    ),
    countdownMs: Math.abs(target - nowMs),
    phaseLabel:
      status === "active" || status === "endingSoon"
        ? event.activePhaseLabel ?? event.phaseLabel
        : event.phaseLabel,
    location: event.location ?? definition?.location,
    source: definition?.source ?? "wiki",
    priority: definition?.priority ?? 0,
    rewardLabel: event.rewardLabel,
  };
}

function getStatus(
  nowMs: number,
  startsAtMs: number,
  activeAtMs: number,
  endsAtMs?: number,
): EventInstance["status"] {
  if (nowMs < startsAtMs) {
    return "upcoming";
  }

  if (nowMs < activeAtMs) {
    return "preparing";
  }

  if (!endsAtMs) {
    return "ended";
  }

  if (nowMs >= endsAtMs) {
    return "ended";
  }

  const remainingMs = endsAtMs - nowMs;
  return remainingMs <= 5 * 60_000 ? "endingSoon" : "active";
}

function sortEvents(a: EventInstance, b: EventInstance): number {
  const stateScore = (event: EventInstance) => {
    if (event.status === "active" || event.status === "endingSoon") return 0;
    if (event.status === "preparing") return 1;
    if (event.status === "upcoming") return 2;
    return 3;
  };

  const stateDelta = stateScore(a) - stateScore(b);
  if (stateDelta !== 0) {
    return stateDelta;
  }

  if (a.status === "upcoming" && b.status === "upcoming") {
    return a.countdownMs - b.countdownMs;
  }

  const priorityDelta = b.priority - a.priority;
  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return a.countdownMs - b.countdownMs;
}
