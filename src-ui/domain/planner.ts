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

export interface PlannerState {
  goals: PlannerGoal[];
  wishlist: Record<string, boolean>;
  completedGoals: Record<string, boolean>;
  calendarFilters: {
    events: boolean;
    seasons: boolean;
    travelingSpirits: boolean;
    goals: boolean;
  };
}

export const PLANNER_STORAGE_KEY = "sky-cotl-clock-planner-v1";

export const DEFAULT_PLANNER_STATE: PlannerState = {
  goals: [],
  wishlist: {},
  completedGoals: {},
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
