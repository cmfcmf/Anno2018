import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";
import {uInt8ToBase64} from "../util/util";
import {default as FieldX} from "./field-type";
import Field from "./world/field";
import Island from "./world/island";

export type WorldLayer = "land" | "building";

export interface SpriteWithPositionAndLayer {
    sprite: PIXI.Sprite;
    position: PIXI.Point;
    layer: WorldLayer;
}

export default class IslandSpriteLoader {
    private inited = false;

    private fields: Map<number, FieldX> = new Map();

    private textures: Map<number, PIXI.Texture> = new Map();

    constructor(private fs: FileSystem) { }

    public async getIslandSprites(islands: Island[]) {
        if (!this.inited) {
            await this.loadFieldData();
            await this.loadTextures();
            this.inited = true;
        }

        const sprites: SpriteWithPositionAndLayer[] = [];

        islands.forEach((island) => {
            if (!island.diff) {
                for (let x = 0; x < island.width; x++) {
                    for (let y = 0; y < island.height; y++) {
                        this.handleField(island.baseFields[x][y], island, x, y, sprites, "land");
                    }
                }
            }
            for (let x = 0; x < island.width; x++) {
                for (let y = 0; y < island.height; y++) {
                    this.handleField(island.topFields[x][y], island, x, y, sprites, "building");
                }
            }
        });
        return sprites;
    }

    private handleField(field: Field|null, island: Island, x: number, y: number,
                        sprites: SpriteWithPositionAndLayer[], layer: WorldLayer) {
        if (field === null) {
            return;
        }
        const fieldConfig = this.fields.get(field.fieldId);
        const origin = new PIXI.Point(island.x + x, island.y + y);

        const newSprites = fieldConfig.getSprites(origin, field.rotation, field.ani, this.textures, layer);
        sprites.push(...newSprites);
    }

    private async loadFieldData() {
        const fieldData = JSON.parse(await this.fs.openAndGetContentAsText("/fields.json")).objects.HAUS.items;

        for (const key of Object.keys(fieldData)) {
            const fieldId = parseInt(fieldData[key].Id, 10);
            this.fields.set(fieldId, new FieldX(fieldData[key]));
        }
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
