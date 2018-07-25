/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import assert from "../../util/assert";
import City from "./city";
import Contract from "./contract";
import PlayerEvent from "./player-event";
import Ship from "./ship";
import Soldier from "./soldier";

export enum PlayerKind {
    HUMAN = 0,
    AI = 9,
    TRADER = 13,
    PIRATE = 14,
    NATIVE = 11,
}

export default class Player {
    public static fromSaveGame(data: Stream) {
        const money = data.read32S();
        const kind: PlayerKind = data.read8();
        const id = data.read8();
        const humanPlayerCount = data.read8(); // unsure
        const color = data.read8();
        const killedByPlayerId = data.read8(); // killedByPlayerId
        assert(data.read8() === 0);
        const _3_3 = data.read16(); // unsure, time since no ships and cities
        const assignedTaskId = data.read8(); // Can be 0, 1, 2, 3 or 0xFF (no task assigned)
        const _3_2 = data.read8(); // unsure, may not be played by human
        const palaceBuilt = data.read8Bool();
        const cathedralBuilt = data.read8Bool();

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
        assert(data.read(14).every((e) => e === 0));
        const accessibleBuildings = data.read32();
        const statues = data.read16();
        const statuesBuilt = data.read16();
        const cameraPosition = new PIXI.Point(data.read16(), data.read16());

        const _8 = data.read(264);
        const tradeContracts = [];
        for (let i = 0; i < 3; i++) {
            tradeContracts.push(Contract.fromSaveGame(data));
        }
        const peaceContracts = [];
        for (let i = 0; i < 3; i++) {
            peaceContracts.push(Contract.fromSaveGame(data));
        }

        const _9 = data.read(72);

        const playerEvents = [];
        for (let i = 0; i < 64; i++) {
            playerEvents.push(PlayerEvent.fromSaveGame(data));
        }

        const fullName = data.readString(64);
        const shortName = data.readString(48); // Only used in multiplayer

        console.log(`player ${id}:  `, killedByPlayerId, _3_3, _3_2, _4, _5); // , _8, _9);

        return new Player(
            id,
            kind,
            color,
            fullName,
            shortName,
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
            palaceBuilt,
            cathedralBuilt,

            enablePositiveWillInfluence,
            enableNegativeWillInfluence,
            positiveWillInfluence,
            negativeWillInfluence,

            assignedTaskId,

            playerEvents,
        );
    }

    constructor(
        public readonly id: number,
        public readonly kind: PlayerKind,
        public readonly color: number,
        public readonly fullName: string,
        public readonly shortName: string,

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
        public palaceBuilt: boolean,
        public cathedralBuilt: boolean,

        // Will influence
        public readonly enablePositiveWillInfluence: boolean,
        public readonly enableNegativeWillInfluence: boolean,
        public readonly positiveWillInfluence: number,
        public readonly negativeWillInfluence: number,

        public readonly assignedTaskId: number,

        public readonly playerEvents: PlayerEvent[],
    ) {
    }
}
