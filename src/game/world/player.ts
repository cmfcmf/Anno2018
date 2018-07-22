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
        const _1 = data.read8();
        const id = data.read8();
        const _2 = data.read8();
        const color = data.read8();
        const _3 = data.read(4);
        const assignedTaskId = data.read8(); // Can be 0, 1, 2, 3 or 0xFF (no task assigned)
        const _3_2 = data.read(3);

        const enemiesDefeated = data.read16();
        const triumphArchesBuilt = data.read16();
        const soldiersKilled = data.read16();
        const soldiersFallen = data.read16();
        const shipsSunken = data.read16();
        const shipsKilled = data.read16();
        const _4 = data.read8();
        const flags = data.read8();
        const enablePositiveWillInfluence = (flags & (1 << 0)) > 0;
        const enableNegativeWillInfluence = (flags & (1 << 1)) > 0;
        const _5 = data.read(6);
        const positiveWillInfluence = data.read8() / 32.0 + 1.0; // Between 1.0 and 5.0
        const negativeWillInfluence = data.read8() / 32.0 + 1.0; // Between 1.0 and 5.0
        const _6 = data.read(14);
        const accessibleBuildings = data.read32();
        const statues = data.read16();
        const statuesBuilt = data.read16();
        const _7 = data.read32();
        const _8 = data.read(264);
        const tradeContracts = [];
        for (let i = 0; i < 3; i++) {
            tradeContracts.push(Contract.fromSaveGame(data));
        }
        const peaceContracts = [];
        for (let i = 0; i < 3; i++) {
            peaceContracts.push(Contract.fromSaveGame(data));
        }

        const _9 = data.read(584);
        const name = data.readString(112);

        // console.log("player", id, _1, _2, _3, _3_2, _4, _5, _6, _7, _8, _9);

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

            enablePositiveWillInfluence,
            enableNegativeWillInfluence,
            positiveWillInfluence,
            negativeWillInfluence,

            assignedTaskId,
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

        // Will influence
        public readonly enablePositiveWillInfluence: boolean,
        public readonly enableNegativeWillInfluence: boolean,
        public readonly positiveWillInfluence: number,
        public readonly negativeWillInfluence: number,

        public readonly assignedTaskId: number,
    ) {
    }
}
