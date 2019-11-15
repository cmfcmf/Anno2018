import AsyncLock from "async-lock";
import { Spritesheet, Texture } from "pixi.js";
import FileSystem from "./filesystem";
import { textureFromUint8ArrayPNG } from "./util/pixi";

export default class SpriteLoader {
  private textures: Map<string, Map<number, Texture>> = new Map();
  private lock: AsyncLock = new AsyncLock();

  constructor(private readonly fs: FileSystem) {}

  public getTextures = async (directory: string) => {
    directory = `/gfx/${directory}`;

    // Make sure that textures aren't loaded multiple times at once.
    await this.lock.acquire(directory, async () => {
      if (!this.textures.has(directory)) {
        await this.loadTextures(directory);
      }
    });
    return this.textures.get(directory)!;
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
        const spritesheet = new Spritesheet(tex.baseTexture, spriteSheetData);

        const textures = await new Promise<Record<string, Texture>>(resolve => {
          spritesheet.parse((textures: Record<string, Texture>) =>
            resolve(textures)
          );
        });

        for (const [id, texture] of Object.entries(textures)) {
          const gfxId = id.split("|")[1];
          textureMap.set(parseInt(gfxId, 10), texture);
        }
      }
    }
    this.textures.set(directory, textureMap);
  };
}
