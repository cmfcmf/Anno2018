export default class BSHImage {
    public width: number;
    public height: number;
    public pixels: Uint8Array;

    constructor(width: number, height: number, pixels: Uint8Array) {
        this.width = width;
        this.height = height;
        this.pixels = pixels;
    }
}
