import * as PIXI from "pixi.js";
import FileSystem from "./filesystem";
import {uInt8ToBase64} from "./util/util";

export default class SpriteLoader {
    private textures: Map<string, Map<number, PIXI.Texture>> = new Map();

    constructor(private readonly fs: FileSystem) { }

    public async getTextures(directory: string) {
        directory = `/gfx/${directory}`;
        if (!this.textures.has(directory)) {
            await this.loadTextures(directory);
        }
        return this.textures.get(directory);
    }

    private async loadTextures(directory: string) {
        const textureMap = new Map();

        const files = await this.fs.ls(directory);
        for (const file of files) {
            const fileExtension = file.name.substr(file.name.lastIndexOf(".") + 1);
            if (fileExtension === "png") {
                const dataFileName = file.name.substring(0, file.name.lastIndexOf(".")) + ".json";
                const spriteSheetData = JSON.parse(await this.fs.openAndGetContentAsText(dataFileName));

                const spriteSheetImageData = await this.fs.openAndGetContentAsUint8Array(file);
                const tmpImage = new Image();
                tmpImage.src = `data:image/png;base64,${uInt8ToBase64(spriteSheetImageData)}`;

                const spritesheet = new PIXI.Spritesheet(PIXI.Texture.from(tmpImage).baseTexture, spriteSheetData);

                const textures = await new Promise<{ [key: string]: PIXI.Texture }>((resolve, reject) => {
                    spritesheet.parse((sheet: any, hmm: any) => {
                        // This appears to be a bug.
                        resolve(sheet as { [key: string]: PIXI.Texture });
                    });
                });

                for (const gfxId of Object.keys(textures)) {
                    const texture = textures[gfxId];
                    textureMap.set(parseInt(gfxId, 10), texture);
                }
            }
        }
        this.textures.set(directory, textureMap);
    }
}
