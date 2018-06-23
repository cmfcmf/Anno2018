/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../stream";

export default class Good {
    public readonly sellingPrice: number;
    public readonly buyingPrice: number;
    public readonly action: "none" | "sell" | "buy";
    public readonly amount: number;
    public readonly wantedAmount: number;
    public readonly goodId: number;

    constructor(data: Stream) {
        const tmp = data.read32();
        this.sellingPrice = (tmp & 0b11111111110000000000000000000000) >> 22;
        this.buyingPrice  = (tmp & 0b00000000001111111111000000000000) >> 12;
        const action      = (tmp & 0b00000000000000000000111111111111) >> 0;
        this.action = action === 0 ? "none" : action === 1 ? "sell" : "buy";

        data.read32();
        data.read16();
        this.wantedAmount = data.read16();
        this.amount = data.read16();
        data.read16();
        this.goodId = data.read16();
        data.read16();
    }
}
