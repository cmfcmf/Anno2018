/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import City from "./city";
import Field from "./field";
import {OreLocation} from "./island-ore-location";

export default class Island {
    public static fromSaveGame(data: Stream) {
        const id = data.read8();
        const width = data.read8();
        const height = data.read8();
        const _1 = data.read8();
        const x = data.read16();
        const y = data.read16();
        const _2 = data.read16();
        const _3 = data.read16();
        const _4 = data.read(14);
        const numOreLocations = data.read8();
        const fertilityDiscovered = data.read8();
        const oreLocations = [
            OreLocation.fromSaveGame(data),
            OreLocation.fromSaveGame(data),
        ];
        const _5 = data.read(48);
        const fertility = data.read8();
        const _6 = data.read8();
        const _7 = data.read16();
        const numBaseIsland = data.read16();
        const _8 = data.read16();
        const isSouth = data.read8Bool();
        const diff = data.read8();
        const _9 = data.read(14);

        const island = new Island(
            id,
            new PIXI.Point(x, y),
            new PIXI.Point(width, height),
            numBaseIsland,
            numOreLocations,
            oreLocations,
            fertility,
            isSouth,
            diff !== 0,
            fertilityDiscovered !== 0,
        );
        island.debug = {_1, _2, _3, _4, _5, _6, _7, _8, _9, diff};

        return island;
    }

    public debug: any;

    public baseFields: Field[][] = [];

    public topFields: Array<Array<Field|null>> = [];

    public cities: City[];

    constructor(
        public readonly id: number,
        public readonly worldPosition: PIXI.Point,
        public readonly size: PIXI.Point,
        public readonly baseIslandNumber: number,
        public readonly numOreLocations: number,
        public readonly oreLocations: OreLocation[],
        public readonly fertility: number,
        private readonly south: boolean,
        public readonly differsFromBaseIsland: boolean, // If this is 1, we need to ignore the .scp file for this island
                                                        // and instead use the data in INSELHAUS[0] directly after
                                                        // the island block. This can happen, for example, when the
                                                        // island is rotated.

        public fertilityDiscovered: boolean,
    ) {
        this.cities = [];
    }

    get width() {
        return this.size.x;
    }

    get height() {
        return this.size.y;
    }

    get x() {
        return this.worldPosition.x;
    }

    get y() {
        return this.worldPosition.y;
    }

    get positionRect() {
        return new PIXI.Rectangle(
            this.x,
            this.y,
            this.width,
            this.height,
        );
    }

    get isSouth() {
        return this.south;
    }

    get isNorth() {
        return !this.south;
    }

    public getBuildingAtWorldPosition(worldPosition: PIXI.Point): Field|null {
        console.assert(this.positionRect.contains(worldPosition.x, worldPosition.y));

        return this.topFields[worldPosition.x][worldPosition.y];
    }
}
