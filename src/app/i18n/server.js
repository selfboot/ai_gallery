import { getDictionary as getDictionaryOrigin } from "@/app/dictionaries";

export async function getDictionary(locale) {
  return getDictionaryOrigin(locale);
}
