import type { AppSettings, EventDefinition } from "./types";

function detectLocalTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function isValidTimeZone(timeZone: string | undefined) {
  if (!timeZone) {
    return false;
  }

  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const EVENT_DEFINITIONS: EventDefinition[] = [
  {
    id: "daily-reset",
    title: "Daily Reset",
    category: "reset",
    enabledByDefault: true,
    priority: 20,
    source: "official",
  },
  {
    id: "eden-reset",
    title: "Eden Reset",
    category: "weekly",
    enabledByDefault: true,
    priority: 18,
    source: "wiki",
  },
  {
    id: "geyser",
    title: "Sanctuary Geyser",
    category: "wax",
    location: "Sanctuary Islands",
    enabledByDefault: true,
    priority: 100,
    source: "wiki",
  },
  {
    id: "grandma",
    title: "Grandma Dinner",
    category: "wax",
    location: "Elevated Clearing",
    enabledByDefault: true,
    priority: 95,
    source: "wiki",
  },
  {
    id: "turtle",
    title: "Sunset Turtle",
    category: "wax",
    location: "Sanctuary Islands",
    enabledByDefault: true,
    priority: 90,
    source: "wiki",
  },
  {
    id: "forest-rainbow",
    title: "Forest Rainbow",
    category: "wax",
    location: "Forest Brook",
    enabledByDefault: true,
    priority: 64,
    source: "wiki",
  },
  {
    id: "shard-eruption",
    title: "Shard Eruption",
    category: "shard",
    enabledByDefault: true,
    priority: 85,
    source: "community",
  },
  {
    id: "traveling-spirit",
    title: "Traveling Spirit",
    category: "seasonal",
    enabledByDefault: false,
    priority: 35,
    source: "wiki",
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  appearance: {
    accentColor: "mira",
    fontFamily: "inter",
  },
  overlay: {
    enabled: true,
    position: "top-right",
    opacity: 0.92,
    scale: 1,
    maxEvents: 5,
    clickThrough: true,
  },
  hotkeys: {
    toggleOverlay: "F8",
    showMainWindow: "Shift+F8",
  },
  events: Object.fromEntries(
    EVENT_DEFINITIONS.map((definition) => [
      definition.id,
      definition.enabledByDefault,
    ]),
  ),
  display: {
    timeFormat: "system",
    localTimeZone: detectLocalTimeZone(),
    showSkyTime: true,
    showLocalTime: true,
    warningMinutes: [5, 15, 30],
  },
};

export function mergeSettings(stored: Partial<AppSettings> | null): AppSettings {
  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  const display = { ...DEFAULT_SETTINGS.display, ...stored.display };
  if (!isValidTimeZone(display.localTimeZone)) {
    display.localTimeZone = detectLocalTimeZone();
  }

  return {
    theme: stored.theme ?? DEFAULT_SETTINGS.theme,
    appearance: { ...DEFAULT_SETTINGS.appearance, ...stored.appearance },
    overlay: { ...DEFAULT_SETTINGS.overlay, ...stored.overlay },
    hotkeys: { ...DEFAULT_SETTINGS.hotkeys, ...stored.hotkeys },
    events: { ...DEFAULT_SETTINGS.events, ...stored.events },
    display,
  };
}
