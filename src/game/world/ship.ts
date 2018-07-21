/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import Player from "./player";
import {ShipCourse} from "./ship-course";
import {Rotation8} from "./world";

export interface ShipGood {
    good_id: number;
    amount: number;
    action: number;
}

export interface ShipTradeStop {
    id: number;
    kontor_id: number;
    _1: number;
    goods: ShipGood[];
    _2: number[];
}

export default class Ship {
    public static fromSaveGame(data: Stream, players: PlayerMap) {
        const name = data.readString(28);
        const position = new PIXI.Point(data.read16(), data.read16());
        const _1 = data.read(3 * 4);

        const courseFrom = ShipCourse.fromSaveGame(data);
        const courseTo = ShipCourse.fromSaveGame(data);
        const courseCurrent = ShipCourse.fromSaveGame(data);

        const _2 = data.read32();
        const hp = data.read16();
        const _3 = data.read32();
        const canons = data.read8();
        const flags = data.read8();
        const sellingPrice = data.read16();
        const id = data.read16();
        const type = data.read16();
        const _4 = data.read8();
        const playerId = data.read8();
        const _5 = data.read32();
        const rotation = data.read16() as Rotation8;
        const tradeStops = this.parseShipTradeStops(data, 8);
        const _6 = data.read16();
        const cargo = this.parseShipGoods(data, 8);
        // type_name = SHIP_TYPES[ship['type']],

        const player = players.get(playerId);
        if (player === undefined) {
            throw new Error(`Could not find player with id ${playerId}`);
        }

        const ship = new Ship(
            id,
            player,
            position,
            rotation,
            name,
            hp,
            tradeStops,
            cargo,
        );
        player.ships.push(ship);
        return ship;
    }

    private static parseShipTradeStops(data: Stream, n: number): ShipTradeStop[] {
        const tradeStops = [];
        for (let i = 0; i < n; i++) {
            tradeStops.push({
                id: data.read8(),
                kontor_id: data.read8(),
                _1: data.read16(),
                goods: this.parseShipGoods(data, 2),
                _2: data.read(16),
            });
        }
        return tradeStops;
    }

    private static parseShipGoods(data: Stream, n: number): ShipGood[] {
        const cargo = [];
        for (let i = 0; i < n; i++) {
            cargo.push({
                good_id: data.read16(),
                amount: data.read16(),
                action: data.read32(), // 0 == 'load', 1 == 'unload'
            });
        }
        return cargo;
    }

    constructor(
        public readonly id: number,
        public readonly player: Player,

        public position: PIXI.Point,
        public rotation: Rotation8,
        public name: string,

        public hp: number,

        public readonly tradeStops: ShipTradeStop[],
        public readonly cargo: ShipGood[],
    ) { }
}
