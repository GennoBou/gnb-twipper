import ja from "./locales/ja.json";
import en from "./locales/en.json";

// 言語リソース辞書の型定義
export type LocaleDictionary = Record<string, string>;

// 利用可能な言語辞書
const translations: Record<string, LocaleDictionary> = { en, ja };

// 初期言語の自動判定 (標準は英語、日本語環境は日本語)
function detectInitialLanguage(): string {
  try {
    const browserLang = (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage?.()) || navigator.language || "en";
    return browserLang.toLowerCase().startsWith("ja") ? "ja" : "en";
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
    currentLang = value in translations ? value : "en";
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

