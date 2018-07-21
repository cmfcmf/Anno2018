/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {IslandMap, PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import Island from "./island";
import Player from "./player";

export default class Trader {
    public static fromSaveGame(data: Stream, players: PlayerMap, islands: IslandMap) {
        const _1 = data.read32();
        const _2 = data.read(5 * 4);
        const goods = this.parseGoods(data);
        const _3 = data.read(292);

        console.error(_1, _2, goods, _3);

        return new Trader(goods);
    }

    private static parseGoods(data: Stream) {
        const goods = [];
        for (let i = 0; i < 24; i++) {
            goods.push({
                goodId: data.read32(),
                _1: data.read32(),
                _2: data.read32(),
            });
        }
        return goods;
    }

    constructor(
        public goods: any,
    ) { }
}
