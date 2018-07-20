/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import Player from "./player";
import {Rotation4} from "./world";

export default class Field {
    public static saveGameDataLength = 8;

    public static fromSaveGame(data: Stream, players: PlayerMap) {
        const buildingId = data.read16() + 20000;
        const x = data.read8();
        const y = data.read8();
        const bits = data.read32();

        const rotation  = (bits >>  0) & (2 ** 2 - 1);
        const animation = (bits >>  2) & (2 ** 4 - 1);
        const unknown   = (bits >>  6) & (2 ** 8 - 1);
        const status    = (bits >> 14) & (2 ** 3 - 1);
        const random    = (bits >> 17) & (2 ** 5 - 1);
        const playerId  = (bits >> 22) & (2 ** 3 - 1);
        const empty     = (bits >> 25) & (2 ** 7 - 1);

        return new Field(
            buildingId,
            x,
            y,
            rotation as Rotation4,
            animation,
            status,
            random,
            players.get(playerId),
        );
    }

    constructor(
        public fieldId: number,
        public x: number,
        public y: number,
        public rotation: Rotation4,
        public ani: number,
        public status: number,
        public random: number,
        public player: Player,
    ) {}
}
