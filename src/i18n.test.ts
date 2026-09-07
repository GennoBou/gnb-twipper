import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectInitialLanguage, i18n } from "./i18n.svelte";

describe("detectInitialLanguage", () => {
  const originalChrome = (globalThis as any).chrome;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // グローバルオブジェクトを復元
    if (originalChrome === undefined) {
      delete (globalThis as any).chrome;
    } else {
      (globalThis as any).chrome = originalChrome;
    }

    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it("chrome.i18n.getUILanguage() が 'ja' または 'ja-JP' を返す場合は 'ja' を返すこと", () => {
    (globalThis as any).chrome = {
      i18n: {
        getUILanguage: vi.fn().mockReturnValue("ja-JP"),
      },
    };
    expect(detectInitialLanguage()).toBe("ja");

    (globalThis as any).chrome = {
      i18n: {
        getUILanguage: vi.fn().mockReturnValue("ja"),
      },
    };
    expect(detectInitialLanguage()).toBe("ja");
  });

  it("chrome.i18n.getUILanguage() が 英語やその他の言語を返す場合は 'en' を返すこと", () => {
    (globalThis as any).chrome = {
      i18n: {
        getUILanguage: vi.fn().mockReturnValue("en-US"),
      },
    };
    expect(detectInitialLanguage()).toBe("en");

    (globalThis as any).chrome = {
      i18n: {
        getUILanguage: vi.fn().mockReturnValue("fr-FR"),
      },
    };
    expect(detectInitialLanguage()).toBe("en");
  });

  it("chrome が未定義で navigator.language が 日本語の場合は 'ja' を返すこと", () => {
    delete (globalThis as any).chrome;
    Object.defineProperty(globalThis, "navigator", {
      value: { language: "ja-JP" },
      writable: true,
      configurable: true,
    });
    expect(detectInitialLanguage()).toBe("ja");
  });

  it("chrome が未定義で navigator.language が 英語の場合は 'en' を返すこと", () => {
    delete (globalThis as any).chrome;
    Object.defineProperty(globalThis, "navigator", {
      value: { language: "en-US" },
      writable: true,
      configurable: true,
    });
    expect(detectInitialLanguage()).toBe("en");
  });

  it("chrome および navigator.language が利用できない場合は 'en' を返すこと", () => {
    delete (globalThis as any).chrome;
    Object.defineProperty(globalThis, "navigator", {
      value: { language: "" },
      writable: true,
      configurable: true,
    });
    expect(detectInitialLanguage()).toBe("en");
  });

  it("chrome.i18n.getUILanguage() 呼び出し時に例外が発生した場合は 'en' を返すこと", () => {
    (globalThis as any).chrome = {
      i18n: {
        getUILanguage: vi.fn().mockImplementation(() => {
          throw new Error("Extension context invalidated");
        }),
      },
    };
    expect(detectInitialLanguage()).toBe("en");
  });
});

describe("i18n object", () => {
  afterEach(() => {
    i18n.lang = "en";
  });

  it("言語の設定と取得ができること (未知の言語指定時は 'en' にフォールバック)", () => {
    i18n.lang = "ja";
    expect(i18n.lang).toBe("ja");

    i18n.lang = "en";
    expect(i18n.lang).toBe("en");

    i18n.lang = "unknown_lang";
    expect(i18n.lang).toBe("en");
  });

  it("t() で正しい翻訳文字列を取得でき、パラメータ置換が行われること", () => {
    i18n.lang = "ja";
    const jaText = i18n.t("app_name");
    expect(jaText).toBeTruthy();

    i18n.lang = "en";
    const enText = i18n.t("app_name");
    expect(enText).toBeTruthy();

    // 存在しないキーの場合はキー名がそのまま返されること
    expect(i18n.t("non_existent_key")).toBe("non_existent_key");
  });

  it("registerLocale() で新しい言語を追加・切り替えできること", () => {
    i18n.registerLocale("fr", {
      greeting: "Bonjour {name}",
    });

    i18n.lang = "fr";
    expect(i18n.lang).toBe("fr");
    expect(i18n.t("greeting", { name: "World" })).toBe("Bonjour World");
  });
});
