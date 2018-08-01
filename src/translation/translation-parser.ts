import {TranslationDomain} from "./translations";

export default function parseTranslations(data: string): Record<TranslationDomain, string[]> {
    const translations: any = {};
    let currentDomain: string|null;

    for (const line of data.split("\r\n")) {
        if (currentDomain) {
            if (line === "[END]") {
                currentDomain = null;
            } else {
                translations[currentDomain].push(line);
            }
        } else {
            if (line.startsWith("[")) {
                currentDomain = line.split(/[[\]]/)[1];
                translations[currentDomain] = [];
            }
        }
    }

    return translations as Record<TranslationDomain, string[]>;
}
