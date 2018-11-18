import * as PIXI from "pixi.js";
import FileSystem from "./filesystem";
import { textureFromUint8ArrayPNG } from "./util/pixi";

export default class SpriteLoader {
  private textures: Map<string, Map<number, PIXI.Texture>> = new Map();

  constructor(private readonly fs: FileSystem) {}

  public getTextures = async (directory: string) => {
    directory = `/gfx/${directory}`;
    if (!this.textures.has(directory)) {
      await this.loadTextures(directory);
    }
    return this.textures.get(directory);
  };

  private loadTextures = async (directory: string) => {
    const textureMap = new Map();

    const files = await this.fs.ls(directory);
    for (const file of files) {
      const fileExtension = file.name.substr(file.name.lastIndexOf(".") + 1);
      if (fileExtension === "png") {
        const dataFileName =
          file.fullPath.substring(0, file.fullPath.lastIndexOf(".")) + ".json";
        const spriteSheetData = JSON.parse(
          await this.fs.openAndGetContentAsText(dataFileName)
        );

        const spriteSheetImageData = await this.fs.openAndGetContentAsUint8Array(
          file
        );
        const tex = textureFromUint8ArrayPNG(spriteSheetImageData);
        const spritesheet = new PIXI.Spritesheet(
          tex.baseTexture,
          spriteSheetData
        );

        const textures = await new Promise<{ [key: string]: PIXI.Texture }>(
          (resolve, reject) => {
            spritesheet.parse((sheet: any, hmm: any) => {
              // This appears to be a bug.
              resolve(sheet as { [key: string]: PIXI.Texture });
            });
          }
        );

        for (const gfxId of Object.keys(textures)) {
          const texture = textures[gfxId];
          textureMap.set(parseInt(gfxId, 10), texture);
        }
      }
    }
    this.textures.set(directory, textureMap);
  };
}
