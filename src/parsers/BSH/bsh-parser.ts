import * as log from "loglevel";
import FileSystem from "../../filesystem";
import assert from "../../util/assert";
import Stream from "../stream";
import BinPacker from "./bin-packer";
import colorPalette from "./bsh-color-palette";
import BSHImage from "./bsh-image";

const UPNG = require("upng-js/UPNG.js");

interface AtlasData {
    meta: { };
    frames: {
        [key: string]: {
            frame: {
                x: number,
                y: number,
                w: number,
                h: number,
            },
            rotated: boolean,
            trimmed: boolean,
            spriteSourceSize: {
                x: number,
                y: number,
                w: number,
                h: number,
            },
            sourceSize: {
                w: number,
                h: number,
            },
        },
    };
}

export interface SpriteSheetConfig {
    png: ArrayBuffer;
    config: AtlasData;
}

export default class BSHParser {
    private readonly SPRITESHEET_SIZE = 2048;

    private log: log.Logger;

    constructor(private readonly fileSystem: FileSystem) {
        this.log = log.getLogger("bsh-parser");
    }

    public async parseBSH(data: Stream) {
        return this.parse(data, "BSH", 0);
    }

    public async parseZEI(data: Stream) {
        return this.parse(data, "ZEI", 3);
    }

    public createSpriteSheets(images: BSHImage[]): SpriteSheetConfig[] {
        const sheets: SpriteSheetConfig[] = [];

        let binPacker = new BinPacker(this.SPRITESHEET_SIZE,  this.SPRITESHEET_SIZE);
        let pixels = new Uint8Array(this.SPRITESHEET_SIZE * this.SPRITESHEET_SIZE * 4);
        let atlasData: AtlasData = { meta: {  }, frames: {} };

        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            let result = binPacker.addBlock({w: image.width, h: image.height});
            if (result === false) {
                sheets.push({
                    png: UPNG.encode([pixels.buffer], this.SPRITESHEET_SIZE, this.SPRITESHEET_SIZE),
                    config: atlasData,
                });
                binPacker = new BinPacker(this.SPRITESHEET_SIZE,  this.SPRITESHEET_SIZE);
                pixels = new Uint8Array(this.SPRITESHEET_SIZE * this.SPRITESHEET_SIZE * 4);
                atlasData = { meta: {  }, frames: {} };

                result = binPacker.addBlock({w: image.width, h: image.height});
            }
            if (!result) {
                throw new Error("Could not add image to empty spritesheet!");
            }

            const startX = result.x;
            const startY = result.y;

            let j = 0;
            for (let y = 0; y < image.height; y++) {
                for (let x = 0; x < image.width; x++) {
                    const idx = (startX + x + this.SPRITESHEET_SIZE * y + this.SPRITESHEET_SIZE * startY) * 4;
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

        sheets.push({
            png: UPNG.encode([pixels.buffer], this.SPRITESHEET_SIZE, this.SPRITESHEET_SIZE),
            config: atlasData,
        });

        return sheets;
    }

    public async saveSpriteSheets(sheets: SpriteSheetConfig[], outName: string) {
        await this.fileSystem.mkdir(outName);
        for (let i = 0; i < sheets.length; i++) {
            await this.saveSpriteSheet(sheets[i], i, outName);
        }
    }

    /**
     * The parsing algorithm is based on code from the 'mdcii-engine'
     * project by Benedikt Freisen released under GPLv2+.
     * https://github.com/roybaer/mdcii-engine
     */
    private async parse(data: Stream, extension: string, extraColumns: number) {
        const HEADER_SIZE = 20;

        const fileType = data.readString(16);
        assert(fileType === extension);

        const fileLength = data.read32();
        assert(HEADER_SIZE + fileLength === data.length);

        const imageOffsets: number[] = [];
        imageOffsets.push(data.read32());
        const numImages = imageOffsets[0] / 4;

        for (let i = 1; i < numImages; i++) {
            imageOffsets.push(data.read32());
        }
        const images: BSHImage[] = [];

        for (let i = 0; i < numImages; i++) {
            data.seek(imageOffsets[i] + HEADER_SIZE);
            const bshImage = this.parseImage(data, extraColumns);
            if (bshImage !== null) {
                images.push(bshImage);
            }
        }

        return images;
    }

    private parseImage(data: Stream, extraColumns: number): BSHImage|null {
        // const startPosition = data.position();
        const width = data.read32();
        const height = data.read32();
        const type = data.read32();
        const length = data.read32();

        assert(width > 0);
        assert(height > 0);
        if (width <= 1 || height <= 1) {
            return null;
        }

        const BYTES_PER_PIXEL = 4;
        const pixels = new Uint8Array(width * height * BYTES_PER_PIXEL);

        // The image's current row we write to.
        let rowIdx = 0;

        let targetIdx = 0;

        while (true) {
            let ch = data.read8();
            if (ch === 0xFF) {
                break;
            }
            if (ch === 0xFE) {
                // Go to next row. All remaining pixels in this row are empty
                rowIdx++;
                targetIdx = rowIdx * width * BYTES_PER_PIXEL;
            } else {
                // New row. First check how many pixels are empty and increase targetIdx by that amount
                targetIdx += ch * BYTES_PER_PIXEL;

                // How many pixels are colored
                ch = data.read8();
                while (ch--) {
                    const idx = data.read8() * 3;

                    pixels[targetIdx++] = colorPalette[idx];
                    pixels[targetIdx++] = colorPalette[idx + 1];
                    pixels[targetIdx++] = colorPalette[idx + 2];
                    pixels[targetIdx++] = 0xFF;
                }
            }
        }

        // const remainingImageData = data.read(length - (data.position() - startPosition));
        // assert(remainingImageData.every((e) => e === 0xFE || e === 0));
        // console.log(height, rowIdx, remainingImageData.length, remainingImageData);

        return new BSHImage(width, height, pixels);
    }

    private async saveSpriteSheet(sheet: SpriteSheetConfig, spritesheetIndex: number, outName: string) {
        await this.fileSystem.write(`${outName}/sprite-sheet-${spritesheetIndex}.png`, sheet.png);
        await this.fileSystem.write(`${outName}/sprite-sheet-${spritesheetIndex}.json`, JSON.stringify(sheet.config));
    }
}
