import FileSystem from "../filesystem";
import { translations as lookup, TranslationKeys } from "./translations";

const translations: Map<TranslationKeys, string> = new Map();

export default function t(key: TranslationKeys): string {
  return translations.get(key) || "?";
}

export async function loadTranslations(fs: FileSystem) {
  const jsonData = JSON.parse(
    await fs.openAndGetContentAsText("/translations.json")
  );
  for (const domain of Object.keys(jsonData)) {
    const keyToIdxMapping = (lookup as any)[domain];

    for (const translationIdx in keyToIdxMapping) {
      if (parseInt(translationIdx, 10) >= 0) {
        const translationKey = keyToIdxMapping[translationIdx];
        translations.set(translationKey, jsonData[domain][translationIdx]);
      }
    }
  }
}
