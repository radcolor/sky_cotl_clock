import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
import {
  getAllWindows,
  getCurrentWindow,
  LogicalPosition,
  primaryMonitor,
} from "@tauri-apps/api/window";
import type { AppSettings } from "@/domain/types";

export function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

export async function getWindowLabel(): Promise<string> {
  if (!isTauriRuntime()) {
    return "main";
  }

  return getCurrentWindow().label;
}

export async function configureOverlayWindow(settings: AppSettings) {
  if (!isTauriRuntime()) {
    return;
  }

  const current = getCurrentWindow();
  if (current.label !== "overlay") {
    return;
  }

  await current.setIgnoreCursorEvents(settings.overlay.clickThrough);
  await positionOverlay(settings);
}

export async function positionOverlay(settings: AppSettings) {
  if (!isTauriRuntime()) {
    return;
  }

  const overlay = await findWindow("overlay");
  const monitor = await primaryMonitor();

  if (!overlay || !monitor) {
    return;
  }

  const margin = 24;
  const width = 360 * settings.overlay.scale;
  const height = 420 * settings.overlay.scale;
  const workArea = monitor.workArea;
  const left = workArea.position.x;
  const top = workArea.position.y;
  const right = left + workArea.size.width;
  const bottom = top + workArea.size.height;

  const x =
    settings.overlay.position === "top-left" ||
    settings.overlay.position === "bottom-left"
      ? left + margin
      : right - width - margin;
  const y =
    settings.overlay.position === "bottom-left" ||
    settings.overlay.position === "bottom-right"
      ? bottom - height - margin
      : top + margin;

  await overlay.setPosition(new LogicalPosition(Math.round(x), Math.round(y)));
}

export async function toggleOverlay(settings: AppSettings) {
  if (!settings.overlay.enabled) {
    return;
  }

  const overlay = await findWindow("overlay");

  if (!overlay) {
    return;
  }

  const visible = await overlay.isVisible();
  if (visible) {
    await overlay.hide();
    return;
  }

  await positionOverlay(settings);
  await overlay.show();
}

export async function showMainWindow() {
  const main = await findWindow("main");

  if (!main) {
    return;
  }

  await main.show();
  await main.setFocus();
}

export async function registerAppHotkeys(
  settings: AppSettings,
  onError: (message: string) => void,
) {
  if (!isTauriRuntime()) {
    return;
  }

  try {
    await unregisterAll();
    await register(
      [settings.hotkeys.toggleOverlay, settings.hotkeys.showMainWindow],
      async (event) => {
        if (event.state !== "Pressed") {
          return;
        }

        if (event.shortcut === settings.hotkeys.toggleOverlay) {
          await toggleOverlay(settings);
        }

        if (event.shortcut === settings.hotkeys.showMainWindow) {
          await showMainWindow();
        }
      },
    );
    onError("");
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
  }
}

async function findWindow(label: string) {
  const windows = await getAllWindows();
  return windows.find((window) => window.label === label);
}
