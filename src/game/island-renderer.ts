import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";
import {AnnoMap} from "../parsers/GAM/anno-map";
import {uInt8ToBase64} from "../util/util";
import {SpriteWithPositionAndLayer} from "./world-field";
import WorldFieldBuilder from "./world-field-builder";

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 31;

export default class IslandRenderer {
    private inited = false;

    private textures: Map<number, PIXI.Texture> = new Map();

    constructor(private world: PIXI.Container, private fs: FileSystem, private worldFieldBuilder: WorldFieldBuilder) { }

    public async render(map: AnnoMap) {
        if (!this.inited) {
            await this.loadTextures();
            this.inited = true;
        }
        this.world.removeChildren();

        const worldFields = await this.worldFieldBuilder.load(map);

        worldFields
            .reduce((sprites, field) => sprites.concat(field.getSprites(this.world, this.textures)), [])
            .sort((a: SpriteWithPositionAndLayer, b: SpriteWithPositionAndLayer) => {
                if (a.layer === b.layer) {
                    const ra = a.position.x + a.position.y;
                    const rb = b.position.x + b.position.y;
                    if (ra === rb) {
                        return 0;
                    } else if (ra < rb) {
                        return -1;
                    } else {
                        return 1;
                    }
                } else if (a.layer === "land") {
                    return -1;
                } else {
                    return 1;
                }
            })
            .forEach((sprite: SpriteWithPositionAndLayer) => this.world.addChild(sprite.sprite));

        console.log("Map drawn.");
    }

    private async loadTextures() {
        const files = await this.fs.ls("/gfx/STADTFLD/");
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
                    this.textures.set(parseInt(gfxId, 10), texture);
                }
            }
        }
    }
}
