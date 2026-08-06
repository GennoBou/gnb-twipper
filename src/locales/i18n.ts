import ja from './ja.json';
import en from './en.json';

export type Language = 'ja' | 'en';

const translations: Record<Language, Record<string, string>> = {
  ja,
  en,
};

let currentLang: Language = 'ja';

export function setLanguage(lang: Language) {
  currentLang = lang;
}

export function getLanguage(): Language {
  return currentLang;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = translations[currentLang] || translations.ja;
  let text = dict[key] || translations.ja[key] || key;

  if (params) {
    Object.keys(params).forEach((paramKey) => {
      text = text.replace(new RegExp(`{\\s*${paramKey}\\s*}`, 'g'), String(params[paramKey]));
    });
  }

  return text;
}
