import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { detectInitialLanguage, i18n, SUPPORTED_LANGUAGES } from "./i18n.svelte";
import fs from "node:fs";
import path from "node:path";
import ja from "./locales/ja.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import ptBR from "./locales/pt-BR.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import zhTW from "./locales/zh-TW.json";

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

  it("chrome.i18n.getUILanguage() の各言語コードに応じた適切な言語を返すこと", () => {
    const testCases: [string, string][] = [
      ["ja-JP", "ja"],
      ["ja", "ja"],
      ["es-ES", "es"],
      ["es-419", "es"],
      ["pt-BR", "pt-BR"],
      ["pt_BR", "pt-BR"],
      ["pt", "pt-BR"],
      ["de-DE", "de"],
      ["de", "de"],
      ["fr-FR", "fr"],
      ["fr", "fr"],
      ["zh-TW", "zh-TW"],
      ["zh-HK", "zh-TW"],
      ["zh", "zh-TW"],
      ["en-US", "en"],
      ["en", "en"],
      ["ko-KR", "en"], // 未対応言語は英語にフォールバック
      ["ru-RU", "en"],
    ];

    for (const [input, expected] of testCases) {
      (globalThis as any).chrome = {
        i18n: {
          getUILanguage: vi.fn().mockReturnValue(input),
        },
      };
      expect(detectInitialLanguage()).toBe(expected);
    }
  });

  it("chrome が未定義で navigator.language の言語に応じた適切な言語を返すこと", () => {
    delete (globalThis as any).chrome;
    Object.defineProperty(globalThis, "navigator", {
      value: { language: "es-ES" },
      writable: true,
      configurable: true,
    });
    expect(detectInitialLanguage()).toBe("es");
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

  it("サポート言語の設定と取得ができること (未知の言語指定時は 'en' にフォールバック)", () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      i18n.lang = lang;
      expect(i18n.lang).toBe(lang);
    }

    i18n.lang = "unknown_lang";
    expect(i18n.lang).toBe("en");
  });

  it("アンダースコア記号などの形式でも正規化されて設定できること", () => {
    i18n.lang = "pt_BR";
    expect(i18n.lang).toBe("pt-BR");

    i18n.lang = "zh_TW";
    expect(i18n.lang).toBe("zh-TW");
  });

  it("t() で各言語の正しい翻訳文字列を取得でき、パラメータ置換が行われること", () => {
    i18n.lang = "ja";
    expect(i18n.t("appTitle")).toBe("gnb-twipper 設定");
    expect(i18n.t("liveCount", { count: 3 })).toBe("(ライブ 3名)");

    i18n.lang = "en";
    expect(i18n.t("appTitle")).toBe("gnb-twipper Settings");
    expect(i18n.t("liveCount", { count: 3 })).toBe("(Live: 3)");

    i18n.lang = "es";
    expect(i18n.t("appTitle")).toBe("Configuración de gnb-twipper");
    expect(i18n.t("liveCount", { count: 3 })).toBe("(En directo: 3)");

    i18n.lang = "pt-BR";
    expect(i18n.t("appTitle")).toBe("Configurações do gnb-twipper");
    expect(i18n.t("liveCount", { count: 3 })).toBe("(Ao vivo: 3)");

    i18n.lang = "de";
    expect(i18n.t("appTitle")).toBe("gnb-twipper Einstellungen");
    expect(i18n.t("liveCount", { count: 3 })).toBe("(Live: 3)");

    i18n.lang = "fr";
    expect(i18n.t("appTitle")).toBe("Paramètres de gnb-twipper");
    expect(i18n.t("liveCount", { count: 3 })).toBe("(En direct : 3)");

    i18n.lang = "zh-TW";
    expect(i18n.t("appTitle")).toBe("gnb-twipper 設定");
    expect(i18n.t("liveCount", { count: 3 })).toBe("(直播中: 3)");

    // 存在しないキーの場合はキー名がそのまま返されること
    expect(i18n.t("non_existent_key")).toBe("non_existent_key");
  });

  it("registerLocale() で新しい言語を追加・切り替えできること", () => {
    i18n.registerLocale("it", {
      greeting: "Ciao {name}",
    });

    i18n.lang = "it";
    expect(i18n.lang).toBe("it");
    expect(i18n.t("greeting", { name: "World" })).toBe("Ciao World");
  });
});

describe("Locale dictionaries completeness and integrity", () => {
  const dictionaries: Record<string, Record<string, string>> = {
    ja,
    en,
    es,
    "pt-BR": ptBR,
    de,
    fr,
    "zh-TW": zhTW,
  };

  const baseKeys = Object.keys(en).sort();

  it("すべての言語辞書でキーセットが完全に一致していること", () => {
    for (const [langCode, dict] of Object.entries(dictionaries)) {
      const keys = Object.keys(dict).sort();
      expect(keys, `Dictionary keys for ${langCode} should match en.json`).toEqual(baseKeys);
    }
  });

  it("実コード内で i18n.t() に渡されているキーがすべての言語辞書に定義されていること", () => {
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

    const missingKeys: { lang: string; file: string; key: string }[] = [];
    const keyRegex = /i18n\.t\(\s*["']([^"']+)["']/g;

    for (const filePath of codeFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      let match: RegExpExecArray | null;
      while ((match = keyRegex.exec(content)) !== null) {
        const key = match[1];
        for (const [langCode, dict] of Object.entries(dictionaries)) {
          if (!(key in dict)) {
            missingKeys.push({ lang: langCode, file: path.relative(srcDir, filePath), key });
          }
        }
      }
    }

    expect(missingKeys).toEqual([]);
  });
});
