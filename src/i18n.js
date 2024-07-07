import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(HttpBackend)
  .init({
    fallbackLng: 'en', // 默认语言
    load: 'languageOnly', // 只加载语言代码，忽略区域代码
    supportedLngs: ['en', 'zh'], // 定义支持的语言列表
    debug: true, // 开启调试模式，在控制台输出信息

    // 配置翻译文件加载路径
    backend: {
      // 针对你的文件结构进行调整
      loadPath: '/locales/{{lng}}.json',
    },

    interpolation: {
      escapeValue: false, // 因为React已经对XSS进行了防护
    },

    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage', 'cookie'],
    }
  });

export default i18n;
