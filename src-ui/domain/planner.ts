import type { SkyRouteFilters } from "@/data/skygame";

export interface PlannerGoal {
  id: string;
  title: string;
  itemGuid?: string;
  currencyNeeded?: number;
  dueDate?: string;
  status: "planned" | "active" | "done";
  notes?: string;
  createdAt: string;
}

export interface ActiveRouteState {
  realmGuid?: string;
  areaGuid?: string;
  targetIndex: number;
  filters: Required<SkyRouteFilters>;
  miniMapExpanded: boolean;
}

export interface RouteProgressState {
  completedTargets: Record<string, boolean>;
  sessionDate: string;
}

export interface CandleRunState {
  activeRunGuid?: string;
  completedGroups: Record<string, boolean>;
  sessionDate: string;
}

export interface PlannerState {
  goals: PlannerGoal[];
  wishlist: Record<string, boolean>;
  completedGoals: Record<string, boolean>;
  activeRoute: ActiveRouteState;
  routeProgress: RouteProgressState;
  candleRun: CandleRunState;
  dailyRouteSessions: Record<string, RouteProgressState>;
  calendarFilters: {
    events: boolean;
    seasons: boolean;
    travelingSpirits: boolean;
    goals: boolean;
  };
}

export const PLANNER_STORAGE_KEY = "sky-cotl-clock-planner-v1";

export const DEFAULT_ROUTE_FILTERS: Required<SkyRouteFilters> = {
  spirits: true,
  wingedLights: true,
};

export const DEFAULT_ACTIVE_ROUTE: ActiveRouteState = {
  targetIndex: 0,
  filters: DEFAULT_ROUTE_FILTERS,
  miniMapExpanded: false,
};

export const DEFAULT_ROUTE_PROGRESS: RouteProgressState = {
  completedTargets: {},
  sessionDate: todayIso(),
};

export const DEFAULT_CANDLE_RUN_STATE: CandleRunState = {
  completedGroups: {},
  sessionDate: todayIso(),
};

export const DEFAULT_PLANNER_STATE: PlannerState = {
  goals: [],
  wishlist: {},
  completedGoals: {},
  activeRoute: DEFAULT_ACTIVE_ROUTE,
  routeProgress: DEFAULT_ROUTE_PROGRESS,
  candleRun: DEFAULT_CANDLE_RUN_STATE,
  dailyRouteSessions: {},
  calendarFilters: {
    events: true,
    seasons: true,
    travelingSpirits: true,
    goals: true,
  },
};

export function mergePlannerState(
  stored: Partial<PlannerState> | null,
): PlannerState {
  if (!stored) {
    return DEFAULT_PLANNER_STATE;
  }

  return {
    goals: stored.goals ?? DEFAULT_PLANNER_STATE.goals,
    wishlist: stored.wishlist ?? DEFAULT_PLANNER_STATE.wishlist,
    completedGoals: stored.completedGoals ?? DEFAULT_PLANNER_STATE.completedGoals,
    activeRoute: mergeActiveRoute(stored.activeRoute),
    routeProgress: mergeRouteProgress(stored.routeProgress),
    candleRun: mergeCandleRun(stored.candleRun),
    dailyRouteSessions: stored.dailyRouteSessions ?? {},
    calendarFilters: {
      ...DEFAULT_PLANNER_STATE.calendarFilters,
      ...stored.calendarFilters,
    },
  };
}

export function serializePlannerState(state: PlannerState): string {
  return JSON.stringify(state);
}

export function deserializePlannerState(value: string | null): PlannerState {
  if (!value) {
    return DEFAULT_PLANNER_STATE;
  }

  try {
    return mergePlannerState(JSON.parse(value) as Partial<PlannerState>);
  } catch {
    return DEFAULT_PLANNER_STATE;
  }
}

export function createGoal(input: {
  title: string;
  itemGuid?: string;
  currencyNeeded?: number;
  dueDate?: string;
  notes?: string;
}): PlannerGoal {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: input.title.trim(),
    itemGuid: input.itemGuid,
    currencyNeeded: input.currencyNeeded,
    dueDate: input.dueDate,
    notes: input.notes,
    status: "planned",
    createdAt: new Date().toISOString(),
  };
}

export function setActiveRoute(
  state: PlannerState,
  input: {
    realmGuid?: string;
    areaGuid?: string;
    filters?: SkyRouteFilters;
    targetIndex?: number;
  },
): PlannerState {
  return {
    ...state,
    activeRoute: {
      ...state.activeRoute,
      realmGuid: input.realmGuid,
      areaGuid: input.areaGuid,
      targetIndex: input.targetIndex ?? 0,
      filters: mergeRouteFilters(input.filters ?? state.activeRoute.filters),
    },
  };
}

export function moveActiveRouteTarget(
  state: PlannerState,
  direction: 1 | -1,
  targetCount: number,
): PlannerState {
  if (targetCount <= 0) {
    return {
      ...state,
      activeRoute: { ...state.activeRoute, targetIndex: 0 },
    };
  }

  const nextIndex =
    (state.activeRoute.targetIndex + direction + targetCount) % targetCount;

  return {
    ...state,
    activeRoute: { ...state.activeRoute, targetIndex: nextIndex },
  };
}

export function toggleRouteTargetComplete(
  state: PlannerState,
  targetGuid: string,
): PlannerState {
  const completedTargets = { ...state.routeProgress.completedTargets };
  if (completedTargets[targetGuid]) {
    delete completedTargets[targetGuid];
  } else {
    completedTargets[targetGuid] = true;
  }

  return {
    ...state,
    routeProgress: {
      ...state.routeProgress,
      sessionDate: todayIso(),
      completedTargets,
    },
  };
}

export function resetCurrentAreaRoute(
  state: PlannerState,
  targetGuids: string[],
): PlannerState {
  const targetSet = new Set(targetGuids);
  const completedTargets = Object.fromEntries(
    Object.entries(state.routeProgress.completedTargets).filter(
      ([targetGuid]) => !targetSet.has(targetGuid),
    ),
  );

  return {
    ...state,
    routeProgress: {
      ...state.routeProgress,
      completedTargets,
      sessionDate: todayIso(),
    },
    activeRoute: { ...state.activeRoute, targetIndex: 0 },
  };
}

export function resetAllRouteProgress(state: PlannerState): PlannerState {
  return {
    ...state,
    routeProgress: {
      completedTargets: {},
      sessionDate: todayIso(),
    },
    activeRoute: { ...state.activeRoute, targetIndex: 0 },
    dailyRouteSessions: {},
  };
}

export function setActiveCandleRun(
  state: PlannerState,
  activeRunGuid: string,
): PlannerState {
  return {
    ...state,
    candleRun: {
      ...state.candleRun,
      activeRunGuid,
      sessionDate: todayIso(),
    },
  };
}

export function toggleCandleGroupComplete(
  state: PlannerState,
  groupKey: string,
): PlannerState {
  const completedGroups = { ...state.candleRun.completedGroups };
  if (completedGroups[groupKey]) {
    delete completedGroups[groupKey];
  } else {
    completedGroups[groupKey] = true;
  }

  return {
    ...state,
    candleRun: {
      ...state.candleRun,
      completedGroups,
      sessionDate: todayIso(),
    },
  };
}

export function resetCandleRunProgress(state: PlannerState): PlannerState {
  return {
    ...state,
    candleRun: {
      ...state.candleRun,
      completedGroups: {},
      sessionDate: todayIso(),
    },
  };
}

export function toggleMiniMapExpanded(state: PlannerState): PlannerState {
  return {
    ...state,
    activeRoute: {
      ...state.activeRoute,
      miniMapExpanded: !state.activeRoute.miniMapExpanded,
    },
  };
}

function mergeActiveRoute(
  stored: Partial<ActiveRouteState> | undefined,
): ActiveRouteState {
  if (!stored) {
    return { ...DEFAULT_ACTIVE_ROUTE, filters: { ...DEFAULT_ROUTE_FILTERS } };
  }

  return {
    realmGuid: stored.realmGuid,
    areaGuid: stored.areaGuid,
    targetIndex:
      typeof stored.targetIndex === "number" && Number.isFinite(stored.targetIndex)
        ? Math.max(0, Math.trunc(stored.targetIndex))
        : 0,
    filters: mergeRouteFilters(stored.filters),
    miniMapExpanded: stored.miniMapExpanded === true,
  };
}

function mergeRouteProgress(
  stored: Partial<RouteProgressState> | undefined,
): RouteProgressState {
  return {
    completedTargets: stored?.completedTargets ?? {},
    sessionDate: stored?.sessionDate ?? todayIso(),
  };
}

function mergeCandleRun(
  stored: Partial<CandleRunState> | undefined,
): CandleRunState {
  return {
    activeRunGuid: stored?.activeRunGuid,
    completedGroups: stored?.completedGroups ?? {},
    sessionDate: stored?.sessionDate ?? todayIso(),
  };
}

function mergeRouteFilters(
  filters: SkyRouteFilters | undefined,
): Required<SkyRouteFilters> {
  return {
    spirits: filters?.spirits !== false,
    wingedLights: filters?.wingedLights !== false,
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
