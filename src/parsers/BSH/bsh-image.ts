const UPNG = require("upng-js/UPNG.js");

export default class BSHImage {
    public width: number;
    public height: number;
    public pixels: Uint8Array;

    constructor(width: number, height: number, pixels: Uint8Array) {
        this.width = width;
        this.height = height;
        this.pixels = pixels;
    }

    public toPNG(): ArrayBuffer {
        return UPNG.encode([this.pixels.buffer], this.width, this.height);
    }
}
