/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {IslandMap, PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import Island from "./island";
import Player from "./player";

export default class City {
    public static fromSaveGame(data: Stream, players: PlayerMap, islands: IslandMap) {
        const islandId = data.read8();
        const _0 = data.read8();
        const playerId = data.read16();
        const progressAllowed = !data.read8Bool();
        const _1 = data.read(87);
        const inhabitants = [];
        for (let i = 0; i < 5; i++) {
            inhabitants.push(data.read32());
        }
        const _2 = data.read(15);
        const taxes = [];
        for (let i = 0; i < 5; i++) {
            taxes.push(data.read8());
        }
        const _3 = data.read(3);
        const name = data.readString(33);

        const player = players.get(playerId);
        if (player === undefined) {
            throw new Error(`Could not find player with id ${playerId}`);
        }
        const island = islands.get(islandId);
        if (island === undefined) {
            throw new Error(`Could not find island with id ${islandId}`);
        }

        const city = new City(island, player, progressAllowed, inhabitants, taxes, name);
        city.debug = {_0, _1, _2, _3};
        island.cities.push(city);
        return city;
    }

    public debug: any;

    constructor(
        public island: Island,
        public player: Player,
        public progressAllowed: boolean,
        public inhabitants: number[],
        public taxes: number[],
        public name: string,
    ) { }
}
