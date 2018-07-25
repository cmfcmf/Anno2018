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

        /*
        100101100001 // iron ore
        100101100101 // gold ore
        010111100001 // wool
        010111100111 // sugarcane
        010111100011 // tobacco
        010111101001 // cows
        010111011111 // grain
        000111110101 // flour
        001000001001 // iron
        001000000101 // swords
        001000010001 // muskets
        001000001111 // canons
        010000110011 // food
        001000001101 // tobacco
        010111011101 // spice
        010111100101 // cacao
        001000000111 // wine
        000111111011 // fabric
        000111111001 // clothing
        001000010101 // jewellery
        001000000011 // tools
        011111010001 // wood
        001000000001 // stone
         */
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
