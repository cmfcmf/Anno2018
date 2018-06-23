/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../stream";
import Contract from "./contract";

export default class Player {
    public readonly money: number;
    public readonly playerId: number;
    public readonly color: number;
    public readonly name: string;

    public readonly tradeContracts: Contract[] = [];
    public readonly peaceContracts: Contract[] = [];

    public readonly enemiesDefeated: number;
    public readonly triumphArchesBuilt: number;
    public readonly soldiersKilled: number;
    public readonly soldiersFallen: number;
    public readonly shipsSunken: number;
    public readonly shipsKilled: number;
    public readonly accessibleBuildings: number;
    public readonly statues: number;
    public readonly statuesBuilt: number;

    constructor(data: Stream) {
        this.money = data.read32S();
        data.read8();
        this.playerId = data.read8();
        data.read8();
        this.color = data.read8();
        data.read(8);
        this.enemiesDefeated = data.read16();
        this.triumphArchesBuilt = data.read16();
        this.soldiersKilled = data.read16();
        this.soldiersFallen = data.read16();
        this.shipsSunken = data.read16();
        this.shipsKilled = data.read16();
        data.read(24);
        this.accessibleBuildings = data.read32();
        this.statues = data.read16();
        this.statuesBuilt = data.read16();
        data.read32();
        data.read(264);
        for (let i = 0; i < 3; i++) {
            this.tradeContracts.push(new Contract(data));
        }
        for (let i = 0; i < 3; i++) {
            this.peaceContracts.push(new Contract(data));
        }

        data.read(584);
        this.name = data.readString(112);
    }
}
