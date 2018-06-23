import * as assert from "assert";
import * as JSZip from "jszip";
import * as log from "loglevel";
import FileSystem from "../../filesystem";
import Stream from "../stream";
import BinPacker from "./bin-packer";
import colorPalette from "./bsh-color-palette";
import BSHImage from "./bsh-image";

const UPNG = require("upng-js/UPNG.js");

interface AtlasData {meta: { }; frames: {[key: string]: object}; }

export default class BSHParser {
    private zip: JSZip;
    private fileSystem: FileSystem;

    private readonly SIZE = 2048;

    private log: log.Logger;

    constructor(zip: JSZip, fileSystem: FileSystem) {
        this.zip = zip;
        this.fileSystem = fileSystem;
        this.log = log.getLogger("bsh-parser");
    }

    public async parse(inName: string, outName: string) {
        this.log.info(`Started parsing "${inName}".`);

        let path = "GFX";
        if (inName === "TOOLS") {
            path = "ToolGfx";
        }

        inName = `${path}/${inName}.BSH`;

        const bshFile = this.zip.file(inName);
        await this.doParse(await Stream.fromZipObject(bshFile), outName);

        this.log.info(`Finished parsing "${inName}".`);
    }

    /**
     * The parsing algorithm is based on code from the 'mdcii-engine'
     * project by Benedikt Freisen released under GPLv2+.
     * https://github.com/roybaer/mdcii-engine
     */
    private async doParse(data: Stream, outName: string) {
        await this.fileSystem.mkdir(`/gfx/${outName}`);
        // this.log.table(await this.fileSystem.ls(`/gfx`));
        // this.log.table(await this.fileSystem.ls(`/gfx/${outName}`));

        const HEADER_SIZE = 20;

        const fileType = data.readString(16);
        assert(fileType === "BSH");

        const fileLength = data.read32();
        assert(HEADER_SIZE + fileLength === data.length);

        const imageOffsets: number[] = [];
        imageOffsets.push(data.read32());
        const numImages = imageOffsets[0] / 4;

        for (let i = 0; i < numImages; i++) {
            imageOffsets.push(data.read32());
        }
        const images: BSHImage[] = [];

        for (let i = 0; i < numImages; i++) {
            data.seek(imageOffsets[i] + HEADER_SIZE);
            const bshImage = this.parseImage(data);
            if (bshImage !== null) {
                images.push(bshImage);
            }
        }

        images.sort((imageA: BSHImage, imageB: BSHImage) => {
            const a = Math.max(imageA.width, imageA.height);
            const b = Math.max(imageB.width, imageB.height);
            return a > b ? 1 : a < b ? -1 : 0;
        });

        let spritesheetIndex = 0;
        let binPacker = new BinPacker(this.SIZE,  this.SIZE);
        let pixels = new Uint8Array(this.SIZE * this.SIZE * 4);
        let atlasData: AtlasData = { meta: {  }, frames: {} };

        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            const result = binPacker.addBlock({w: image.width, h: image.height});
            if (result === false) {
                await this.saveSpriteSheet(pixels, atlasData, spritesheetIndex, outName);
                spritesheetIndex++;
                binPacker = new BinPacker(this.SIZE,  this.SIZE);
                pixels = new Uint8Array(this.SIZE * this.SIZE * 4);
                atlasData = { meta: {  }, frames: {} };
            } else {
                const startX = result.x;
                const startY = result.y;

                let j = 0;
                for (let y = 0; y < image.height; y++) {
                    for (let x = 0; x < image.width; x++) {
                        const idx = (startX + x + this.SIZE * y + this.SIZE * startY) * 4;
                        pixels[idx + 0] = image.pixels[j * 4 + 0];
                        pixels[idx + 1] = image.pixels[j * 4 + 1];
                        pixels[idx + 2] = image.pixels[j * 4 + 2];
                        pixels[idx + 3] = image.pixels[j * 4 + 3];
                        j++;
                    }
                }

                atlasData.frames[i.toString(10)] = {
                    frame: {
                        x: startX,
                        y: startY,
                        w: image.width,
                        h: image.height,
                    },
                    rotated: false,
                    trimmed: false,
                    spriteSourceSize: {
                        x: 0,
                        y: 0,
                        w: image.width,
                        h: image.height,
                    },
                    sourceSize: {
                        w: image.width,
                        h: image.height,
                    },
                };
            }
        }

        await this.saveSpriteSheet(pixels, atlasData, spritesheetIndex, outName);
    }

    private parseImage(data: Stream): BSHImage|null {
        const width = data.read32();
        const height = data.read32();
        const type = data.read32();
        const length = data.read32();
        const bshData = data.read(width * height * 3);

        assert(width > 0);
        assert(height > 0);
        if (width <= 1 || height <= 1) {
            return null;
        }

        const BYTES_PER_PIXEL = 4;
        const pixels = new Uint8Array(width * height * BYTES_PER_PIXEL);

        let sourceIdx = 0;
        let targetIdx = 0;
        let rowIdx = 0;

        while (true) {
            let ch = bshData[sourceIdx];
            sourceIdx += 1;
            if (ch === 0xFF) {
                break;
            }
            if (ch === 0xFE) {
                rowIdx += width * BYTES_PER_PIXEL;
                targetIdx = rowIdx;
            } else {
                targetIdx += ch * BYTES_PER_PIXEL;

                ch = bshData[sourceIdx];
                sourceIdx += 1;
                while (ch--) {
                    const idx = bshData[sourceIdx] * 3;
                    sourceIdx += 1;

                    pixels[targetIdx++] = colorPalette[idx];
                    pixels[targetIdx++] = colorPalette[idx + 1];
                    pixels[targetIdx++] = colorPalette[idx + 2];
                    pixels[targetIdx++] = 0xFF;
                }
            }
        }
        return new BSHImage(width, height, pixels);
    }

    private async saveSpriteSheet(pixels: Uint8Array, atlasData: AtlasData, spritesheetIndex: number, outName: string) {
        const png: ArrayBuffer = UPNG.encode([pixels.buffer], this.SIZE, this.SIZE, 0);

        // const imageNode = new Image();
        // imageNode.src = 'data:image/png;base64,'+ uInt8ToBase64(new Uint8Array(png));
        // document.body.appendChild(imageNode);
        // document.body.appendChild(document.createElement('br'));

        await this.fileSystem.write(`/gfx/${outName}/sprite-sheet-${spritesheetIndex}.png`, png);
        await this.fileSystem.write(`/gfx/${outName}/sprite-sheet-${spritesheetIndex}.json`, JSON.stringify(atlasData));
    }
}
