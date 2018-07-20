/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import City from "./city";
import Ship from "./ship";
import Soldier from "./soldier";

import Contract from "./contract";

export default class Player {
    public static fromSaveGame(data: Stream) {
        const money = data.read32S();
        data.read8();
        const id = data.read8();
        data.read8();
        const color = data.read8();
        data.read(8);
        const enemiesDefeated = data.read16();
        const triumphArchesBuilt = data.read16();
        const soldiersKilled = data.read16();
        const soldiersFallen = data.read16();
        const shipsSunken = data.read16();
        const shipsKilled = data.read16();
        data.read(24);
        const accessibleBuildings = data.read32();
        const statues = data.read16();
        const statuesBuilt = data.read16();
        data.read32();
        data.read(264);
        const tradeContracts = [];
        for (let i = 0; i < 3; i++) {
            tradeContracts.push(Contract.fromSaveGame(data));
        }
        const peaceContracts = [];
        for (let i = 0; i < 3; i++) {
            peaceContracts.push(Contract.fromSaveGame(data));
        }

        data.read(584);
        const name = data.readString(112);

        return new Player(
            id,
            color,
            name,
            tradeContracts,
            peaceContracts,
            [],
            [],
            [],
            money,
            enemiesDefeated,
            triumphArchesBuilt,
            soldiersKilled,
            soldiersFallen,
            shipsSunken,
            shipsKilled,
            accessibleBuildings,
            statues,
            statuesBuilt,
        );
    }

    constructor(
        public readonly id: number,
        public readonly color: number,
        public readonly name: string,

        public readonly tradeContracts: Contract[],
        public readonly peaceContracts: Contract[],
        public readonly ships: Ship[],
        public readonly cities: City[],
        public readonly soldiers: Soldier[],

        public money: number,

        // Statistics
        public enemiesDefeated: number,
        public triumphArchesBuilt: number,
        public soldiersKilled: number,
        public soldiersFallen: number,
        public shipsSunken: number,
        public shipsKilled: number,
        public accessibleBuildings: number,
        public statues: number,
        public statuesBuilt: number,
    ) {
    }
}
