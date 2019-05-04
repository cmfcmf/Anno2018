/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";

export type Trader = ReturnType<typeof traderFromSaveGame>;

export function traderFromSaveGame(data: Stream) {
  const _1 = data.read32();
  const _2 = data.read(5 * 4);
  const goods = parseGoods(data);
  const _3 = data.read(292);

  console.log("trader", _1, _2, goods, _3);

  return {
    goods
  };
}

function parseGoods(data: Stream) {
  const goods = [];
  for (let i = 0; i < 24; i++) {
    goods.push({
      goodId: data.read32(),
      _1: data.read32(),
      _2: data.read32()
    });
  }
  return goods;
}
