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
    ).toBe("ko");
  });

  test("adds Discord RPC defaults and rejects invalid modes", () => {
    const settings = mergeSettings({
      discordRpc: {
        enabled: true,
        clientId: " 123456789012345678 ",
        mode: "bad-mode" as never,
        safePreset: "bad-preset" as never,
        showButtons: false,
        requireSkyDetection: false,
      },
    });

    expect(settings.discordRpc.enabled).toBe(true);
    expect(settings.discordRpc.clientId).toBe("123456789012345678");
    expect(settings.discordRpc.mode).toBe("auto");
    expect(settings.discordRpc.safePreset).toBe("planning");
    expect(settings.discordRpc.showButtons).toBe(false);
    expect(settings.discordRpc.requireSkyDetection).toBe(false);
  });
});
