import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";
import {AnnoMap} from "../parsers/GAM/anno-map";
import {Island, IslandField} from "../parsers/GAM/gam-parser";
import {default as Field, Rotation} from "./field";
import WorldField, {WorldLayer} from "./world-field";

export default class WorldFieldBuilder {
    private inited = false;

    private fields: Map<number, Field> = new Map();

    constructor(private fs: FileSystem) { }

    public async load(map: AnnoMap) {
        if (!this.inited) {
            await this.loadFieldData();
            this.inited = true;
        }

        const fields: WorldField[] = [];

        map.islands.forEach((island) => {
            if (island.diff === 0) {
                for (let y = 0; y < island.height; y++) {
                    for (let x = 0; x < island.width; x++) {
                        this.handleField(island.default_fields[x][y], island, x, y, fields, "land");
                    }
                }
            }
            for (let y = 0; y < island.height; y++) {
                for (let x = 0; x < island.width; x++) {
                    this.handleField(island.current_fields[x][y], island, x, y, fields, "building");
                }
            }
        });

        console.log("World fields loaded.");

        return fields;
    }

    private handleField(field: IslandField, island: Island, x: number, y: number, worldFields: WorldField[],
                        layer: WorldLayer) {
        if (field.fieldId === 0xFFFF) {
            return;
        }
        const fieldConfig = this.fields.get(field.fieldId);
        const origin = new PIXI.Point(island.x + x, island.y + y);
        worldFields.push(new WorldField(fieldConfig, origin, field.rotation as Rotation, field.ani, layer));
    }

    private async loadFieldData() {
        const fieldData = JSON.parse(await this.fs.openAndGetContentAsText("/fields.json")).objects.HAUS.items;

        for (const key of Object.keys(fieldData)) {
            const fieldId = parseInt(fieldData[key].Id, 10);
            this.fields.set(fieldId, new Field(fieldData[key]));
        }
    }
}
