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
        const sellingPrice = (tmp & 0b11111111110000000000000000000000) >> 22;
        const buyingPrice  = (tmp & 0b00000000001111111111000000000000) >> 12;
        const action       = (tmp & 0b00000000000000000000111111111111) >>  0;

        data.read32();
        data.read16();
        const wantedAmount = data.read16();
        const amount = data.read16();
        data.read16();
        const goodId = data.read16();
        data.read16();

        return new Good(
            goodId,
            sellingPrice,
            buyingPrice,
            wantedAmount,
            amount,
            action,
        );
    }

    constructor(
        public goodId: number,
        public sellingPrice: number,
        public buyingPrice: number,
        public wantedAmount: number,
        public amount: number,
        public action: GoodAction,
    ) { }
}
