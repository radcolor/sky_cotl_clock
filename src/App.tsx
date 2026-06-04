import { useEffect, useMemo, useRef, useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import { emit, listen } from "@tauri-apps/api/event";
import "./App.css";
import { AppSidebar, type AppPage } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
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

function App() {
  const [settings, setSettings] = useState<AppSettings>(readStoredSettings);
  const [planner, setPlanner] = useState<PlannerState>(readStoredPlanner);
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

    const timers = new WeakMap<Element, number>();
    const listeners = new WeakMap<Element, EventListener>();
    const watched = new Set<Element>();

    const markScrolling = (element: Element) => {
      element.setAttribute("data-scrolling", "true");

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

    const bindScrollbars = () => {
      document.querySelectorAll(".theme-scrollbar").forEach((element) => {
        if (watched.has(element)) {
          return;
        }

        watched.add(element);
        const listener = () => markScrolling(element);
        listeners.set(element, listener);
        element.addEventListener("scroll", listener, {
          passive: true,
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
        const listener = listeners.get(element);
        if (listener) {
          element.removeEventListener("scroll", listener);
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

  if (!windowLabel) {
    return null;
  }

  if (windowLabel === "overlay") {
    return <Overlay events={overlayEvents} settings={settings} />;
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
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
        <SidebarInset className="h-svh min-h-0 overflow-hidden">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 shadow-[0_1px_2px_color-mix(in_oklch,var(--foreground)_6%,transparent)]">
              <SidebarTrigger />
              <div className="text-sm font-medium text-muted-foreground">
                {pageTitle(activePage)}
              </div>
            </div>
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
                onPlannerChange={setPlanner}
                onSettingsChange={setSettings}
                onToggleOverlay={() => void toggleOverlay(settings)}
                onRefreshUpdate={() => void refreshUpdate()}
                onInstallUpdate={() => void installUpdate()}
              />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
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
  onPlannerChange,
  onSettingsChange,
  onToggleOverlay,
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
  onPlannerChange: (planner: PlannerState) => void;
  onSettingsChange: (settings: AppSettings) => void;
  onToggleOverlay: () => void;
  onRefreshUpdate: () => void;
  onInstallUpdate: () => void;
}) {
  if (activePage === "overview") {
    return (
      <OverviewPage
        now={now}
        events={events}
        planner={planner}
        settings={settings}
        onToggleOverlay={onToggleOverlay}
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
