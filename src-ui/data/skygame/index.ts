import rawData from "./selected-data.json";

export type SkyCalendarEntryKind = "event" | "season" | "traveling-spirit";

export interface SkyCalendarEntry {
  guid: string;
  kind: SkyCalendarEntryKind;
  name: string;
  shortName?: string;
  date: string;
  endDate: string;
  imageUrl?: string;
  wikiUrl?: string;
  calendarUrl?: string;
  spiritGuid?: string;
}

export interface SkyItemOrigin {
  kind: string;
  name: string;
  date?: string;
  endDate?: string;
}

export interface SkyItemSummary {
  guid: string;
  id?: number;
  name: string;
  type: string;
  icon?: string;
  origins: SkyItemOrigin[];
}

export interface SkyDataBundle {
  meta: {
    source: string;
    version: string;
    generatedAt: string;
    license: string;
    sourceUrl: string;
  };
  calendarEntries: SkyCalendarEntry[];
  items: SkyItemSummary[];
  realms: Array<{ guid: string; name: string; shortName?: string; imageUrl?: string }>;
  areas: Array<{ guid: string; name: string; imageUrl?: string }>;
  stats: {
    events: number;
    eventInstances: number;
    seasons: number;
    travelingSpirits: number;
    items: number;
  };
}

export const skyGameData = rawData as SkyDataBundle;

export class SkyDataIndex {
  private itemsByGuid: Map<string, SkyItemSummary>;

  constructor(private data: SkyDataBundle = skyGameData) {
    this.itemsByGuid = new Map(
      this.data.items.map((item) => [item.guid, item] as const),
    );
  }

  getMeta() {
    return this.data.meta;
  }

  getStats() {
    return this.data.stats;
  }

  getCalendarEntries(range: {
    startDate: string;
    endDate: string;
    kinds?: SkyCalendarEntryKind[];
  }) {
    const allowedKinds = range.kinds ? new Set(range.kinds) : null;

    return this.data.calendarEntries.filter((entry) => {
      if (allowedKinds && !allowedKinds.has(entry.kind)) {
        return false;
      }

      return entry.date <= range.endDate && entry.endDate >= range.startDate;
    });
  }

  searchItems(query: string, filters?: { types?: string[]; wishlist?: Record<string, boolean> }) {
    const normalizedQuery = query.trim().toLowerCase();
    const allowedTypes = filters?.types ? new Set(filters.types) : null;

    return this.data.items
      .filter((item) => {
        if (filters?.wishlist && !filters.wishlist[item.guid]) {
          return false;
        }

        if (allowedTypes && !allowedTypes.has(item.type)) {
          return false;
        }

        return (
          !normalizedQuery ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.type.toLowerCase().includes(normalizedQuery) ||
          item.origins.some((origin) =>
            origin.name.toLowerCase().includes(normalizedQuery),
          )
        );
      })
      .slice(0, 80);
  }

  getItemDetail(guid: string) {
    return this.itemsByGuid.get(guid) ?? null;
  }

  getUpcomingSeasonalEntries(now: Date) {
    const today = now.toISOString().slice(0, 10);
    return this.getCalendarEntries({
      startDate: today,
      endDate: addDaysIso(today, 90),
      kinds: ["event", "season"],
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  getTravelingSpiritEntries(range: { startDate: string; endDate: string }) {
    return this.getCalendarEntries({
      ...range,
      kinds: ["traveling-spirit"],
    });
  }
}

export const skyDataIndex = new SkyDataIndex();

export function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
