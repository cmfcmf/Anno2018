/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import { GoodIds } from "../field-type";
import assert from "../../util/assert";

export enum GoodAction {
  None = 0,
  Sell = 1,
  Buy = 2
}

export default class Good {
  public static fromSaveGame(data: Stream, overwriteGoodId?: GoodIds) {
    const tmp = data.read32();
    const sellingPrice = (tmp & 0b00000000000000000000001111111111) >> 0;
    const buyingPrice = (tmp & 0b00000000000011111111110000000000) >> 10;
    const action: GoodAction = (tmp & 0b11111111111100000000000000000000) >> 20;
    assert(action >= 0 && action <= 2);

    const _1 = data.read32();

    const wantedSellingAmount = data.read16() >> 5;
    const wantedBuyingAmount = data.read16() >> 5;

    const currentAmount = data.read16() >> 5;
    const _2 = data.read16();

    /*
      These good ids are super odd.
      When adding 20000, they are ids of the haeuser.cod file that match
      buildings producing these goods. (i.e., gold ore -> gold mine). In some
      places, Anno first adds 20000, fetches the haeuser.cod entry, then takes
      the produced good and uses that as the id. I am not sure why they did not
      just use the good id in the first place instead of this indirection.
      0b100101100001 // iron ore
      0b100101100101 // gold ore
      0b010111100001 // wool
      0b010111100111 // sugarcane
      0b010111100011 // tobacco
      0b010111101001 // cows
      0b010111011111 // grain
      0b000111110101 // flour
      0b001000001001 // iron
      0b001000000101 // swords
      0b001000010001 // muskets
      0b001000001111 // canons
      0b010000110011 // food
      0b001000001101 // tobacco
      0b010111011101 // spice
      0b010111100101 // cacao
      0b001000000111 // wine
      0b000111111011 // fabric
      0b000111111001 // clothing
      0b001000010101 // jewellery
      0b001000000011 // tools
      0b011111010001 // wood
      0b001000000001 // stone
         */
    const goodId = data.read16();
    const _3 = data.read16();

    return new Good(
      overwriteGoodId !== undefined ? overwriteGoodId : goodId,
      sellingPrice,
      buyingPrice,
      wantedSellingAmount,
      wantedBuyingAmount,
      currentAmount,
      action
    );
  }

  constructor(
    public goodId: number,
    public sellingPrice: number,
    public buyingPrice: number,
    public wantedSellingAmount: number,
    public wantedBuyingAmount: number,
    public currentAmount: number,
    public action: GoodAction
  ) {}
}
