// https://stackoverflow.com/a/12713326/2560557
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
    return btoa(result);
}
