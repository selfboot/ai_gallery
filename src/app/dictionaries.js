const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  zh: () => import('./dictionaries/zh.json').then((module) => module.default),
};

export const getDictionary = async (locale) => {
  if (!dictionaries[locale]) {
    console.error(`Dictionary for locale "${locale}" not found`);
    return {};
  }
  return dictionaries[locale]();
};