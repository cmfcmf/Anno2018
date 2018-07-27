/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
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

export type Castle = ReturnType<typeof castleFromSaveGame>;

export function castleFromSaveGame(data: Stream) {
    const islandId = data.read8();
    const position = new PIXI.Point(data.read8(), data.read8());
    data.read8();
    data.read32();
    const numSwords = data.read16();
    const numMuscets = data.read16();
    const numCanons = data.read16();
    data.read16();
    const units = parseUnits(data);
    data.read(32);

    return {
        islandId,
        position,
        numSwords,
        numMuscets,
        numCanons,
        units,
    };
}

function parseUnits(data: Stream) {
    const units = [];
    for (let i = 0; i < 8; i++) {
        units.push(Unit.fromSaveGame(data));
    }
    return units;
}
