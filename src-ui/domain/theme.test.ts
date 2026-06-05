import { describe, expect, test } from "vitest";
import { resolveTheme } from "./theme";

describe("resolveTheme", () => {
  test("uses explicit dark", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  test("uses explicit light", () => {
    expect(resolveTheme("light", true)).toBe("light");
  });

  test("uses system preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});
