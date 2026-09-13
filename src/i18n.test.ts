import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectInitialLanguage, i18n } from "./i18n.svelte";
import fs from "node:fs";
import path from "node:path";
import ja from "./locales/ja.json";
import en from "./locales/en.json";

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
    const jaText = i18n.t("appTitle");
    expect(jaText).toBe("gnb-twipper 設定");

    i18n.lang = "en";
    const enText = i18n.t("appTitle");
    expect(enText).toBe("gnb-twipper Settings");

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

describe("Locale dictionaries completeness and integrity", () => {
  const jaKeys = Object.keys(ja).sort();
  const enKeys = Object.keys(en).sort();

  it("ja.json と en.json でキーが一致していること", () => {
    expect(jaKeys).toEqual(enKeys);
  });

  it("実コード内で i18n.t() に渡されているキーが言語辞書にすべて定義されていること", () => {
    const srcDir = path.resolve(__dirname);
    const codeFiles: string[] = [];

    function collectFiles(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          collectFiles(fullPath);
        } else if (
          (entry.name.endsWith(".ts") || entry.name.endsWith(".svelte")) &&
          !entry.name.endsWith(".test.ts")
        ) {
          codeFiles.push(fullPath);
        }
      }
    }

    collectFiles(srcDir);

    const missingInJa: { file: string; key: string }[] = [];
    const missingInEn: { file: string; key: string }[] = [];

    const keyRegex = /i18n\.t\(\s*["']([^"']+)["']/g;

    for (const filePath of codeFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      let match: RegExpExecArray | null;
      while ((match = keyRegex.exec(content)) !== null) {
        const key = match[1];
        if (!(key in ja)) {
          missingInJa.push({ file: path.relative(srcDir, filePath), key });
        }
        if (!(key in en)) {
          missingInEn.push({ file: path.relative(srcDir, filePath), key });
        }
      }
    }

    expect(missingInJa).toEqual([]);
    expect(missingInEn).toEqual([]);
  });
});
