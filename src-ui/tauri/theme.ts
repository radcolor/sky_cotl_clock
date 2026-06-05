import { setTheme } from "@tauri-apps/api/app";
import { getCurrentWindow, type Theme } from "@tauri-apps/api/window";
import type { UnlistenFn } from "@tauri-apps/api/event";
import type { AppSettings } from "@/domain/types";
import { isTauriRuntime } from "@/tauri/overlay";

export async function syncNativeTheme(
  theme: AppSettings["theme"],
): Promise<Theme | null> {
  if (!isTauriRuntime()) {
    return null;
  }

  await setTheme(theme === "system" ? null : theme);

  if (theme !== "system") {
    return theme;
  }

  return getCurrentWindow().theme();
}

export async function listenNativeThemeChange(
  onThemeChange: (theme: Theme) => void,
): Promise<UnlistenFn> {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  return getCurrentWindow().onThemeChanged((event) => onThemeChange(event.payload));
}
