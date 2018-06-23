import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";
import {AnnoMap} from "../parsers/GAM/anno-map";
import {Island, IslandField} from "../parsers/GAM/gam-parser";
import {uInt8ToBase64} from "../util/util";
import {default as Field, Rotation} from "./field";
import WorldField from "./world-field";

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 31;

export default class GameRenderer {
    private inited = false;

    private textures: Map<number, PIXI.Texture> = new Map();
    private fields: Map<number, Field> = new Map();

    constructor(private world: PIXI.Container, private fs: FileSystem) { }

    public async render(map: AnnoMap) {
        if (!this.inited) {
            await this.loadTextures();
            await this.loadFieldData();
            this.inited = true;
        }
        this.world.removeChildren();

        map.islands.forEach((island) => {
            if (island.diff === 0) {
                const defaultFields: WorldField[] = [];
                for (let y = 0; y < island.height; y++) {
                    for (let x = 0; x < island.width; x++) {
                        this.drawField(island.default_fields[x][y], island, x, y, defaultFields);
                    }
                }
                this.renderSpritesByYCoordinate(defaultFields);
            }

            const currentFields: WorldField[] = [];
            for (let y = 0; y < island.height; y++) {
                for (let x = 0; x < island.width; x++) {
                    this.drawField(island.current_fields[x][y], island, x, y, currentFields);
                }
            }
            this.renderSpritesByYCoordinate(currentFields);
        });

        console.log("Map drawn.");
    }

    private renderSpritesByYCoordinate(worldFields: WorldField[]) {
        const sprites = worldFields.reduce((s, field) => s.concat(field.getSprites(this.world, this.textures)), []);
        // sprites.sort((a: PIXI.Sprite, b: PIXI.Sprite) => {
        //    // TODO: This needs to take yOffset into account.
        //    const ay = a.y + a.height;
        //    const by = b.y + b.height;
        //    if (ay > by) {
        //        return 1;
        //    } else if (ay < by) {
        //        return -1;
        //    } else {
        //        return 0;
        //    }
        // });
        sprites.forEach((sprite) => this.world.addChild(sprite));
    }

    private drawField(field: IslandField, island: Island, x: number, y: number, worldFields: WorldField[]) {
        const fieldId = field.building;
        if (fieldId === 0xFFFF) {
            return;
        }
        const fieldConfig = this.fields.get(fieldId);
        const origin = new PIXI.Point(island.x + x, island.y + y);
        worldFields.push(new WorldField(fieldConfig, origin, field.rotation as Rotation, field.ani));
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

    private async loadFieldData() {
        const fieldData = JSON.parse(await this.fs.openAndGetContentAsText("/fields.json")).objects.HAUS.items;

        for (const key of Object.keys(fieldData)) {
            const fieldId = parseInt(fieldData[key].Id, 10);
            this.fields.set(fieldId, new Field(fieldData[key]));
        }
    }
}
