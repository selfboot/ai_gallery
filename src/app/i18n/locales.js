export const SUPPORTED_LANGUAGES = ["en", "zh"];

export function isSupportedLanguage(lang) {
  return SUPPORTED_LANGUAGES.includes(lang);
}
