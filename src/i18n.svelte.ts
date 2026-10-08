import ja from "./locales/ja.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import ptBR from "./locales/pt-BR.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";
import zhTW from "./locales/zh-TW.json";
import type { SupportedLanguage } from "./types";

// 言語リソース辞書の型定義
export type LocaleDictionary = Record<string, string>;

// 利用可能な言語辞書
const translations: Record<string, LocaleDictionary> = {
  en,
  ja,
  es,
  "pt-BR": ptBR,
  de,
  fr,
  "zh-TW": zhTW,
};

// サポート言語コード一覧
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  "ja",
  "en",
  "es",
  "pt-BR",
  "de",
  "fr",
  "zh-TW",
] as const;

// 言語コードの正規化ヘルパー (pt_BR -> pt-BR, zh_TW -> zh-TW 等を吸収)
export function normalizeLanguageCode(langCode: string): string {
  const lower = langCode.toLowerCase().replace("_", "-");
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("pt")) return "pt-BR";
  if (lower.startsWith("de")) return "de";
  if (lower.startsWith("fr")) return "fr";
  if (lower.startsWith("zh")) return "zh-TW";
  if (lower.startsWith("en")) return "en";
  return langCode in translations ? langCode : "en";
}

// 初期言語の自動判定 (ブラウザ設定に合わせて自動選択、未サポート時は英語)
export function detectInitialLanguage(): string {
  try {
    const browserLang = (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage?.()) || navigator.language || "en";
    return normalizeLanguageCode(browserLang);
  } catch {
    return "en";
  }
}

let currentLang = $state(detectInitialLanguage());

export const i18n = {
  /**
   * 現在の表示言語を取得
   */
  get lang(): string {
    return currentLang;
  },
  /**
   * 表示言語を設定 (辞書が存在しない言語の場合は英語 'en' にフォールバック)
   */
  set lang(value: string) {
    const candidate = normalizeLanguageCode(value);
    const nextLang = candidate in translations ? candidate : "en";
    if (currentLang !== nextLang) {
      currentLang = nextLang;
    }
  },
  /**
   * 新しい言語辞書を追加・拡張する関数
   */
  registerLocale(langCode: string, dict: LocaleDictionary) {
    translations[langCode] = dict;
  },
  /**
   * 指定されたキーの翻訳文字列を取得
   */
  t(key: string, params?: Record<string, string | number>): string {
    const dict = translations[currentLang] || translations.en;
    let str = dict[key] || translations.en[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return str;
  }
};
