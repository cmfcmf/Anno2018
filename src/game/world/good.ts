/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";

export enum GoodAction {
    None = 0,
    Sell = 1,
    Buy = 2,
}

export default class Good {
    public static fromSaveGame(data: Stream) {
        const tmp = data.read32();
        const sellingPrice = (tmp & 0b00000000000000000000001111111111) >>  0;
        const buyingPrice  = (tmp & 0b00000000000011111111110000000000) >> 10;
        const action       = (tmp & 0b11111111111100000000000000000000) >> 20;
        const _1 = data.read32();
        const wantedSellingAmount = data.read16() >> 5;
        const wantedBuyingAmount = data.read16() >> 5;
        const currentAmount = data.read16() >> 5;
        const _2 = data.read16();
        const goodId = data.read16();
        const _3 = data.read16();

        return new Good(
            goodId,
            sellingPrice,
            buyingPrice,
            wantedSellingAmount,
            wantedBuyingAmount,
            currentAmount,
            action,
        );
    }

    constructor(
        public goodId: number,
        public sellingPrice: number,
        public buyingPrice: number,
        public wantedSellingAmount: number,
        public wantedBuyingAmount: number,
        public currentAmount: number,
        public action: GoodAction,
    ) { }
}
