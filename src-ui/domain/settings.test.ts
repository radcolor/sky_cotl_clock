import { describe, expect, test } from "vitest";
import { mergeSettings } from "./settings";

describe("settings migration", () => {
  test("adds a safe language default to old stored settings", () => {
    const settings = mergeSettings({
      theme: "light",
    });

    expect(settings.language).toBe("en");
    expect(settings.theme).toBe("light");
  });

  test("keeps supported stored languages and rejects invalid ones", () => {
    expect(mergeSettings({ language: "hi" }).language).toBe("hi");
    expect(
      mergeSettings({ language: "ko-KR" as never }).language,
    ).toBe("en");
  });
});
