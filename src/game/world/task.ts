/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {IslandMap, PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import assert from "../../util/assert";

interface ReachInhabitants {
    count: number;              // require n inhabitants
    requiredLevel: number;      // out of the n, a few need to reach level x
    requiredLevelCount: number; // require y of n inhabitants with level x
}

export default class Task {
    public static fromSaveGame(data: Stream, players: PlayerMap, islands: IslandMap) {
        const taskId = data.read32();
        const _1 = data.read(28);

        const monopolyGoodId1 = data.read8();
        assert(data.read8() === 0);
        const monopolyGoodId2 = data.read8();
        assert(data.read8() === 0);
        const helpOtherToReachInhabitantsPlayerId = data.read8(); // Can be 0, 1, 2, 3 or 7 for any player.

        assert(data.read(6).every((e) => e === 0));

        const playersToKill = [];
        if (data.read8Bool()) {
            // Any does not include trader, pirate and native.
            playersToKill.push("any");
        }
        if (data.read8Bool()) {
            playersToKill.push("red");
        }
        if (data.read8Bool()) {
            playersToKill.push("blue");
        }
        if (data.read8Bool()) {
            playersToKill.push("yellow");
        }
        if (data.read8Bool()) {
            playersToKill.push("white");
        }
        if (data.read8Bool()) {
            // Should never be true
            playersToKill.push("trader");
        }
        if (data.read8Bool()) {
            playersToKill.push("pirate");
        }
        if (data.read8Bool()) {
            // Should never be true
            playersToKill.push("native");
        }

        const _3 = data.read(25);

        const requiredBalance = data.read32();
        const successVideoId = data.read32();
        const requiredTradeBalance = data.read32();
        const _5 = data.read(16);

        const text = data.readString(2048);

        const _6 = data.read(8);

        const ownCityReachInhabitants: ReachInhabitants[] = [];
        for (let i = 0; i < 3; i++) {
            ownCityReachInhabitants.push({
                count: data.read32(),
                requiredLevel: data.read32(),
                requiredLevelCount: data.read32(),
            });
        }

        const _7 = data.read(36);

        const helpOtherToReachInhabitants: ReachInhabitants = {
            count: data.read32(),
            requiredLevel: data.read32(),
            requiredLevelCount: data.read32(),
        };

        console.warn("task", taskId, _1, _3, _5, _6, _7);

        return new Task(
            taskId,
            text,
            successVideoId,
            playersToKill,
            requiredBalance,
            requiredTradeBalance,
            ownCityReachInhabitants,
            helpOtherToReachInhabitantsPlayerId,
            helpOtherToReachInhabitants,
            monopolyGoodId1,
            monopolyGoodId2,
        );
    }

    constructor(
        public readonly taskId: number,
        public readonly text: string,
        public readonly successVideoId: number,
        public readonly playersToKill: string[],
        public readonly requiredBalance: number,
        public readonly requiredTradeBalance: number,
        public readonly ownCityReachInhabitants: ReachInhabitants[],
        public readonly helpOtherToReachInhabitantsPlayerId: number,
        public readonly helpOtherToReachInhabitants: ReachInhabitants,
        public readonly monopolyGoodId1: number,
        public readonly monopolyGoodId2: number,
    ) { }
}
