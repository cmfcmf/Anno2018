/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import assert from "../../util/assert";
import {Rotation4} from "./world";

export default class Field {
    public static saveGameDataLength = 8;

    public static fromSaveGame(data: Stream) {
        const buildingId = data.read16() + 20000;
        const x = data.read8();
        const y = data.read8();
        const bits = data.read32();

        const rotation      = (bits >>  0) & (2 ** 2 - 1);
        const animation     = (bits >>  2) & (2 ** 4 - 1);
        const islandId      = (bits >>  6) & (2 ** 8 - 1);
        const islandCityNum = (bits >> 14) & (2 ** 3 - 1);
        const random        = (bits >> 17) & (2 ** 5 - 1);
        const playerId      = (bits >> 22) & (2 ** 4 - 1);
        const empty         = (bits >> 26) & (2 ** 6 - 1);
        if (empty !== 0) {
            // empty is sometimes 51.
            // console.warn(`Expected 0, got ${empty}.`);
        }

        return new Field(
            buildingId,
            x,
            y,
            islandId,
            islandCityNum,
            rotation as Rotation4,
            animation,
            random,
            playerId,
        );
    }

    constructor(
        public fieldId: number,
        public x: number,
        public y: number,
        public islandId: number,
        public islandCityNum: number,
        public rotation: Rotation4,
        public ani: number,
        public random: number,
        public playerId: number,
    ) {}
}
