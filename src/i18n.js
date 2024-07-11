import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import enTranslation from "./locales/en.json";
import zhTranslation from "./locales/zh.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
      },
      zh: {
        translation: zhTranslation,
      },
    },
    fallbackLng: "en",
    detection: {
      order: ["localStorage", "cookie", "navigator"], // 检测顺序
      caches: ["localStorage", "cookie"], // 缓存用户的语言选择
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
