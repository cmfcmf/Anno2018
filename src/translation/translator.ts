import FileSystem from "../filesystem";
import {
  translations as lookup,
  TranslationKeys,
  fieldIdToTranslationMap
} from "./translations";

export class Translator {
  private readonly translations = new Map<TranslationKeys, string>();
  private jsonData: any;

  constructor(private readonly fs: FileSystem) {}

  public async loadTranslations() {
    this.jsonData = JSON.parse(
      await this.fs.openAndGetContentAsText("/translations.json")
    );
    for (const domain of Object.keys(this.jsonData)) {
      const keyToIdxMapping = (lookup as any)[domain];

      for (const translationIdx in keyToIdxMapping) {
        if (parseInt(translationIdx, 10) >= 0) {
          const translationKey = keyToIdxMapping[translationIdx];
          this.translations.set(
            translationKey,
            this.jsonData[domain][translationIdx]
          );
        }
      }
    }
  }

  public translate(key: TranslationKeys): string {
    const result = this.translations.get(key);
    if (!result) {
      throw new Error(`Unknown translation key ${key}.`);
    }
    return result;
  }

  public getFieldName(fieldId: number): string {
    for (const each of fieldIdToTranslationMap) {
      for (let i = 0; i < each.ids.length; i++) {
        const id = each.ids[i];
        if (id === fieldId) {
          return this.jsonData[each.type][i];
        }
      }
    }

    throw new Error(`Could not find translation for field id ${fieldId}.`);
  }
}
