// https://stackoverflow.com/a/12713326/2560557
import * as JSZip from "jszip";

export function uInt8ToBase64(arr: Uint8Array): string {
    const CHUNK_SIZE = 0x8000; // arbitrary number
    let index = 0;
    const length = arr.length;
    let result = "";
    while (index < length) {
        const slice = arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
        result += String.fromCharCode.apply(null, slice);
        index += CHUNK_SIZE;
    }

    // tslint:disable-next-line:no-eval
    return typeof window !== "undefined" ? btoa(result) : eval("require")("btoa")(result);
}

/**
 * Get the value of the first query parameter with the given name.
 *
 * Taken from https://stackoverflow.com/a/901144
 */
export function getQueryParameter(name: string): string {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
    const results = regex.exec(url);
    if (!results) {
        return null;
    }
    if (!results[2]) {
        return "";
    }
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

export function findRootInZip(zip: JSZip): JSZip {
    const gfxFolder = zip.filter((relativePath) => ("/" + relativePath).endsWith("/GFX/"));
    if (gfxFolder.length === 1) {
        return zip.folder(gfxFolder[0].name.replace("GFX/", ""));
    }
    throw new Error("Your ZIP file does not have the expected structure.");
}
