import scopeMap from "./scope-map.json";
import { getDictionary } from "@/app/dictionaries";
import { I18nProvider } from "@/app/i18n/client";

function shouldIncludeKey(key, keys, prefixes) {
  return keys.has(key) || prefixes.some((prefix) => key.startsWith(prefix));
}

function pickDictionary(dictionary, scope) {
  const commonKeys = new Set(scopeMap.common?.keys || []);
  const commonPrefixes = scopeMap.common?.prefixes || [];
  const scoped = scopeMap.scopes?.[scope] || {};
  const scopedKeys = new Set(scoped.keys || []);
  const scopedPrefixes = scoped.prefixes || [];
  const result = {};

  for (const [key, value] of Object.entries(dictionary)) {
    if (
      shouldIncludeKey(key, commonKeys, commonPrefixes) ||
      shouldIncludeKey(key, scopedKeys, scopedPrefixes)
    ) {
      result[key] = value;
    }
  }

  return result;
}

export async function getScopedDictionary(locale, scope) {
  const dictionary = await getDictionary(locale);
  return pickDictionary(dictionary, scope);
}

export async function getCommonDictionary(locale) {
  const dictionary = await getDictionary(locale);
  return pickDictionary(dictionary, "__common__");
}

export async function ScopedI18nProvider({ locale, scope, children }) {
  const dictionary = await getScopedDictionary(locale, scope);

  return (
    <I18nProvider initialDictionary={dictionary}>
      {children}
    </I18nProvider>
  );
}
