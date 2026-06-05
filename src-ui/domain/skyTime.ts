import { Temporal } from "@js-temporal/polyfill";

export const SKY_TIME_ZONE = "America/Los_Angeles";

export function instantFromDate(date: Date): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime());
}

export function skyNow(date = new Date()): Temporal.ZonedDateTime {
  return instantFromDate(date).toZonedDateTimeISO(SKY_TIME_ZONE);
}

export function skyWallTimeToInstant(
  date: Temporal.PlainDate,
  hour: number,
  minute: number,
): Temporal.Instant | null {
  try {
    return Temporal.ZonedDateTime.from(
      {
        timeZone: SKY_TIME_ZONE,
        year: date.year,
        month: date.month,
        day: date.day,
        hour,
        minute,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0,
      },
      { disambiguation: "reject" },
    ).toInstant();
  } catch {
    return null;
  }
}

export function formatSkyTime(instant: Temporal.Instant): string {
  return instant
    .toZonedDateTimeISO(SKY_TIME_ZONE)
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
}

export function formatLocalTime(
  instant: Temporal.Instant,
  hourCycle: "system" | "12h" | "24h" = "system",
  timeZone?: string,
): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  };

  if (hourCycle === "12h") {
    options.hour12 = true;
  }

  if (hourCycle === "24h") {
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat(undefined, options).format(
    new Date(instant.epochMilliseconds),
  );
}

export function formatLocalDateTime(
  date: Date,
  hourCycle: "system" | "12h" | "24h" = "system",
  timeZone?: string,
): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone,
    timeZoneName: "short",
  };

  if (hourCycle === "12h") {
    options.hour12 = true;
  }

  if (hourCycle === "24h") {
    options.hour12 = false;
  }

  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  }

  return `${seconds}s`;
}
