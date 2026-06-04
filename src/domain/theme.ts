import type { AppSettings } from "./types";

type AccentPalette = Record<
  "primary" | "primaryForeground" | "ring" | "sidebarPrimary" | "sidebarPrimaryForeground",
  string
>;

export const FONT_OPTIONS: Array<{
  id: AppSettings["appearance"]["fontFamily"];
  label: string;
  family: string;
}> = [
  {
    id: "system",
    label: "System",
    family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "inter",
    label: "Inter",
    family: '"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: '"Montserrat Variable", Montserrat, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "lexend",
    label: "Lexend",
    family: '"Lexend Variable", Lexend, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "nunito",
    label: "Nunito",
    family: '"Nunito Variable", Nunito, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "outfit",
    label: "Outfit",
    family: '"Outfit Variable", Outfit, ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "work-sans",
    label: "Work Sans",
    family: '"Work Sans Variable", "Work Sans", ui-sans-serif, system-ui, sans-serif',
  },
  {
    id: "source-sans-3",
    label: "Source Sans 3",
    family: '"Source Sans 3 Variable", "Source Sans 3", ui-sans-serif, system-ui, sans-serif',
  },
];

export const ACCENT_OPTIONS: Array<{
  id: AppSettings["appearance"]["accentColor"];
  label: string;
  swatch: string;
  light: AccentPalette;
  dark: AccentPalette;
}> = [
  {
    id: "mira",
    label: "Mira",
    swatch: "oklch(0.511 0.096 186.391)",
    light: {
      primary: "oklch(0.511 0.096 186.391)",
      primaryForeground: "oklch(0.984 0.014 180.72)",
      ring: "oklch(0.737 0.021 106.9)",
      sidebarPrimary: "oklch(0.6 0.118 184.704)",
      sidebarPrimaryForeground: "oklch(0.984 0.014 180.72)",
    },
    dark: {
      primary: "oklch(0.437 0.078 188.216)",
      primaryForeground: "oklch(0.984 0.014 180.72)",
      ring: "oklch(0.58 0.031 107.3)",
      sidebarPrimary: "oklch(0.704 0.14 182.503)",
      sidebarPrimaryForeground: "oklch(0.277 0.046 192.524)",
    },
  },
  {
    id: "blue",
    label: "Blue",
    swatch: "oklch(0.55 0.19 259)",
    light: {
      primary: "oklch(0.55 0.19 259)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.68 0.13 255)",
      sidebarPrimary: "oklch(0.6 0.18 257)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.62 0.2 258)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.57 0.16 258)",
      sidebarPrimary: "oklch(0.67 0.18 258)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "oklch(0.54 0.22 292)",
    light: {
      primary: "oklch(0.54 0.22 292)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.66 0.16 292)",
      sidebarPrimary: "oklch(0.6 0.2 292)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.66 0.21 292)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.6 0.17 292)",
      sidebarPrimary: "oklch(0.7 0.2 292)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
  },
  {
    id: "rose",
    label: "Rose",
    swatch: "oklch(0.58 0.22 15)",
    light: {
      primary: "oklch(0.58 0.22 15)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.67 0.15 15)",
      sidebarPrimary: "oklch(0.63 0.2 15)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.66 0.2 15)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.6 0.16 15)",
      sidebarPrimary: "oklch(0.7 0.19 15)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
  },
  {
    id: "amber",
    label: "Amber",
    swatch: "oklch(0.68 0.16 68)",
    light: {
      primary: "oklch(0.68 0.16 68)",
      primaryForeground: "oklch(0.18 0.02 70)",
      ring: "oklch(0.73 0.11 68)",
      sidebarPrimary: "oklch(0.72 0.15 68)",
      sidebarPrimaryForeground: "oklch(0.18 0.02 70)",
    },
    dark: {
      primary: "oklch(0.73 0.16 68)",
      primaryForeground: "oklch(0.18 0.02 70)",
      ring: "oklch(0.63 0.12 68)",
      sidebarPrimary: "oklch(0.76 0.15 68)",
      sidebarPrimaryForeground: "oklch(0.18 0.02 70)",
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    swatch: "oklch(0.58 0.16 155)",
    light: {
      primary: "oklch(0.58 0.16 155)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.7 0.12 155)",
      sidebarPrimary: "oklch(0.64 0.15 155)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.66 0.16 155)",
      primaryForeground: "oklch(0.12 0.02 155)",
      ring: "oklch(0.58 0.12 155)",
      sidebarPrimary: "oklch(0.7 0.15 155)",
      sidebarPrimaryForeground: "oklch(0.12 0.02 155)",
    },
  },
  {
    id: "cyan",
    label: "Cyan",
    swatch: "oklch(0.61 0.14 205)",
    light: {
      primary: "oklch(0.61 0.14 205)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.72 0.11 205)",
      sidebarPrimary: "oklch(0.66 0.14 205)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.7 0.14 205)",
      primaryForeground: "oklch(0.12 0.02 205)",
      ring: "oklch(0.6 0.11 205)",
      sidebarPrimary: "oklch(0.74 0.13 205)",
      sidebarPrimaryForeground: "oklch(0.12 0.02 205)",
    },
  },
  {
    id: "slate",
    label: "Slate",
    swatch: "oklch(0.44 0.035 260)",
    light: {
      primary: "oklch(0.44 0.035 260)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.66 0.035 260)",
      sidebarPrimary: "oklch(0.5 0.04 260)",
      sidebarPrimaryForeground: "oklch(0.985 0 0)",
    },
    dark: {
      primary: "oklch(0.74 0.04 260)",
      primaryForeground: "oklch(0.16 0.01 260)",
      ring: "oklch(0.6 0.035 260)",
      sidebarPrimary: "oklch(0.78 0.04 260)",
      sidebarPrimaryForeground: "oklch(0.16 0.01 260)",
    },
  },
];

export function resolveTheme(
  theme: AppSettings["theme"],
  prefersDark: boolean,
): "dark" | "light" {
  if (theme === "system") {
    return prefersDark ? "dark" : "light";
  }

  return theme;
}

export function applyTheme(
  theme: AppSettings["theme"],
  resolvedTheme?: "dark" | "light",
) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const resolved = resolvedTheme ?? resolveTheme(theme, media.matches);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function applyAppearance(
  settings: AppSettings,
  resolvedTheme?: "dark" | "light",
) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const resolved = resolvedTheme ?? resolveTheme(settings.theme, media.matches);
  const accent =
    ACCENT_OPTIONS.find((option) => option.id === settings.appearance.accentColor) ??
    ACCENT_OPTIONS[0];
  const palette = resolved === "dark" ? accent.dark : accent.light;
  const font =
    FONT_OPTIONS.find((option) => option.id === settings.appearance.fontFamily) ??
    FONT_OPTIONS[1];
  const root = document.documentElement;

  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  root.style.setProperty("--font-sans", font.family);
  root.style.setProperty("font-family", font.family);
  root.style.setProperty("--primary", palette.primary);
  root.style.setProperty("--primary-foreground", palette.primaryForeground);
  root.style.setProperty("--ring", palette.ring);
  root.style.setProperty("--sidebar-primary", palette.sidebarPrimary);
  root.style.setProperty(
    "--sidebar-primary-foreground",
    palette.sidebarPrimaryForeground,
  );
}
