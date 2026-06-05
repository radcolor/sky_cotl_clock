import { getVersion } from "@tauri-apps/api/app";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { isTauriRuntime } from "@/tauri/overlay";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "current"
  | "downloading"
  | "installing"
  | "installed"
  | "unsupported"
  | "error";

export interface AppUpdateState {
  status: UpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  releaseDate: string | null;
  releaseNotes: string;
  progress: number | null;
  downloadedBytes: number;
  contentLength: number | null;
  error: string;
}

export const initialUpdateState: AppUpdateState = {
  status: "idle",
  currentVersion: "",
  latestVersion: null,
  releaseDate: null,
  releaseNotes: "",
  progress: null,
  downloadedBytes: 0,
  contentLength: null,
  error: "",
};

export type UpdateStatePatch = Partial<AppUpdateState>;

export async function checkForAppUpdate(
  setState: (patch: UpdateStatePatch) => void,
): Promise<Update | null> {
  if (!isTauriRuntime()) {
    setState({
      status: "unsupported",
      error: "App updates are available only in the installed desktop app.",
    });
    return null;
  }

  setState({ status: "checking", error: "", progress: null });

  try {
    const [currentVersion, update] = await Promise.all([
      getVersion(),
      check({ timeout: 30000 }),
    ]);

    if (!update) {
      setState({
        status: "current",
        currentVersion,
        latestVersion: null,
        releaseDate: null,
        releaseNotes: "",
      });
      return null;
    }

    setState({
      status: "available",
      currentVersion: update.currentVersion || currentVersion,
      latestVersion: update.version,
      releaseDate: update.date ?? null,
      releaseNotes: update.body ?? "",
    });

    return update;
  } catch (error) {
    setState({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function installAppUpdate(
  update: Update,
  setState: (patch: UpdateStatePatch) => void,
) {
  let downloadedBytes = 0;
  let contentLength: number | null = null;

  setState({
    status: "downloading",
    error: "",
    progress: 0,
    downloadedBytes: 0,
    contentLength: null,
  });

  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        contentLength = event.data.contentLength || null;
        setState({
          status: "downloading",
          contentLength,
          progress: contentLength ? 0 : null,
        });
      }

      if (event.event === "Progress") {
        downloadedBytes += event.data.chunkLength;
        setState({
          downloadedBytes,
          progress: contentLength
            ? Math.min(downloadedBytes / contentLength, 1)
            : null,
        });
      }

      if (event.event === "Finished") {
        setState({ status: "installing", progress: 1 });
      }
    });

    setState({ status: "installed", progress: 1 });
  } catch (error) {
    setState({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
