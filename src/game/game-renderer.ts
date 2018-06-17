import {AnnoMap, Island, IslandField} from "../parsers/GAM/gam-parser";
import * as assert from "assert";
import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";
import {uInt8ToBase64} from "../util/util";

const TILE_WIDTH = 64;
const TILE_HEIGHT = 31;

const MAP_SIZE = 512;

export default class GameRenderer {
    private inited = false;

    private textures: Map<string, Map<string, PIXI.Texture>> = new Map([
        ['STADTFLD', new Map()],
    ]);

    private fieldData: any;

    private fieldIdToGfxMap: Map<number, number> = new Map();

    constructor (private app: PIXI.Application, private fs: FileSystem) { }

    public async render(map: AnnoMap) {
        if (!this.inited) {
            await this.loadTextures();
            await this.loadFieldData();
            this.inited = true;
        }
        this.app.stage.removeChildren();

        map.islands.forEach(island => {
            if (island.diff === 0) {
                for (let y = 0; y < island.height; y++) {
                    for (let x = 0; x < island.width; x++) {
                        const field = island.default_fields[x][y];
                        this.drawField(island, x, y, field);
                    }
                }
            }
            for (let y = 0; y < island.height; y++) {
                for (let x = 0; x < island.width; x++) {
                    const field = island.current_fields[x][y];
                    this.drawField(island, x, y, field);
                }
            }
        });

        console.log('Map drawn.');
    }

    private drawField(island: Island, x: number, y: number, field: IslandField) {
        const fieldId = field.building;
        if (fieldId !== 0xFFFF) {
            // TODO: Render things smartly.

            const worldX = (island.x + x) * 10;
            const worldY = (island.y + y) * 10;

            assert(this.fieldIdToGfxMap.has(fieldId));
            const gfxId = this.fieldIdToGfxMap.get(fieldId).toString();

            const stadtfldTextures = this.textures.get('STADTFLD');
            assert(stadtfldTextures.has(gfxId));

            const sprite = new PIXI.Sprite(stadtfldTextures.get(gfxId));
            sprite.position.x = worldX;
            sprite.position.y = worldY;
            sprite.name = `${x},${y}`;

            this.app.stage.addChild(sprite);
        }
    }

    private async loadTextures() {
        const files = await this.fs.ls('/gfx/STADTFLD/');
        for (const file of files) {
            const fileExtension = file.name.substr(file.name.lastIndexOf('.') + 1);
            if (fileExtension === 'png') {
                const dataFileName = file.name.substring(0, file.name.lastIndexOf('.')) + ".json";
                const spriteSheetData = JSON.parse(await this.fs.openAndGetContentAsText(dataFileName));

                const spriteSheetImageData = await this.fs.openAndGetContentAsUint8Array(file);
                const tmpImage = new Image();
                tmpImage.src = `data:image/png;base64,${uInt8ToBase64(spriteSheetImageData)}`;

                const spritesheet = new PIXI.Spritesheet(PIXI.Texture.from(tmpImage).baseTexture, spriteSheetData);

                const textures = await new Promise<{ [key: string]: PIXI.Texture }>((resolve, reject) => {
                    spritesheet.parse((sheet: any, hmm: { [key: string]: PIXI.Texture }) => {
                        // This appears to be a bug.
                        const textures = <{ [key: string]: PIXI.Texture }>sheet;
                        resolve(textures);
                    });
                });

                for (const textureName of Object.keys(textures)) {
                    const texture = textures[textureName];
                    this.textures.get('STADTFLD').set(textureName, texture);
                }
            }
        }
    }

    private async loadFieldData() {
        this.fieldData = JSON.parse(await this.fs.openAndGetContentAsText('/fields.json')).objects.HAUS.items;

        for (const key of Object.keys(this.fieldData)) {
            const fieldId = this.fieldData[key].Id;
            const gfxId = this.fieldData[key].Gfx;
            this.fieldIdToGfxMap.set(parseInt(fieldId), parseInt(gfxId));
        }
    }
}