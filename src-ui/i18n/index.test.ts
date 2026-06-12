import { describe, expect, test } from "vitest";
import {
  DEFAULT_LOCALE,
  detectPreferredLocale,
  getLocaleDirection,
  resolveLocale,
} from ".";

describe("locale resolution", () => {
  test("maps common regional variants to supported base languages", () => {
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale("en-GB")).toBe("en");
    expect(resolveLocale("hi-IN")).toBe("hi");
    expect(resolveLocale("es-MX")).toBe("es");
    expect(resolveLocale("es-ES")).toBe("es");
    expect(resolveLocale("zh-CN")).toBe("zh-Hans");
    expect(resolveLocale("zh-SG")).toBe("zh-Hans");
  });

  test("falls back to English for unsupported or empty locale codes", () => {
    expect(resolveLocale("ko-KR")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale("")).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  test("detects first supported browser language", () => {
    expect(detectPreferredLocale(["ko-KR", "ru-RU", "en-US"])).toBe("ru");
    expect(detectPreferredLocale(["ko-KR", "en-GB"])).toBe("en");
  });

  test("reports right-to-left direction for Arabic only", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");
  });
});
