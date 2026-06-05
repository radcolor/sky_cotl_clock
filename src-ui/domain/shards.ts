import { Temporal } from "@js-temporal/polyfill";
import { skyWallTimeToInstant } from "./skyTime";

export type ShardColor = "black" | "red";

export interface ShardPrediction {
  color: ShardColor;
  realm: string;
  location: string;
  rewardLabel: string;
  gateVisibleAt: Temporal.Instant;
  landsAt: Temporal.Instant;
  clearsAt: Temporal.Instant;
  sourceLabel: "community predicted";
}

type ShardSlot = "1:50" | "2:10" | "7:40" | "2:20" | "3:30";

const SLOT_SEQUENCE: ShardSlot[] = [
  "7:40",
  "2:10",
  "2:20",
  "1:50",
  "3:30",
  "2:10",
  "7:40",
  "1:50",
  "2:20",
  "2:10",
  "3:30",
  "1:50",
];

const SLOT_TIMES: Record<ShardSlot, { hour: number; minute: number }> = {
  "1:50": { hour: 1, minute: 50 },
  "2:10": { hour: 2, minute: 10 },
  "7:40": { hour: 7, minute: 40 },
  "2:20": { hour: 2, minute: 20 },
  "3:30": { hour: 3, minute: 30 },
};

const NO_SHARD_DAYS: Record<ShardSlot, number[]> = {
  "1:50": [6, 0],
  "2:10": [0, 1],
  "7:40": [1, 2],
  "2:20": [2, 3],
  "3:30": [3, 4],
};

const REALMS = ["Prairie", "Forest", "Valley", "Wasteland", "Vault"];

const LOCATIONS: Record<ShardSlot, string[]> = {
  "1:50": [
    "Butterfly Field",
    "Forest Brook",
    "Ice Rink",
    "Broken Temple",
    "Starlight Desert",
  ],
  "2:10": [
    "Village Islands",
    "Boneyard",
    "Ice Rink",
    "Battlefield",
    "Starlight Desert",
  ],
  "7:40": [
    "Cave",
    "Forest Garden",
    "Village of Dreams",
    "Graveyard",
    "Jellyfish Cove",
  ],
  "2:20": [
    "Bird Nest",
    "Treehouse",
    "Village of Dreams",
    "Crabfield",
    "Jellyfish Cove",
  ],
  "3:30": [
    "Sanctuary Island",
    "Elevated Clearing",
    "Hermit Valley",
    "Forgotten Ark",
    "Jellyfish Cove",
  ],
};

export function predictShardForSkyDate(
  date: Temporal.PlainDate,
): ShardPrediction | null {
  const slot = SLOT_SEQUENCE[(date.day - 1) % SLOT_SEQUENCE.length];
  const dayOfWeek = date.dayOfWeek % 7;

  if (NO_SHARD_DAYS[slot].includes(dayOfWeek)) {
    return null;
  }

  const color: ShardColor =
    slot === "1:50" || slot === "2:10" ? "black" : "red";
  const realmIndex = (date.day - 1) % REALMS.length;
  const time = SLOT_TIMES[slot];
  const gateVisibleAt = skyWallTimeToInstant(date, time.hour, time.minute);

  if (!gateVisibleAt) {
    return null;
  }

  return {
    color,
    realm: REALMS[realmIndex],
    location: LOCATIONS[slot][realmIndex],
    rewardLabel:
      color === "red" ? "Ascended Candle light" : "Regular candle light",
    gateVisibleAt,
    landsAt: gateVisibleAt.add({ minutes: 8, seconds: 40 }),
    clearsAt: gateVisibleAt.add({ hours: color === "red" ? 6 : 8 }),
    sourceLabel: "community predicted",
  };
}

export function getShardWindows(
  date: Temporal.PlainDate,
): ShardPrediction[] {
  const first = predictShardForSkyDate(date);

  if (!first) {
    return [];
  }

  return [0, 1, 2].map((index) => {
    const offset = first.color === "red" ? { hours: index * 6 } : { hours: index * 8 };
    const gateVisibleAt = first.gateVisibleAt.add(offset);

    return {
      ...first,
      gateVisibleAt,
      landsAt: gateVisibleAt.add({ minutes: 8, seconds: 40 }),
      clearsAt: gateVisibleAt.add({ hours: first.color === "red" ? 6 : 8 }),
    };
  });
}
