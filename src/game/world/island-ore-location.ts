/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import assert from "../../util/assert";

export enum OreLocationKind {
    Iron = 2,
    Gold = 3,
}

export enum OreLocationSize {
    Small = 1,
    Big = 0,
}

export class OreLocation {
    public static fromSaveGame(data: Stream) {
        const kind = data.read8();
        const position = new PIXI.Point(
            data.read8(),
            data.read8(),
        );
        const discoveredBy = data.read8(); // unsure
        const size = data.read8();
        assert(data.read8() === 0);
        const amount = data.read16(); // unsure

        return new OreLocation(
            kind,
            size,
            amount,
            position,
            discoveredBy,
        );
    }

    constructor(
        public kind: OreLocationKind,
        public size: OreLocationSize,
        public amount: number,
        public position: PIXI.Point,
        public discoveredBy: number,
    ) {
    }
}
