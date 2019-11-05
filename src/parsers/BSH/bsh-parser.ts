import * as log from "loglevel";
import { SmartBuffer, SmartBufferOptions } from "smart-buffer";
import FileSystem from "../../filesystem";
import assert from "../../util/assert";
import Stream from "../stream";
import BinPacker from "./bin-packer";
import colorPalette, { colorsToIdx } from "./bsh-color-palette";
import BSHImage from "./bsh-image";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const UPNG = require("upng-js/UPNG.js");

interface AtlasData {
  meta: {};
  frames: {
    [key: string]: {
      frame: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
      rotated: boolean;
      trimmed: boolean;
      spriteSourceSize: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
      sourceSize: {
        w: number;
        h: number;
      };
    };
  };
}

export interface SpriteSheetConfig {
  png: ArrayBuffer;
  config: AtlasData;
}

export default class BSHParser {
  private readonly SPRITESHEET_SIZE = 2048;

  private readonly HEADER_SIZE = 20;

  private log: log.Logger;

  constructor() {
    this.log = log.getLogger("bsh-parser");
  }

  public async decodeBSH(data: Stream) {
    return this.decode(data, "BSH");
  }

  public async decodeZEI(data: Stream) {
    return this.decode(data, "ZEI");
  }

  public createSpriteSheets(images: BSHImage[]): SpriteSheetConfig[] {
    const sheets: SpriteSheetConfig[] = [];

    let binPacker = new BinPacker(this.SPRITESHEET_SIZE, this.SPRITESHEET_SIZE);
    let pixels = new Uint8Array(
      this.SPRITESHEET_SIZE * this.SPRITESHEET_SIZE * 4
    );
    let atlasData: AtlasData = { meta: {}, frames: {} };

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      let result = binPacker.addBlock({ w: image.width, h: image.height });
      if (result === false) {
        sheets.push({
          png: UPNG.encode(
            [pixels.buffer],
            this.SPRITESHEET_SIZE,
            this.SPRITESHEET_SIZE
          ),
          config: atlasData
        });
        binPacker = new BinPacker(this.SPRITESHEET_SIZE, this.SPRITESHEET_SIZE);
        pixels = new Uint8Array(
          this.SPRITESHEET_SIZE * this.SPRITESHEET_SIZE * 4
        );
        atlasData = { meta: {}, frames: {} };

        result = binPacker.addBlock({ w: image.width, h: image.height });
      }
      if (!result) {
        throw new Error("Could not add image to empty spritesheet!");
      }

      const startX = result.x;
      const startY = result.y;

      let j = 0;
      for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
          const idx =
            (startX +
              x +
              this.SPRITESHEET_SIZE * y +
              this.SPRITESHEET_SIZE * startY) *
            4;
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
          h: image.height
        },
        rotated: false,
        trimmed: false,
        spriteSourceSize: {
          x: 0,
          y: 0,
          w: image.width,
          h: image.height
        },
        sourceSize: {
          w: image.width,
          h: image.height
        }
      };
    }

    sheets.push({
      png: UPNG.encode(
        [pixels.buffer],
        this.SPRITESHEET_SIZE,
        this.SPRITESHEET_SIZE
      ),
      config: atlasData
    });

    return sheets;
  }

  public async saveSpriteSheets(
    fs: FileSystem,
    sheets: SpriteSheetConfig[],
    outName: string
  ) {
    await fs.mkdir(outName);
    for (let i = 0; i < sheets.length; i++) {
      await this.saveSpriteSheet(fs, sheets[i], i, outName);
    }
  }

  public encodeBSH(images: BSHImage[]): Buffer {
    const data = new SmartBuffer();
    data.writeString("BSH".padEnd(16, "\0"), "ascii");
    data.writeUInt32LE(42);

    images.forEach(() => data.writeUInt32LE(42));

    images.forEach((image, i) => {
      const imageBuffer = this.encodeImage(image).toBuffer();
      data.writeUInt32LE(data.writeOffset - this.HEADER_SIZE, 20 + i * 4);
      data.writeBuffer(imageBuffer);
    });

    data.writeUInt32LE(data.length - this.HEADER_SIZE, 16);

    return data.toBuffer();
  }

  /**
   * The parsing algorithm is based on code from the 'mdcii-engine'
   * project by Benedikt Freisen released under GPLv2+.
   * https://github.com/roybaer/mdcii-engine
   */
  private async decode(data: Stream, extension: string) {
    const fileType = data.readString(16);
    assert(fileType === extension);

    const fileLength = data.read32();
    assert(this.HEADER_SIZE + fileLength === data.length);

    const imageOffsets: number[] = [];
    imageOffsets.push(data.read32());
    const numImages = imageOffsets[0] / 4;

    for (let i = 1; i < numImages; i++) {
      imageOffsets.push(data.read32());
    }
    const images: BSHImage[] = [];

    for (let i = 0; i < numImages; i++) {
      data.seek(imageOffsets[i] + this.HEADER_SIZE);
      const bshImage = this.decodeImage(data);
      if (bshImage !== null) {
        images.push(bshImage);
      }
    }

    return images;
  }

  private decodeImage(data: Stream): BSHImage | null {
    const width = data.read32();
    const height = data.read32();
    const type = data.read32();
    const length = data.read32();

    assert(width > 0);
    assert(height > 0);

    const BYTES_PER_PIXEL = 4;
    const pixels = new Uint8Array(width * height * BYTES_PER_PIXEL);

    // The image's current row we write to.
    let rowIdx = 0;

    let targetIdx = 0;

    while (true) {
      const ch = data.read8();
      if (ch === 0xff) {
        break;
      }
      if (ch === 0xfe) {
        // Go to next row. All remaining pixels in this row are empty
        rowIdx++;
        targetIdx = rowIdx * width * BYTES_PER_PIXEL;
      } else {
        // New row. First check how many pixels are empty and increase targetIdx by that amount
        const emptyPixels = ch;
        targetIdx += emptyPixels * BYTES_PER_PIXEL;

        // How many pixels are colored
        const coloredPixels = data.read8();
        for (let i = 0; i < coloredPixels; i++) {
          const idx = data.read8() * 3;

          pixels[targetIdx++] = colorPalette[idx];
          pixels[targetIdx++] = colorPalette[idx + 1];
          pixels[targetIdx++] = colorPalette[idx + 2];
          pixels[targetIdx++] = 0xff;
        }
      }
    }
    return new BSHImage(width, height, pixels);
  }

  private encodeImage(image: BSHImage) {
    const data = new SmartBuffer();
    data
      .writeUInt32LE(image.width)
      .writeUInt32LE(image.height)
      .writeUInt32LE(1)
      .writeUInt32LE(42); // This is overwritten later on

    let FEs = 0;
    for (let y = 0; y < image.height; y++) {
      let skipPixelsEmpty = 0;
      let coloredPixels: number[] = [];
      let state: "empty" | "colored" = "empty";
      for (let x = 0; x < image.width; x++) {
        const color =
          (image.pixels[(y * image.width + x) * 4 + 0] << 24) +
          (image.pixels[(y * image.width + x) * 4 + 1] << 16) +
          (image.pixels[(y * image.width + x) * 4 + 2] << 8) +
          (image.pixels[(y * image.width + x) * 4 + 3] << 0);

        if (color === 0x00000000) {
          // Transparent pixel
          if (state === "empty") {
            skipPixelsEmpty++;
          } else if (state === "colored") {
            while (FEs > 0) {
              data.writeUInt8(0xfe);
              FEs--;
            }

            while (skipPixelsEmpty > 0xfd) {
              data.writeUInt8(0xfd);
              data.writeUInt8(0);
              skipPixelsEmpty -= 0xfd;
            }
            data.writeUInt8(skipPixelsEmpty);

            for (let i = 0; i < coloredPixels.length; i += 0xff) {
              const coloredPixelsSlice = coloredPixels.slice(i, i + 0xff);
              if (i > 0) {
                data.writeUInt8(0x00);
              }
              data.writeUInt8(coloredPixelsSlice.length);
              coloredPixelsSlice.forEach(pixel => {
                const colorIdx = colorsToIdx[pixel];
                data.writeUInt8(colorIdx);
              });
            }
            skipPixelsEmpty = 1;
            coloredPixels = [];
          }
          state = "empty";
        } else {
          // Non-transparent pixel
          state = "colored";
          coloredPixels.push(color);
        }
      }

      if (state === "colored") {
        while (FEs > 0) {
          data.writeUInt8(0xfe);
          FEs--;
        }

        while (skipPixelsEmpty > 0xfd) {
          data.writeUInt8(0xfd);
          data.writeUInt8(0);
          skipPixelsEmpty -= 0xfd;
        }
        data.writeUInt8(skipPixelsEmpty);
        for (let i = 0; i < coloredPixels.length; i += 0xff) {
          const coloredPixelsSlice = coloredPixels.slice(i, i + 0xff);
          if (i > 0) {
            data.writeUInt8(0x00);
          }
          data.writeUInt8(coloredPixelsSlice.length);
          coloredPixelsSlice.forEach(pixel => {
            data.writeUInt8(colorsToIdx[pixel.toString()]);
          });
        }
      }
      FEs++;
    }
    data.writeUInt8(0xff);

    const padding = (4 - (data.length % 4)) % 4; // How many bytes left to make it dividable by 4?
    for (let i = 0; i < padding; i++) {
      data.writeUInt8(0x00);
    }
    data.writeUInt32LE(data.length, 12);

    return data;
  }

  private async saveSpriteSheet(
    fs: FileSystem,
    sheet: SpriteSheetConfig,
    spritesheetIndex: number,
    outName: string
  ) {
    await fs.write(
      `${outName}/sprite-sheet-${spritesheetIndex}.png`,
      sheet.png
    );
    await fs.write(
      `${outName}/sprite-sheet-${spritesheetIndex}.json`,
      JSON.stringify(sheet.config)
    );
  }
}
