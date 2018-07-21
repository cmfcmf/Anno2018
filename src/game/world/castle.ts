/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {IslandMap, PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import Island from "./island";
import {SoldierType} from "./soldier";

class Unit {
    public static fromSaveGame(data: Stream) {
        const type: SoldierType = data.read8();
        const flags = data.read8();
        data.read16();
        const hp = data.read16();
        data.read16();

        return new Unit(type, (flags & 0x10) !== 0, hp);
    }

    constructor(public type: SoldierType, public ready: boolean, public hp: number) {}
}

// tslint:disable-next-line:max-classes-per-file
export default class Castle {
    public static fromSaveGame(data: Stream, players: PlayerMap, islands: IslandMap) {
        const islandId = data.read8();
        const position = new PIXI.Point(data.read8(), data.read8());
        data.read8();
        data.read32();
        const numSwords = data.read16();
        const numMuscets = data.read16();
        const numCanons = data.read16();
        data.read16();
        const units = Castle.parseUnits(data);
        data.read(32);

        const island = islands.get(islandId);
        if (island === undefined) {
            throw new Error(`Could not find island with id ${islandId}`);
        }

        return new Castle(
            island,
            position,
            numSwords,
            numMuscets,
            numCanons,
            units,
        );
    }

    private static parseUnits(data: Stream) {
        const units = [];
        for (let i = 0; i < 8; i++) {
            units.push(Unit.fromSaveGame(data));
        }
        return units;
    }

    constructor(
        public island: Island,
        public position: PIXI.Point,
        public numSwords: number,
        public numMuscets: number,
        public numCanons: number,
        public units: Unit[],
    ) { }
}
