import ja from "./locales/ja.json";
import en from "./locales/en.json";

export const translations: Record<string, Record<string, string>> = { ja, en };

let currentLang = $state("en");

export const i18n = {
  get lang() {
    return currentLang;
  },
  set lang(value: string) {
    currentLang = value in translations ? value : "en";
  },
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
