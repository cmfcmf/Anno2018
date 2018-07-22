/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {IslandMap, PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";

export default class Timers {
    public static fromSaveGame(data: Stream, players: PlayerMap, islands: IslandMap) {
        const _1 = data.read(168);
        const flags = data.read16();
        const enableTrader = (flags & (1 << 6)) === 0;
        const bigIronRunsOut = (flags & (1 << 3)) === 0;
        const enableDroughts = (flags & (1 << 2)) === 0; // TODO: Does not appear to be working for endless games.
        const enablePirate = (flags & (1 << 0)) === 0;
        const enableVulcano = (flags & (1 << 8)) === 0;
        const _2 = data.slice(data.length - data.position());

        return new Timers(
            enableTrader,
            bigIronRunsOut,
            enableDroughts,
            enablePirate,
            enableVulcano,
        );
    }

    constructor(
        public readonly enableTrader: boolean,
        public readonly bigIronRunsOut: boolean,
        public readonly enableDroughts: boolean,
        public readonly enablePirate: boolean,
        public readonly enableVulcano: boolean,
    ) { }
}
