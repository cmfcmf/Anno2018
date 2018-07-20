/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";

export enum OreLocationType {
    Iron = 2,
    Gold = 3,
}

export class OreLocation {
    public static fromSaveGame(data: Stream) {
        const oreLocation = new OreLocation(
            data.read8(),
            new PIXI.Point(
                data.read8(),
                data.read8(),
            ),
            data.read8() !== 0,
        );

        // TODO: Figure out how these work exactly.
        // SmallIron = 0x0A000001,
        // BigIron   = 0x1E000000,
        // Gold      = 0x06400001,
        data.read32();

        return oreLocation;
    }

    constructor(
        public type: OreLocationType,
        public position: PIXI.Point,
        public discovered: boolean,
    ) {
    }
}
