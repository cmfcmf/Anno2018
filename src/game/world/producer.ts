/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import assert from "../../util/assert";

export type Producer = ReturnType<typeof producerFromSaveGame>;

export function producerFromSaveGame(data: Stream) {
    const islandId = data.read8();
    const position = new PIXI.Point(data.read8(), data.read8());
    const speed = data.read8();
    const speedCount = data.read8();
    const stock = data.read24();
    const timer = data.read16();
    const secondGoodStock = data.read16();
    const firstGoodStock = data.read24();
    const producedGood = data.read8();
    const prodCnt = data.read16();
    const timeCnt = data.read16();
    const flags1 = data.read8();

    const active = (flags1 & (1 << 0)) > 0;
    const connectedToMarket = (flags1 & (1 << 1)) > 0;
    const animCnt = (flags1 >> 2) & 0b1111;
    const allowGoodPickup = (flags1 & (1 << 6)) === 0;
    const noGoodCnt = data.read8() & 0b1111;
    assert(data.read16() === 0);

    return {
        islandId,
        position,
        speed,
        speedCount,
        stock,
        timer,
        secondGoodStock,
        firstGoodStock,
        producedGood,
        prodCnt,
        timeCnt,
        active,
        connectedToMarket,
        animCnt,
        allowGoodPickup,
        noGoodCnt,
    };
}
