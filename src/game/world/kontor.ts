/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {IslandMap, PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import Good from "./good";
import Island from "./island";
import Player from "./player";

export default class Kontor {
    public static fromSaveGame(data: Stream, players: PlayerMap, islands: IslandMap): Kontor {
        const islandId = data.read8();
        const position = new PIXI.Point(data.read8(), data.read8());
        const playerId = data.read8();
        const goods = this.parseGoods(data);

        const player = players.get(playerId);
        const island = islands.get(islandId);

        return new Kontor(island, position, player, goods);
    }

    private static parseGoods(data: Stream) {
        const goods = [];
        for (let i = 0; i < 50; i++) {
            goods.push(Good.fromSaveGame(data));
        }
        return goods;
    }

    constructor(public island: Island, public position: PIXI.Point, public player: Player, public goods: Good[]) {}
}
