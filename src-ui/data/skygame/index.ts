import rawData from "./selected-data.json";

export type SkyCalendarEntryKind = "event" | "season" | "traveling-spirit";
export type SkyRouteTargetKind = "spirit" | "winged-light";

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

export interface SkySourceStats {
  realms: number;
  areas: number;
  wingedLights: number;
  mapShrines: number;
  constellations: number;
  seasons: number;
  events: number;
  eventInstances: number;
  eventInstanceSpirits: number;
  spirits: number;
  spiritTrees: number;
  spiritTreeTiers: number;
  nodes: number;
  travelingSpirits: number;
  specialVisits: number;
  specialVisitSpirits: number;
  items: number;
  itemLists: number;
  shops: number;
  iaps: number;
  candles: number;
}

export interface SkyRealmSummary {
  guid: string;
  name: string;
  shortName?: string;
  imageUrl?: string;
  hidden?: boolean;
  areaGuids: string[];
  mapPosition?: [number, number];
  wikiUrl?: string;
}

export interface SkyAreaSummary {
  guid: string;
  name: string;
  realmGuid?: string;
  realmName?: string;
  imageUrl?: string;
  imagePosition?: string;
  mapPosition?: [number, number];
  connectionGuids: string[];
  spiritGuids: string[];
  wingedLightGuids: string[];
  mapShrineGuids: string[];
  wikiUrl?: string;
}

export interface SkySpiritSummary {
  guid: string;
  name: string;
  type: string;
  imageUrl?: string;
  areaGuid?: string;
  areaName?: string;
  realmGuid?: string;
  realmName?: string;
  seasonGuid?: string;
  treeGuid?: string;
  wikiUrl?: string;
}

export interface SkyWingedLightSummary {
  guid: string;
  order: number;
  name?: string;
  description?: string;
  areaGuid?: string;
  areaName?: string;
  realmGuid?: string;
  realmName?: string;
  mapPosition?: [number, number];
  videoUrl?: string;
  wikiUrl?: string;
}

export interface SkyRouteCounts {
  spirits: number;
  wingedLights: number;
  total: number;
}

export interface SkyRouteTarget {
  guid: string;
  sourceGuid: string;
  kind: SkyRouteTargetKind;
  name: string;
  description?: string;
  realmGuid: string;
  realmName?: string;
  areaGuid: string;
  areaName?: string;
  imageUrl?: string;
  mapPosition?: [number, number];
  videoUrl?: string;
  order: number;
}

export interface SkyAreaRoute {
  guid: string;
  name: string;
  realmGuid?: string;
  realmName?: string;
  imageUrl?: string;
  mapPosition?: [number, number];
  connectionGuids: string[];
  targetGuids: string[];
  counts: SkyRouteCounts;
}

export interface SkyRealmRoute {
  guid: string;
  name: string;
  shortName?: string;
  imageUrl?: string;
  areaGuids: string[];
  targetGuids: string[];
  counts: SkyRouteCounts;
}

export interface SkyMiniMapPin {
  guid: string;
  targetGuid: string;
  sourceGuid: string;
  kind: SkyRouteTargetKind;
  label: string;
  areaGuid: string;
  realmGuid?: string;
  x: number;
  y: number;
}

export interface SkyRouteFilters {
  spirits?: boolean;
  wingedLights?: boolean;
}

export interface SkyActiveRoute {
  realmGuid?: string;
  areaGuid?: string;
  targetIndex: number;
  filters: Required<SkyRouteFilters>;
}

export interface SkyRouteProgress {
  completedTargets: Record<string, boolean>;
}

export interface SkyDataBundle {
  meta: {
    source: string;
    version: string;
    generatedAt: string;
    license: string;
    sourceUrl: string;
  };
  sourceStats: SkySourceStats;
  sourceGroups: Record<keyof SkySourceStats, unknown[]>;
  calendarEntries: SkyCalendarEntry[];
  items: SkyItemSummary[];
  realms: SkyRealmSummary[];
  areas: SkyAreaSummary[];
  spirits: SkySpiritSummary[];
  wingedLights: SkyWingedLightSummary[];
  routes: {
    realms: SkyRealmRoute[];
    areas: SkyAreaRoute[];
    targets: SkyRouteTarget[];
    pins: SkyMiniMapPin[];
  };
  stats: {
    events: number;
    eventInstances: number;
    seasons: number;
    travelingSpirits: number;
    items: number;
    realms: number;
    areas: number;
    spirits: number;
    wingedLights: number;
    mapShrines: number;
  };
}

export const skyGameData = rawData as SkyDataBundle;

export class SkyDataIndex {
  private itemsByGuid: Map<string, SkyItemSummary>;
  private realmsByGuid: Map<string, SkyRealmSummary>;
  private areasByGuid: Map<string, SkyAreaSummary>;
  private realmRoutesByGuid: Map<string, SkyRealmRoute>;
  private areaRoutesByGuid: Map<string, SkyAreaRoute>;
  private targetsByGuid: Map<string, SkyRouteTarget>;
  private targetsByAreaGuid: Map<string, SkyRouteTarget[]>;
  private pinsByAreaGuid: Map<string, SkyMiniMapPin[]>;

  constructor(private data: SkyDataBundle = skyGameData) {
    this.itemsByGuid = new Map(
      this.data.items.map((item) => [item.guid, item] as const),
    );
    this.realmsByGuid = new Map(
      this.data.realms.map((realm) => [realm.guid, realm] as const),
    );
    this.areasByGuid = new Map(
      this.data.areas.map((area) => [area.guid, area] as const),
    );
    this.realmRoutesByGuid = new Map(
      this.data.routes.realms.map((realm) => [realm.guid, realm] as const),
    );
    this.areaRoutesByGuid = new Map(
      this.data.routes.areas.map((area) => [area.guid, area] as const),
    );
    this.targetsByGuid = new Map(
      this.data.routes.targets.map((target) => [target.guid, target] as const),
    );
    this.targetsByAreaGuid = groupBy(
      this.data.routes.targets,
      (target) => target.areaGuid,
    );
    this.pinsByAreaGuid = groupBy(
      this.data.routes.pins,
      (pin) => pin.areaGuid,
    );
  }

  getMeta() {
    return this.data.meta;
  }

  getStats() {
    return this.data.stats;
  }

  getSourceStats() {
    return this.data.sourceStats;
  }

  getSourceGroups() {
    return this.data.sourceGroups;
  }

  getRealms() {
    return this.data.realms.filter((realm) => !realm.hidden);
  }

  getRealm(guid: string) {
    return this.realmsByGuid.get(guid) ?? null;
  }

  getArea(guid: string) {
    return this.areasByGuid.get(guid) ?? null;
  }

  getAreasForRealm(realmGuid: string) {
    return this.data.areas.filter((area) => area.realmGuid === realmGuid);
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

  getRealmRoute(realmGuid: string) {
    return this.realmRoutesByGuid.get(realmGuid) ?? null;
  }

  getAreaRoute(areaGuid: string) {
    return this.areaRoutesByGuid.get(areaGuid) ?? null;
  }

  getRouteTargets(areaGuid: string, filters: SkyRouteFilters = {}) {
    const normalized = normalizeRouteFilters(filters);
    return (this.targetsByAreaGuid.get(areaGuid) ?? []).filter((target) =>
      isTargetAllowed(target, normalized),
    );
  }

  getRouteTarget(guid: string) {
    return this.targetsByGuid.get(guid) ?? null;
  }

  getMiniMapPins(areaGuid: string, filters: SkyRouteFilters = {}) {
    const normalized = normalizeRouteFilters(filters);
    return (this.pinsByAreaGuid.get(areaGuid) ?? []).filter((pin) =>
      isKindAllowed(pin.kind, normalized),
    );
  }

  getActiveRouteTarget(
    activeRoute: SkyActiveRoute | null | undefined,
    progress: SkyRouteProgress | null | undefined,
  ) {
    if (!activeRoute?.areaGuid) {
      return null;
    }

    const targets = this.getRouteTargets(activeRoute.areaGuid, activeRoute.filters);
    if (targets.length === 0) {
      return null;
    }

    const targetIndex = clampIndex(activeRoute.targetIndex, targets.length);
    const target = targets[targetIndex];

    return {
      target,
      targetIndex,
      targets,
      completed:
        progress?.completedTargets[target.guid] === true ||
        progress?.completedTargets[target.sourceGuid] === true,
      total: targets.length,
      completedCount: targets.filter(
        (candidate) =>
          progress?.completedTargets[candidate.guid] === true ||
          progress?.completedTargets[candidate.sourceGuid] === true,
      ).length,
    };
  }
}

export const skyDataIndex = new SkyDataIndex();

export function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function normalizeRouteFilters(
  filters: SkyRouteFilters | undefined,
): Required<SkyRouteFilters> {
  return {
    spirits: filters?.spirits !== false,
    wingedLights: filters?.wingedLights !== false,
  };
}

function groupBy<T>(
  items: T[],
  getKey: (item: T) => string | undefined,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      continue;
    }

    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return grouped;
}

function isTargetAllowed(
  target: SkyRouteTarget,
  filters: Required<SkyRouteFilters>,
) {
  return isKindAllowed(target.kind, filters);
}

function isKindAllowed(
  kind: SkyRouteTargetKind,
  filters: Required<SkyRouteFilters>,
) {
  if (kind === "spirit") {
    return filters.spirits;
  }

  if (kind === "winged-light") {
    return filters.wingedLights;
  }

  return true;
}

function clampIndex(index: number, length: number) {
  if (length <= 0) {
    return 0;
  }

  if (!Number.isFinite(index)) {
    return 0;
  }

  return Math.max(0, Math.min(length - 1, Math.trunc(index)));
}
