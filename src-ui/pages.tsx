import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { listen } from "@tauri-apps/api/event";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bell,
  BellOff,
  CircleCheck,
  Clock,
  Download,
  Eye,
  Plus,
  RefreshCw,
  Search,
  Star,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EVENT_DEFINITIONS } from "@/domain/settings";
import { ACCENT_OPTIONS, FONT_OPTIONS } from "@/domain/theme";
import {
  createGoal,
  type PlannerGoal,
  type PlannerState,
} from "@/domain/planner";
import {
  formatDuration,
  formatLocalDateTime,
  skyNow,
} from "@/domain/skyTime";
import type { AppSettings, EventInstance } from "@/domain/types";
import type { SkyCalendarEntry, SkyItemSummary } from "@/data/skygame";
import { formatBytes, type AppUpdateState } from "@/tauri/updater";
import { isTauriRuntime } from "@/tauri/overlay";

type SkyDataModule = typeof import("@/data/skygame");

const COMMON_TIME_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Calcutta",
  "Asia/Tokyo",
  "Australia/Sydney",
];

const OVERLAY_POSITION_OPTIONS: Array<{
  value: AppSettings["overlay"]["position"];
  label: string;
}> = [
  { value: "top-right", label: "Top right" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "top-left", label: "Top left" },
  { value: "bottom-left", label: "Bottom left" },
];

function getTimeZoneOptions(selectedTimeZone: string) {
  const intlWithValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const supportedTimeZones =
    intlWithValues.supportedValuesOf?.("timeZone") ?? COMMON_TIME_ZONES;

  return Array.from(
    new Set([selectedTimeZone, ...supportedTimeZones, ...COMMON_TIME_ZONES]),
  ).filter(Boolean);
}

function useSkyData(options: { defer?: boolean } = {}) {
  const [module, setModule] = useState<SkyDataModule | null>(null);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | null = null;

    const load = () => void import("@/data/skygame").then((loaded) => {
      if (mounted) {
        setModule(loaded);
      }
    });

    if (options.defer) {
      timeoutId = window.setTimeout(load, 180);
    } else {
      load();
    }

    return () => {
      mounted = false;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [options.defer]);

  return module;
}

function toDateIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysIso(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2 border-b border-border bg-background/85 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-normal text-foreground">
          {title}
        </h1>
        <p className="max-w-2xl text-xs font-medium text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </header>
  );
}

export function OverviewPage({
  now,
  events,
  settings,
  reminders,
  onToggleOverlay,
  onToggleReminder,
}: {
  now: Date;
  events: EventInstance[];
  settings: AppSettings;
  reminders: Record<string, boolean>;
  onToggleOverlay: () => void;
  onToggleReminder: (event: EventInstance) => void;
}) {
  const skyData = useSkyData({ defer: true });
  const skyClock = skyNow(now);
  const upcoming = events.find((event) => event.status === "upcoming");
  const dailyReset = events.find((event) => event.definitionId === "daily-reset");
  const edenReset = events.find((event) => event.definitionId === "eden-reset");
  const nextSeasonal = useMemo(
    () =>
      skyData
        ? skyData.skyDataIndex.getUpcomingSeasonalEntries(now).slice(0, 4)
        : [],
    [now, skyData],
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="A compact command center for Sky time, timers, and personal goals."
        action={
          <Button type="button" onClick={onToggleOverlay}>
            <Eye className="size-4" />
            Toggle overlay
          </Button>
        }
      />
      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard
              title="Sky Mean Time"
              value={skyClock.toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                timeZoneName: "short",
              })}
              icon={<Clock />}
            />
            <MetricCard
              title="Local Time"
              value={formatLocalDateTime(
                now,
                settings.display.timeFormat,
                settings.display.localTimeZone,
              )}
              icon={<Clock />}
            />
            <MetricCard
              title="Daily Candle Reset"
              value={dailyReset ? formatDuration(dailyReset.countdownMs) : "--"}
              icon={<Clock />}
            />
            <MetricCard
              title="Weekly Eden Reset"
              value={edenReset ? formatDuration(edenReset.countdownMs) : "--"}
              icon={<Clock />}
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Now / Upcoming</CardTitle>
              <CardDescription>Countdowns are local and Sky-time aware.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {events.slice(0, 10).map((event) => (
                <EventRow
                  key={`${event.definitionId}-${event.startsAtUtc}`}
                  event={event}
                  reminderEnabled={Boolean(reminders[eventReminderKey(event)])}
                  onToggleReminder={onToggleReminder}
                />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next Event</CardTitle>
              <CardDescription>
                {upcoming ? upcoming.title : "Nothing upcoming"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {upcoming ? formatDuration(upcoming.countdownMs) : "--"}
              </p>
              {upcoming ? (
                <p className="text-sm text-muted-foreground">
                  {upcoming.localTimeLabel} local / {upcoming.skyTimeLabel}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seasonal Calendar</CardTitle>
              <CardDescription>Upcoming seasonal and event date ranges.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {nextSeasonal.length > 0 ? (
                nextSeasonal.map((entry) => (
                  <CalendarEntryRow key={entry.guid} entry={entry} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loading planner data...
                </p>
              )}
            </CardContent>
          </Card>
          <OverlayPreview events={events} settings={settings} />
        </div>
      </div>
    </>
  );
}

export function CalendarPage({
  selectedDate,
  planner,
}: {
  selectedDate: Date;
  planner: PlannerState;
}) {
  const skyData = useSkyData();
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const startIso = toDateIso(monthStart);
  const endIso = addDaysIso(startIso, 41);
  const filterKinds = useMemo(
    () =>
      [
        planner.calendarFilters.events ? "event" : null,
        planner.calendarFilters.seasons ? "season" : null,
        planner.calendarFilters.travelingSpirits ? "traveling-spirit" : null,
      ].filter(Boolean) as Array<SkyCalendarEntry["kind"]>,
    [
      planner.calendarFilters.events,
      planner.calendarFilters.seasons,
      planner.calendarFilters.travelingSpirits,
    ],
  );
  const entries = useMemo(
    () =>
      skyData
        ? skyData.skyDataIndex.getCalendarEntries({
            startDate: startIso,
            endDate: endIso,
            kinds: filterKinds,
          })
        : [],
    [endIso, filterKinds, skyData, startIso],
  );
  const goals = planner.calendarFilters.goals
    ? planner.goals.filter((goal) => goal.dueDate && goal.dueDate >= startIso && goal.dueDate <= endIso)
    : [];
  const grouped = useMemo(
    () => groupCalendar(entries, goals, startIso, endIso),
    [endIso, entries, goals, startIso],
  );

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Sky event ranges, traveling spirits, seasons, and your goal due dates."
      />
      <div className="grid gap-4 p-5 xl:grid-cols-[1fr_300px]">
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 42 }).map((_, index) => {
            const date = addDaysIso(startIso, index);
            const dayItems = grouped.get(date) ?? [];

            return (
              <div
                key={date}
                className="min-h-28 rounded-md border border-border bg-card/80 p-2.5 shadow-[0_1px_1px_color-mix(in_oklch,var(--foreground)_5%,transparent)] transition-colors hover:bg-muted/25"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">{date}</span>
                  <Badge variant="secondary">{dayItems.length}</Badge>
                </div>
                <div className="grid gap-1">
                  {dayItems.slice(0, 4).map((item) => (
                    <div key={item.id} className="truncate text-xs text-muted-foreground">
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selected Month</CardTitle>
            <CardDescription>{startIso} through {endIso}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {entries.slice(0, 12).map((entry) => (
              <CalendarEntryRow key={entry.guid} entry={entry} />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function GoalsPage({
  planner,
  onPlannerChange,
}: {
  planner: PlannerState;
  onPlannerChange: (planner: PlannerState) => void;
}) {
  const [title, setTitle] = useState("");
  const [currencyNeeded, setCurrencyNeeded] = useState("");
  const [dueDate, setDueDate] = useState("");

  function addGoal() {
    if (!title.trim()) {
      return;
    }

    onPlannerChange({
      ...planner,
      goals: [
        createGoal({
          title,
          currencyNeeded: currencyNeeded ? Number(currencyNeeded) : undefined,
          dueDate: dueDate || undefined,
        }),
        ...planner.goals,
      ],
    });
    setTitle("");
    setCurrencyNeeded("");
    setDueDate("");
  }

  return (
    <>
      <PageHeader
        title="Goals"
        description="Personal planning for candles, cosmetics, and event targets."
      />
      <div className="grid gap-4 p-5 xl:grid-cols-[340px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Goal</CardTitle>
            <CardDescription>Keep this lightweight: target, currency, date.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="goal-title">Title</Label>
              <Input id="goal-title" value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-currency">Currency needed</Label>
              <Input id="goal-currency" inputMode="numeric" value={currencyNeeded} onChange={(event) => setCurrencyNeeded(event.currentTarget.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="goal-date">Due date</Label>
              <Input id="goal-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.currentTarget.value)} />
            </div>
            <Button type="button" onClick={addGoal}>
              <Plus className="size-4" />
              Add goal
            </Button>
          </CardContent>
        </Card>
        <div className="grid gap-3">
          {planner.goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onStatusChange={(status) =>
                onPlannerChange({
                  ...planner,
                  goals: planner.goals.map((candidate) =>
                    candidate.id === goal.id ? { ...candidate, status } : candidate,
                  ),
                })
              }
            />
          ))}
        </div>
      </div>
    </>
  );
}

export function CollectionPage({
  planner,
  onPlannerChange,
}: {
  planner: PlannerState;
  onPlannerChange: (planner: PlannerState) => void;
}) {
  const [query, setQuery] = useState("");
  const skyData = useSkyData();
  const items = useMemo(
    () => (skyData ? skyData.skyDataIndex.searchItems(query) : []),
    [query, skyData],
  );

  return (
    <>
      <PageHeader
        title="Collection"
        description="Searchable wishlist for cosmetics and planner targets."
      />
      <div className="grid gap-4 p-5">
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search items, types, or origins" />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.length > 0 ? (
            items.map((item) => (
              <ItemCard
                key={item.guid}
                item={item}
                wished={planner.wishlist[item.guid] === true}
                onToggleWishlist={() =>
                  onPlannerChange({
                    ...planner,
                    wishlist: {
                      ...planner.wishlist,
                      [item.guid]: planner.wishlist[item.guid] !== true,
                    },
                  })
                }
              />
            ))
          ) : (
            <div className="rounded-md border border-border bg-card/80 p-3 text-sm text-muted-foreground">
              {skyData ? "No items match this search." : "Loading planner data..."}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function OverlaySettingsPage({
  settings,
  events,
  onSettingsChange,
}: {
  settings: AppSettings;
  events: EventInstance[];
  onSettingsChange: (settings: AppSettings) => void;
}) {
  return (
    <>
      <PageHeader
        title="Overlay"
        description="Passive click-through overlay controls for in-game use."
      />
      <div className="grid gap-4 p-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Behavior</CardTitle>
            <CardDescription>Changes sync to the overlay window.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <SettingSwitch
              label="Enable overlay"
              checked={settings.overlay.enabled}
              onCheckedChange={(enabled) =>
                onSettingsChange({ ...settings, overlay: { ...settings.overlay, enabled } })
              }
            />
            <SettingSwitch
              label="Click-through"
              checked={settings.overlay.clickThrough}
              onCheckedChange={(clickThrough) =>
                onSettingsChange({ ...settings, overlay: { ...settings.overlay, clickThrough } })
              }
            />
            <div className="grid gap-2">
              <Label htmlFor="overlay-position">Position</Label>
              <Select
                value={settings.overlay.position}
                onValueChange={(position: AppSettings["overlay"]["position"]) =>
                  onSettingsChange({
                    ...settings,
                    overlay: { ...settings.overlay, position },
                  })
                }
              >
                <SelectTrigger id="overlay-position" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OVERLAY_POSITION_OPTIONS.map((position) => (
                    <SelectItem key={position.value} value={position.value}>
                      {position.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <SliderSetting
              label="Opacity"
              value={settings.overlay.opacity}
              min={0.2}
              max={1}
              step={0.01}
              display={`${Math.round(settings.overlay.opacity * 100)}%`}
              onValueChange={(opacity) =>
                onSettingsChange({ ...settings, overlay: { ...settings.overlay, opacity } })
              }
            />
            <SliderSetting
              label="Scale"
              value={settings.overlay.scale}
              min={0.8}
              max={1.4}
              step={0.05}
              display={`${Math.round(settings.overlay.scale * 100)}%`}
              onValueChange={(scale) =>
                onSettingsChange({ ...settings, overlay: { ...settings.overlay, scale } })
              }
            />
            <SliderSetting
              label="Rows"
              value={settings.overlay.maxEvents}
              min={3}
              max={8}
              step={1}
              display={settings.overlay.maxEvents.toString()}
              onValueChange={(maxEvents) =>
                onSettingsChange({ ...settings, overlay: { ...settings.overlay, maxEvents } })
              }
            />
            <SliderSetting
              label="Corner radius"
              value={settings.overlay.cornerRadius}
              min={0}
              max={32}
              step={1}
              display={`${settings.overlay.cornerRadius}px`}
              onValueChange={(cornerRadius) =>
                onSettingsChange({
                  ...settings,
                  overlay: { ...settings.overlay, cornerRadius },
                })
              }
            />
          </CardContent>
        </Card>
        <OverlayPreview events={events} settings={settings} />
      </div>
    </>
  );
}

export function SettingsPage({
  settings,
  hotkeyError,
  onSettingsChange,
}: {
  settings: AppSettings;
  hotkeyError: string;
  onSettingsChange: (settings: AppSettings) => void;
}) {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Appearance, event filters, hotkeys, and time display preferences."
      />
      <div className="grid gap-4 p-5 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
            <CardDescription>Accent color and interface font.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Accent color</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {ACCENT_OPTIONS.map((accent) => (
                  <Button
                    key={accent.id}
                    type="button"
                    variant={
                      settings.appearance.accentColor === accent.id
                        ? "default"
                        : "secondary"
                    }
                    className="h-10 justify-start gap-2"
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        appearance: {
                          ...settings.appearance,
                          accentColor: accent.id,
                        },
                      })
                    }
                  >
                    <span
                      className="size-4 shrink-0 rounded-full border border-border"
                      style={{ background: accent.swatch }}
                    />
                    {accent.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Font</Label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {FONT_OPTIONS.map((font) => (
                  <Button
                    key={font.id}
                    type="button"
                    variant={
                      settings.appearance.fontFamily === font.id
                        ? "default"
                        : "secondary"
                    }
                    className="h-10 justify-start text-sm"
                    style={{ fontFamily: font.family }}
                    onClick={() =>
                      onSettingsChange({
                        ...settings,
                        appearance: {
                          ...settings.appearance,
                          fontFamily: font.id,
                        },
                      })
                    }
                  >
                    {font.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Filters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {EVENT_DEFINITIONS.map((definition) => (
              <SettingSwitch
                key={definition.id}
                label={definition.title}
                checked={settings.events[definition.id] !== false}
                onCheckedChange={(checked) =>
                  onSettingsChange({
                    ...settings,
                    events: { ...settings.events, [definition.id]: checked },
                  })
                }
              />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hotkeys & Display</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="toggle-hotkey">Toggle overlay</Label>
              <Input
                id="toggle-hotkey"
                value={settings.hotkeys.toggleOverlay}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    hotkeys: { ...settings.hotkeys, toggleOverlay: event.currentTarget.value },
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="main-hotkey">Show main window</Label>
              <Input
                id="main-hotkey"
                value={settings.hotkeys.showMainWindow}
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    hotkeys: { ...settings.hotkeys, showMainWindow: event.currentTarget.value },
                  })
                }
              />
            </div>
            {hotkeyError ? (
              <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {hotkeyError}
              </div>
            ) : null}
            <Separator />
            <SettingSwitch
              label="Show Sky Time"
              checked={settings.display.showSkyTime}
              onCheckedChange={(showSkyTime) =>
                onSettingsChange({ ...settings, display: { ...settings.display, showSkyTime } })
              }
            />
            <SettingSwitch
              label="Show local time"
              checked={settings.display.showLocalTime}
              onCheckedChange={(showLocalTime) =>
                onSettingsChange({ ...settings, display: { ...settings.display, showLocalTime } })
              }
            />
            <div className="grid gap-2">
              <Label htmlFor="local-timezone">Local timezone</Label>
              <Select
                value={settings.display.localTimeZone}
                onValueChange={(localTimeZone) =>
                  onSettingsChange({
                    ...settings,
                    display: { ...settings.display, localTimeZone },
                  })
                }
              >
                <SelectTrigger id="local-timezone" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getTimeZoneOptions(settings.display.localTimeZone).map(
                    (timeZone) => (
                      <SelectItem key={timeZone} value={timeZone}>
                        {timeZone}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function UpdatesPage({
  updateState,
  onRefresh,
  onInstall,
}: {
  updateState: AppUpdateState;
  onRefresh: () => void;
  onInstall: () => void;
}) {
  const checking = updateState.status === "checking";
  const installing =
    updateState.status === "downloading" || updateState.status === "installing";
  const canInstall = updateState.status === "available";
  const progressLabel =
    updateState.contentLength && updateState.downloadedBytes
      ? `${formatBytes(updateState.downloadedBytes)} / ${formatBytes(updateState.contentLength)}`
      : updateState.downloadedBytes
        ? formatBytes(updateState.downloadedBytes)
        : "";
  const changelogTitle =
    updateState.status === "available"
      ? `Changelog for ${updateState.latestVersion}`
      : `Changelog for ${updateState.currentVersion || "current version"}`;
  const changelogEmpty =
    updateState.status === "current"
      ? "No changelog was found for the installed version."
      : "No release notes loaded.";
  const publishedLabel = updateState.releaseDate
    ? new Date(updateState.releaseDate).toLocaleString()
    : "Not available";

  return (
    <>
      <PageHeader
        title="Updates"
        description="Desktop app updates from the GitHub Releases channel."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={checking || installing}
              onClick={onRefresh}
            >
              <RefreshCw className={cn("size-4", checking && "animate-spin")} />
              Check
            </Button>
            <Button
              type="button"
              disabled={!canInstall || installing}
              onClick={onInstall}
            >
              <Download className="size-4" />
              Install update
            </Button>
          </div>
        }
      />
      <div className="grid min-w-0 gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UpdateStatusIcon status={updateState.status} />
              {updateStatusTitle(updateState)}
            </CardTitle>
            <CardDescription className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
              <span>Current {updateState.currentVersion || "unknown"}</span>
              {updateState.latestVersion ? (
                <span>Latest {updateState.latestVersion}</span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {updateState.status === "available" ? (
              <div className="rounded-md border border-primary/25 bg-primary/10 p-3 text-sm text-primary">
                Version {updateState.latestVersion} is ready to download and install.
              </div>
            ) : null}
            {installing || updateState.status === "installed" ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">
                    {updateState.status === "installing"
                      ? "Installing"
                      : updateState.status === "installed"
                        ? "Installed"
                        : "Downloading"}
                  </span>
                  <span className="text-muted-foreground">
                    {progressLabel ||
                      (updateState.progress === null
                        ? "Receiving update"
                        : `${Math.round(updateState.progress * 100)}%`)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    updateState.progress === null
                      ? undefined
                      : Math.round(updateState.progress * 100)
                  }
                  className="h-2 overflow-hidden rounded-sm bg-secondary"
                >
                  <div
                    className={cn(
                      "h-full bg-primary transition-all",
                      updateState.progress === null && "w-1/2 animate-pulse",
                    )}
                    style={{
                      width:
                        updateState.progress === null
                          ? undefined
                          : `${Math.round(updateState.progress * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
            {updateState.error ? (
              <div className="rounded-md border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
                {updateState.error}
              </div>
            ) : null}
            <div className="grid gap-2">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <h2 className="min-w-0 text-sm font-semibold">{changelogTitle}</h2>
                {updateState.status === "current" ? (
                  <Badge variant="secondary" className="rounded-sm">
                    Installed
                  </Badge>
                ) : null}
              </div>
              <div className="theme-scrollbar max-h-[420px] overflow-auto rounded-md border border-border bg-card/70 p-3 text-sm text-muted-foreground">
                {updateState.releaseNotes ? (
                  <MarkdownChangelog content={updateState.releaseNotes} />
                ) : (
                  <p>{changelogEmpty}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Update Details</CardTitle>
            <CardDescription>Simple status for this installed app.</CardDescription>
          </CardHeader>
          <CardContent className="grid min-w-0 gap-3 text-sm text-muted-foreground">
            <InfoRow
              label="Installed version"
              value={updateState.currentVersion || "Checking..."}
            />
            <InfoRow
              label="Newest version"
              value={updateState.latestVersion || updateState.currentVersion || "Checking..."}
            />
            <InfoRow label="Release date" value={publishedLabel} />
            <Separator className="my-1" />
            <div className="rounded-md border border-border/70 bg-muted/20 p-3">
              <h3 className="text-sm font-semibold text-foreground">
                {updateState.status === "available"
                  ? "Ready when you are"
                  : "Nothing to do right now"}
              </h3>
              <p className="mt-1 text-sm leading-5">
                {updateState.status === "available"
                  ? "Download and install the update from this page. The app will guide the process."
                  : "The app checks for updates when it opens. You can also check again manually."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export function Overlay({
  events,
  settings,
  animated = false,
}: {
  events: EventInstance[];
  settings: AppSettings;
  animated?: boolean;
}) {
  const [visible, setVisible] = useState(!animated);
  const visibleEvents = useMemo(
    () => events.slice(0, settings.overlay.maxEvents),
    [events, settings.overlay.maxEvents],
  );
  const transformOrigin = settings.overlay.position.includes("bottom")
    ? settings.overlay.position.includes("left")
      ? "bottom left"
      : "bottom right"
    : settings.overlay.position.includes("left")
      ? "top left"
      : "top right";
  const rowRadius = Math.max(0, Math.min(settings.overlay.cornerRadius - 6, 18));

  useEffect(() => {
    if (!animated) {
      setVisible(true);
      return;
    }

    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [animated]);

  useEffect(() => {
    if (!animated || !isTauriRuntime()) {
      return;
    }

    const unlistenPromise = listen<boolean>(
      "sky-overlay-visibility",
      (event) => setVisible(event.payload),
    );

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  return (
    <section
      data-visible={visible}
      data-animated={animated}
      className="overlay-shell flex max-h-svh w-full max-w-[360px] flex-col overflow-hidden border border-white/10 p-3 text-foreground shadow-lg"
      style={{
        background: `color-mix(in oklch, var(--background) ${Math.round(
          settings.overlay.opacity * 100,
        )}%, transparent)`,
        borderRadius: `${settings.overlay.cornerRadius}px`,
        transform: `scale(${settings.overlay.scale}) translateY(${visible ? 0 : 8}px)`,
        transformOrigin,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            <span className="text-sm font-semibold">Sky Clock</span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {settings.hotkeys.toggleOverlay}
          </Badge>
        </div>
        <div className="theme-scrollbar grid min-h-0 flex-1 gap-2 overflow-y-auto">
          {visibleEvents.map((event) => (
            <div
              key={`${event.definitionId}-${event.startsAtUtc}`}
              className="overlay-event-row grid gap-1 overflow-hidden border border-border/70 bg-card/80 p-2"
              style={{ borderRadius: `${rowRadius}px` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium leading-5">{event.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[event.location, event.phaseLabel].filter(Boolean).join(" - ")}
                  </p>
                </div>
                <StatusBadge status={event.status} />
              </div>
              <div className="flex items-end justify-between gap-2">
                <p className="text-lg font-semibold tabular-nums leading-none">
                  {formatDuration(event.countdownMs)}
                </p>
                <p className="text-right text-[11px] text-muted-foreground">
                  {settings.display.showLocalTime ? event.localTimeLabel : null}
                  {settings.display.showSkyTime ? ` / ${event.skyTimeLabel}` : null}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UpdateStatusIcon({ status }: { status: AppUpdateState["status"] }) {
  if (status === "available" || status === "downloading" || status === "installing") {
    return <Download className="size-4 text-primary" />;
  }

  if (status === "current" || status === "installed") {
    return <CircleCheck className="size-4 text-primary" />;
  }

  if (status === "error" || status === "unsupported") {
    return <TriangleAlert className="size-4 text-destructive" />;
  }

  if (status === "checking") {
    return <RefreshCw className="size-4 animate-spin text-primary" />;
  }

  return <Upload className="size-4 text-muted-foreground" />;
}

function updateStatusTitle(updateState: AppUpdateState) {
  if (updateState.status === "available") {
    return `Update ${updateState.latestVersion} available`;
  }

  const titles: Record<AppUpdateState["status"], string> = {
    idle: "Update check pending",
    checking: "Checking for updates",
    available: "Update available",
    current: "App is up to date",
    downloading: "Downloading update",
    installing: "Installing update",
    installed: "Update installed",
    unsupported: "Updates unavailable",
    error: "Update check failed",
  };

  return titles[updateState.status];
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1 rounded-md border border-border/70 bg-muted/20 p-2.5">
      <span className="text-[0.68rem] font-semibold uppercase tracking-normal text-muted-foreground/70">
        {label}
      </span>
      <span className="min-w-0 break-words text-foreground">{value}</span>
    </div>
  );
}

function MarkdownChangelog({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-3 text-lg font-semibold text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-3 text-sm font-semibold text-foreground">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="my-2 leading-6 text-muted-foreground">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-6">{children}</li>,
        a: ({ children, href }) => (
          <a
            className="break-words font-medium text-primary underline-offset-4 hover:underline"
            href={href}
            rel="noreferrer"
            target="_blank"
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
                {children}
              </code>
            );
          }

          return (
            <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="my-3 overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-2 border-primary/50 pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
        hr: () => <Separator className="my-4" />,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border bg-muted p-2 font-semibold text-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border p-2 align-top">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function OverlayPreview({
  events,
  settings,
}: {
  events: EventInstance[];
  settings: AppSettings;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Overlay Preview</CardTitle>
        <CardDescription>
          {settings.overlay.maxEvents} rows at {Math.round(settings.overlay.opacity * 100)}% opacity,
          {` ${settings.overlay.cornerRadius}px`} radius.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Overlay events={events} settings={settings} />
      </CardContent>
    </Card>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactElement;
}) {
  return (
    <Card>
      <CardContent className="grid min-h-[6.5rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-3.5">
        <p className="min-w-0 text-sm font-semibold leading-snug text-muted-foreground">
          {title}
        </p>
        <div className="row-span-2 flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15 [&_svg]:size-5">
          {icon}
        </div>
        <MetricValue value={value} />
      </CardContent>
    </Card>
  );
}

function MetricValue({ value }: { value: string }) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const timeMatch = normalized.match(/^(.+?)\s+(am|pm)(?:\s+(.+))?$/i);

  if (timeMatch) {
    const [, time, period, zone] = timeMatch;

    return (
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1 text-foreground">
        <span className="text-[1.35rem] font-semibold leading-none tabular-nums">
          {time}
        </span>
        <span className="text-sm font-bold uppercase leading-none tracking-normal">
          {period}
        </span>
        {zone ? (
          <span className="text-sm font-bold uppercase leading-none tracking-normal text-muted-foreground">
            {zone}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <p className="whitespace-nowrap text-[1.35rem] font-semibold leading-none tabular-nums text-foreground">
      {normalized}
    </p>
  );
}

function eventReminderKey(event: EventInstance) {
  return `${event.definitionId}:${event.startsAtUtc}`;
}

function EventRow({
  event,
  reminderEnabled,
  onToggleReminder,
}: {
  event: EventInstance;
  reminderEnabled: boolean;
  onToggleReminder: (event: EventInstance) => void;
}) {
  const ReminderIcon = reminderEnabled ? Bell : BellOff;

  return (
    <div className="grid gap-2 rounded-md border border-border bg-card/70 p-3 transition-colors hover:bg-muted/25 md:grid-cols-[1fr_auto_auto] md:items-center">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{event.title}</p>
          <StatusBadge status={event.status} />
          {event.source === "community" ? <Badge variant="outline">predicted</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {[event.location, event.phaseLabel, event.rewardLabel].filter(Boolean).join(" - ")}
        </p>
      </div>
      <div className="text-left md:text-right">
        <p className="font-semibold tabular-nums">{formatDuration(event.countdownMs)}</p>
        <p className="text-xs text-muted-foreground">
          {event.localTimeLabel} local / {event.skyTimeLabel}
        </p>
      </div>
      <Button
        type="button"
        variant={reminderEnabled ? "secondary" : "ghost"}
        size="icon-sm"
        className="justify-self-start md:justify-self-end"
        aria-pressed={reminderEnabled}
        aria-label={
          reminderEnabled
            ? `Disable reminder for ${event.title}`
            : `Enable reminder for ${event.title}`
        }
        title={reminderEnabled ? "Disable reminder" : "Remind me 10s before"}
        onClick={() => onToggleReminder(event)}
      >
        <ReminderIcon />
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: EventInstance["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 rounded-sm capitalize",
        status === "active" &&
          "border-primary/25 bg-primary/10 text-primary dark:bg-primary/15",
        status === "endingSoon" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
        status === "preparing" &&
          "border-chart-2/25 bg-chart-2/10 text-chart-4 dark:text-chart-2",
        status === "upcoming" &&
          "border-border bg-secondary text-secondary-foreground",
        status === "ended" &&
          "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {status === "endingSoon" ? "ending" : status}
    </Badge>
  );
}

function CalendarEntryRow({ entry }: { entry: SkyCalendarEntry }) {
  return (
    <div className="grid gap-1 rounded-md border border-border bg-card/70 p-2.5 transition-colors hover:bg-muted/25">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium">{entry.name}</p>
        <Badge variant="outline">{entry.kind}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {entry.date} to {entry.endDate}
      </p>
    </div>
  );
}

function GoalRow({
  goal,
  onStatusChange,
}: {
  goal: PlannerGoal;
  onStatusChange: (status: PlannerGoal["status"]) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-border bg-card/80 p-3 shadow-[0_1px_1px_color-mix(in_oklch,var(--foreground)_5%,transparent)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{goal.title}</p>
        <Badge
          variant={goal.status === "done" ? "default" : "secondary"}
          className="rounded-sm"
        >
          {goal.status}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {[goal.currencyNeeded ? `${goal.currencyNeeded} currency` : null, goal.dueDate]
          .filter(Boolean)
          .join(" - ")}
      </p>
      <div className="flex gap-2">
        {(["planned", "active", "done"] as const).map((status) => (
          <Button
            key={status}
            type="button"
            size="xs"
            variant={goal.status === status ? "default" : "secondary"}
            onClick={() => onStatusChange(status)}
          >
            {status}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  wished,
  onToggleWishlist,
}: {
  item: SkyItemSummary;
  wished: boolean;
  onToggleWishlist: () => void;
}) {
  return (
    <div className="grid gap-2.5 rounded-md border border-border bg-card/80 p-3 shadow-[0_1px_1px_color-mix(in_oklch,var(--foreground)_5%,transparent)] transition-colors hover:bg-muted/25">
      <div className="flex items-start gap-3">
        {item.icon ? (
          <img
            src={item.icon}
            alt=""
            className="size-10 shrink-0 rounded-sm bg-muted object-contain ring-1 ring-border"
          />
        ) : (
          <div className="size-10 shrink-0 rounded-sm bg-muted ring-1 ring-border" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">{item.type}</p>
        </div>
        <Button type="button" size="icon-sm" variant={wished ? "default" : "secondary"} onClick={onToggleWishlist}>
          <Star className="size-4" />
        </Button>
      </div>
      <div className="grid gap-1">
        {item.origins.slice(0, 2).map((origin, index) => (
          <p key={`${origin.kind}-${origin.name}-${index}`} className="truncate text-xs text-muted-foreground">
            {origin.kind}: {origin.name}
          </p>
        ))}
      </div>
    </div>
  );
}

function SettingSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label>{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SliderSetting({
  label,
  value,
  min,
  max,
  step,
  display,
  onValueChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onValueChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground">{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onValueChange(next)}
      />
    </div>
  );
}

function groupCalendar(
  entries: SkyCalendarEntry[],
  goals: PlannerGoal[],
  startIso: string,
  endIso: string,
) {
  const grouped = new Map<string, Array<{ id: string; label: string }>>();
  const add = (date: string, item: { id: string; label: string }) => {
    grouped.set(date, [...(grouped.get(date) ?? []), item]);
  };

  for (const entry of entries) {
    const rangeStart = entry.date > startIso ? entry.date : startIso;
    const rangeEnd = entry.endDate < endIso ? entry.endDate : endIso;

    for (let date = rangeStart; date <= rangeEnd; date = addDaysIso(date, 1)) {
      add(date, { id: `${entry.guid}-${date}`, label: entry.name });
    }
  }

  for (const goal of goals) {
    if (goal.dueDate) {
      add(goal.dueDate, { id: goal.id, label: `Goal: ${goal.title}` });
    }
  }

  return grouped;
}
