import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, PanelLeft, Square, X } from "lucide-react";
import { toast } from "sonner";
import "./App.css";
import { AppSidebar, type AppPage } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_SETTINGS, mergeSettings } from "@/domain/settings";
import { generateEventInstances } from "@/domain/events";
import {
  deserializePlannerState,
  PLANNER_STORAGE_KEY,
  serializePlannerState,
  type PlannerState,
} from "@/domain/planner";
import { applyAppearance } from "@/domain/theme";
import type { AppSettings, EventInstance } from "@/domain/types";
import {
  configureOverlayWindow,
  getWindowLabel,
  isTauriRuntime,
  registerAppHotkeys,
  toggleOverlay,
} from "@/tauri/overlay";
import {
  CalendarPage,
  CollectionPage,
  GoalsPage,
  Overlay,
  OverlaySettingsPage,
  OverviewPage,
  PageHeader,
  SettingsPage,
  UpdatesPage,
} from "@/pages";
import {
  checkForAppUpdate,
  initialUpdateState,
  installAppUpdate,
  type AppUpdateState,
  type UpdateStatePatch,
} from "@/tauri/updater";
import { listenNativeThemeChange, syncNativeTheme } from "@/tauri/theme";

const SETTINGS_KEY = "sky-cotl-clock-settings";
const REMINDERS_KEY = "sky-cotl-clock-reminders";
const REMINDER_LEAD_MS = 10_000;
const REMINDER_TRIGGER_WINDOW_MS = 1_500;

function readStoredSettings() {
  try {
    return mergeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readStoredPlanner() {
  return deserializePlannerState(localStorage.getItem(PLANNER_STORAGE_KEY));
}

function readStoredReminders() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(([, enabled]) => enabled === true),
    ) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function eventReminderKey(event: EventInstance) {
  return `${event.definitionId}:${event.startsAtUtc}`;
}

function reminderBody(event: EventInstance) {
  return [event.location, event.phaseLabel, `${event.localTimeLabel} local`]
    .filter(Boolean)
    .join(" - ");
}

function playReminderSound() {
  const AudioContextCtor = window.AudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.34);
  window.setTimeout(() => void context.close(), 450);
}

async function ensureNotificationPermission() {
  if (!isTauriRuntime()) {
    return false;
  }

  let granted = await isPermissionGranted();
  if (!granted) {
    granted = (await requestPermission()) === "granted";
  }

  return granted;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  );
}

function isBlockedProductionShortcut(event: KeyboardEvent) {
  const key = event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;

  return (
    event.key === "F5" ||
    event.key === "F12" ||
    (modifier && key === "r") ||
    (modifier && key === "u") ||
    (modifier && event.shiftKey && ["c", "i", "j"].includes(key))
  );
}

function App() {
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings);
  const [planner, setPlanner] = useState<PlannerState>(readStoredPlanner);
  const [reminders, setReminders] =
    useState<Record<string, boolean>>(readStoredReminders);
  const [activePage, setActivePage] = useState<AppPage>("overview");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [windowLabel, setWindowLabel] = useState<string | null>(null);
  const [hotkeyError, setHotkeyError] = useState("");
  const [updateState, setUpdateState] = useState<AppUpdateState>(initialUpdateState);
  const pendingUpdate = useRef<Update | null>(null);
  const enabledEventsKey = useMemo(
    () => JSON.stringify(settings.events),
    [settings.events],
  );

  useEffect(() => {
    void getWindowLabel().then((label) => {
      document.body.dataset.windowLabel = label;
      setWindowLabel(label);
    });
  }, []);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }

    document.documentElement.dataset.appHardened = "true";

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    const preventDrag = (event: DragEvent) => {
      event.preventDefault();
    };
    const preventSelection = (event: Event) => {
      if (!isEditableTarget(event.target)) {
        event.preventDefault();
      }
    };
    const preventShortcuts = (event: KeyboardEvent) => {
      if (isBlockedProductionShortcut(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("dragstart", preventDrag);
    window.addEventListener("selectstart", preventSelection);
    window.addEventListener("keydown", preventShortcuts, true);

    return () => {
      delete document.documentElement.dataset.appHardened;
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("dragstart", preventDrag);
      window.removeEventListener("selectstart", preventSelection);
      window.removeEventListener("keydown", preventShortcuts, true);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyTheme = async () => {
      const nativeTheme = await syncNativeTheme(settings.theme);
      if (!cancelled) {
        applyAppearance(settings, nativeTheme ?? undefined);
      }
    };

    void applyTheme();

    return () => {
      cancelled = true;
    };
  }, [
    settings.appearance.accentColor,
    settings.appearance.fontFamily,
    settings.theme,
  ]);

  useEffect(() => {
    if (settings.theme !== "system") {
      return;
    }

    const unlistenPromise = listenNativeThemeChange((nativeTheme) => {
      applyAppearance(settings, nativeTheme);
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [
    settings.appearance.accentColor,
    settings.appearance.fontFamily,
    settings.theme,
  ]);

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("sky-settings-changed"));
    if (isTauriRuntime()) {
      void emit("sky-settings-changed", settings);
    }
  }, [settings, windowLabel]);

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    localStorage.setItem(PLANNER_STORAGE_KEY, serializePlannerState(planner));
  }, [planner, windowLabel]);

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
  }, [reminders, windowLabel]);

  useEffect(() => {
    void configureOverlayWindow(settings);
  }, [settings]);

  useEffect(() => {
    if (windowLabel !== "overlay") {
      return;
    }

    const syncSettings = () => setSettings(readStoredSettings());
    const unlistenPromise = isTauriRuntime()
      ? listen<AppSettings>("sky-settings-changed", (event) =>
          setSettings(mergeSettings(event.payload)),
        )
      : Promise.resolve(() => undefined);

    window.addEventListener("storage", syncSettings);
    window.addEventListener("sky-settings-changed", syncSettings);

    return () => {
      window.removeEventListener("storage", syncSettings);
      window.removeEventListener("sky-settings-changed", syncSettings);
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, [windowLabel]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    void registerAppHotkeys(settings, setHotkeyError);
  }, [
    settings.hotkeys.showMainWindow,
    settings.hotkeys.toggleOverlay,
    settings.overlay.enabled,
    windowLabel,
  ]);

  const patchUpdateState = (patch: UpdateStatePatch) =>
    setUpdateState((current) => ({ ...current, ...patch }));

  const refreshUpdate = async () => {
    pendingUpdate.current = await checkForAppUpdate(patchUpdateState);
  };

  const installUpdate = async () => {
    if (!pendingUpdate.current) {
      pendingUpdate.current = await checkForAppUpdate(patchUpdateState);
    }

    if (pendingUpdate.current) {
      await installAppUpdate(pendingUpdate.current, patchUpdateState);
    }
  };

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    void refreshUpdate();
  }, [windowLabel]);

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    const smoothWheelState = new WeakMap<
      Element,
      { animationFrame: number; targetTop: number }
    >();
    const timers = new WeakMap<Element, number>();
    const scrollListeners = new WeakMap<Element, EventListener>();
    const wheelListeners = new WeakMap<Element, EventListener>();
    const watched = new Set<Element>();

    const markScrolling = (element: Element) => {
      if (element.getAttribute("data-scrolling") !== "true") {
        element.setAttribute("data-scrolling", "true");
      }

      const existingTimer = timers.get(element);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      timers.set(
        element,
        window.setTimeout(() => {
          element.removeAttribute("data-scrolling");
          timers.delete(element);
        }, 700),
      );
    };

    const smoothWheel = (element: Element, event: WheelEvent) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      const isLikelyTrackpad =
        event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && Math.abs(event.deltaY) < 40;

      if (isLikelyTrackpad || !event.deltaY) {
        return;
      }

      event.preventDefault();
      markScrolling(element);

      const multiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 36
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? element.clientHeight
            : 1;
      const delta = event.deltaY * multiplier;
      const maxTop = element.scrollHeight - element.clientHeight;
      const state =
        smoothWheelState.get(element) ??
        { animationFrame: 0, targetTop: element.scrollTop };

      state.targetTop = Math.max(0, Math.min(maxTop, state.targetTop + delta));

      if (state.animationFrame) {
        smoothWheelState.set(element, state);
        return;
      }

      const glide = () => {
        const distance = state.targetTop - element.scrollTop;

        if (Math.abs(distance) < 0.5) {
          element.scrollTop = state.targetTop;
          state.animationFrame = 0;
          smoothWheelState.delete(element);
          return;
        }

        element.scrollTop += distance * 0.18;
        state.animationFrame = window.requestAnimationFrame(glide);
        smoothWheelState.set(element, state);
      };

      state.animationFrame = window.requestAnimationFrame(glide);
      smoothWheelState.set(element, state);
    };

    const bindScrollbars = () => {
      document.querySelectorAll(".theme-scrollbar").forEach((element) => {
        if (watched.has(element)) {
          return;
        }

        watched.add(element);
        const scrollListener = () => markScrolling(element);
        const wheelListener = ((event: WheelEvent) =>
          smoothWheel(element, event)) as EventListener;

        scrollListeners.set(element, scrollListener);
        wheelListeners.set(element, wheelListener);
        element.addEventListener("scroll", scrollListener, {
          passive: true,
        });
        element.addEventListener("wheel", wheelListener, {
          passive: false,
        });
      });
    };

    bindScrollbars();

    const observer = new MutationObserver(bindScrollbars);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      watched.forEach((element) => {
        const timer = timers.get(element);
        if (timer) {
          window.clearTimeout(timer);
        }

        element.removeAttribute("data-scrolling");
        const smoothState = smoothWheelState.get(element);
        if (smoothState?.animationFrame) {
          window.cancelAnimationFrame(smoothState.animationFrame);
        }

        const scrollListener = scrollListeners.get(element);
        if (scrollListener) {
          element.removeEventListener("scroll", scrollListener);
        }

        const wheelListener = wheelListeners.get(element);
        if (wheelListener) {
          element.removeEventListener("wheel", wheelListener);
        }
      });
    };
  }, [windowLabel]);

  const events = useMemo(
    () => generateEventInstances(now, settings),
    [
      now,
      settings.display.localTimeZone,
      settings.display.timeFormat,
      enabledEventsKey,
    ],
  );
  const overlayEvents = useMemo(
    () => events.slice(0, settings.overlay.maxEvents),
    [events, settings.overlay.maxEvents],
  );
  const firedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (windowLabel !== "main") {
      return;
    }

    const activeKeys = new Set(events.map(eventReminderKey));
    firedReminders.current.forEach((key) => {
      if (!activeKeys.has(key)) {
        firedReminders.current.delete(key);
      }
    });

    const dueEvents = events.filter((event) => {
      const key = eventReminderKey(event);
      return (
        reminders[key] &&
        !firedReminders.current.has(key) &&
        event.status === "upcoming" &&
        event.countdownMs <= REMINDER_LEAD_MS &&
        event.countdownMs > REMINDER_LEAD_MS - REMINDER_TRIGGER_WINDOW_MS
      );
    });

    dueEvents.forEach((event) => {
      const key = eventReminderKey(event);
      firedReminders.current.add(key);
      void deliverReminder(event);
    });
  }, [events, reminders, windowLabel]);

  const toggleReminder = async (event: EventInstance) => {
    const key = eventReminderKey(event);
    const enabled = !reminders[key];

    if (enabled && isTauriRuntime()) {
      void ensureNotificationPermission();
    }

    setReminders((current) => {
      const next = { ...current };
      if (enabled) {
        next[key] = true;
        firedReminders.current.delete(key);
      } else {
        delete next[key];
        firedReminders.current.delete(key);
      }

      return next;
    });

    toast(enabled ? "Reminder enabled" : "Reminder disabled", {
      description: `${event.title} - ${event.localTimeLabel} local`,
    });
  };

  const deliverReminder = async (event: EventInstance) => {
    const title = `${event.title} starts in 10 seconds`;
    const body = reminderBody(event);

    if (isTauriRuntime()) {
      const current = getCurrentWindow();
      const [visible, minimized] = await Promise.all([
        current.isVisible(),
        current.isMinimized(),
      ]);

      if (!visible || minimized) {
        if (await ensureNotificationPermission()) {
          sendNotification({ title, body });
        }
        return;
      }
    }

    playReminderSound();
    toast(title, { description: body });
  };

  if (!windowLabel) {
    return null;
  }

  if (windowLabel === "overlay") {
    return <Overlay events={overlayEvents} settings={settings} animated />;
  }

  return (
    <TooltipProvider>
      <div className="app-main-shell flex h-svh min-h-0 flex-col overflow-hidden">
        <SidebarProvider className="min-h-0 flex-1 flex-col">
          <AppTitlebar activePage={activePage} />
          <div className="app-workspace flex min-h-0 flex-1">
            <AppSidebar
              activePage={activePage}
              selectedDate={selectedDate}
              settings={settings}
              planner={planner}
              updateState={updateState}
              onPageChange={setActivePage}
              onSelectedDateChange={setSelectedDate}
              onThemeChange={(theme) => setSettings({ ...settings, theme })}
            />
            <SidebarInset className="flex h-full min-h-0 overflow-hidden">
              <div className="theme-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                <PageContent
                  activePage={activePage}
                  now={now}
                  selectedDate={selectedDate}
                  events={events}
                  planner={planner}
                  settings={settings}
                  hotkeyError={hotkeyError}
                  updateState={updateState}
                  reminders={reminders}
                  onPlannerChange={setPlanner}
                  onSettingsChange={setSettings}
                  onToggleOverlay={() => void toggleOverlay(settings)}
                  onToggleReminder={(event) => void toggleReminder(event)}
                  onRefreshUpdate={() => void refreshUpdate()}
                  onInstallUpdate={() => void installUpdate()}
                />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

function AppTitlebar({ activePage }: { activePage: AppPage }) {
  const { toggleSidebar } = useSidebar();
  const safeWindowAction = (
    action: (windowControls: ReturnType<typeof getCurrentWindow>) => Promise<void>,
  ) => {
    if (!isTauriRuntime()) {
      return;
    }

    void action(getCurrentWindow());
  };

  return (
    <div className="app-titlebar relative z-50 flex h-8 shrink-0 select-none items-center border-b border-border/80 bg-sidebar/95 text-sidebar-foreground">
      <div
        data-tauri-drag-region
        className="app-titlebar-drag flex h-full min-w-0 flex-1 items-center gap-2 pl-2"
      >
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          className="app-titlebar-sidebar-toggle flex size-8 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={toggleSidebar}
        >
          <PanelLeft className="size-4" />
        </button>
        <div
          data-tauri-drag-region
          className="mx-1 h-4 w-px bg-sidebar-border"
        />
        <span
          data-tauri-drag-region
          className="truncate text-xs font-semibold"
        >
          Isekai
        </span>
        <div
          data-tauri-drag-region
          className="mx-1 hidden h-4 w-px bg-sidebar-border sm:block"
        />
        <span
          data-tauri-drag-region
          className="hidden truncate text-xs font-medium text-muted-foreground sm:block"
        >
          {pageTitle(activePage)}
        </span>
        <div
          data-tauri-drag-region
          className="min-w-0 flex-1 self-stretch"
        />
      </div>
      <div className="flex h-full shrink-0 items-center">
        <TitlebarWindowButton
          label="Minimize"
          onClick={() =>
            safeWindowAction((windowControls) => windowControls.minimize())
          }
        >
          <Minus />
        </TitlebarWindowButton>
        <TitlebarWindowButton
          label="Maximize"
          onClick={() =>
            safeWindowAction((windowControls) => windowControls.toggleMaximize())
          }
        >
          <Square />
        </TitlebarWindowButton>
        <TitlebarWindowButton
          label="Close"
          danger
          onClick={() =>
            safeWindowAction((windowControls) => windowControls.close())
          }
        >
          <X />
        </TitlebarWindowButton>
      </div>
    </div>
  );
}

function TitlebarWindowButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant="ghost"
      className={
        danger
          ? "h-8 w-10 rounded-none text-muted-foreground hover:bg-destructive hover:text-white"
          : "h-8 w-10 rounded-none text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function PageContent({
  activePage,
  now,
  selectedDate,
  events,
  planner,
  settings,
  hotkeyError,
  updateState,
  reminders,
  onPlannerChange,
  onSettingsChange,
  onToggleOverlay,
  onToggleReminder,
  onRefreshUpdate,
  onInstallUpdate,
}: {
  activePage: AppPage;
  now: Date;
  selectedDate: Date;
  events: EventInstance[];
  planner: PlannerState;
  settings: AppSettings;
  hotkeyError: string;
  updateState: AppUpdateState;
  reminders: Record<string, boolean>;
  onPlannerChange: (planner: PlannerState) => void;
  onSettingsChange: (settings: AppSettings) => void;
  onToggleOverlay: () => void;
  onToggleReminder: (event: EventInstance) => void;
  onRefreshUpdate: () => void;
  onInstallUpdate: () => void;
}) {
  if (activePage === "overview") {
    return (
      <OverviewPage
        now={now}
        events={events}
        settings={settings}
        reminders={reminders}
        onToggleOverlay={onToggleOverlay}
        onToggleReminder={onToggleReminder}
      />
    );
  }

  if (activePage === "calendar") {
    return <CalendarPage selectedDate={selectedDate} planner={planner} />;
  }

  if (activePage === "goals") {
    return <GoalsPage planner={planner} onPlannerChange={onPlannerChange} />;
  }

  if (activePage === "collection") {
    return (
      <CollectionPage planner={planner} onPlannerChange={onPlannerChange} />
    );
  }

  if (activePage === "overlay") {
    return (
      <OverlaySettingsPage
        settings={settings}
        events={events}
        onSettingsChange={onSettingsChange}
      />
    );
  }

  if (activePage === "settings") {
    return (
      <SettingsPage
        settings={settings}
        hotkeyError={hotkeyError}
        onSettingsChange={onSettingsChange}
      />
    );
  }

  if (activePage === "updates") {
    return (
      <UpdatesPage
        updateState={updateState}
        onRefresh={onRefreshUpdate}
        onInstall={onInstallUpdate}
      />
    );
  }

  return (
    <PageHeader
      title="Not Found"
      description="The selected page is not available."
    />
  );
}

function pageTitle(page: AppPage) {
  const titles: Record<AppPage, string> = {
    overview: "Overview",
    calendar: "Calendar",
    goals: "Goals",
    collection: "Collection",
    overlay: "Overlay",
    settings: "Settings",
    updates: "Updates",
  };

  return titles[page];
}

export default App;
