/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { Point } from "pixi.js";
import Stream from "../../parsers/stream";
import { ShipCourse } from "./ship-course";
import { Rotation8 } from "./world";

export interface ShipGood {
  good_id: number;
  amount: number;
  action: number;
}

export interface ShipTradeStop {
  id: number;
  kontor_id: number;
  _1: number;
  goods: ShipGood[];
  _2: number[];
}

export type Ship = ReturnType<typeof shipFromSaveGame>;

export function shipFromSaveGame(data: Stream) {
  const name = data.readString(28);
  const position = new Point(data.read16(), data.read16());
  const _1 = data.read(3 * 4);

  const courseFrom = ShipCourse.fromSaveGame(data);
  const courseTo = ShipCourse.fromSaveGame(data);
  const courseCurrent = ShipCourse.fromSaveGame(data);

  const _2 = data.read32();
  const hp = data.read16();
  const _3 = data.read32();
  const canons = data.read8();
  const flags = data.read8();
  const sellingPrice = data.read16();
  const id = data.read16();
  const type = data.read16();
  const _4 = data.read8();
  const playerId = data.read8();
  const _5 = data.read32();
  const rotation = data.read16() as Rotation8;
  const tradeStops = parseShipTradeStops(data, 8);
  const _6 = data.read16();
  const cargo = parseShipGoods(data, 8);
  // type_name = SHIP_TYPES[ship['type']],

  return {
    id,
    playerId,
    position,
    rotation,
    name,
    hp,
    tradeStops,
    cargo
  };
}

function parseShipTradeStops(data: Stream, n: number): ShipTradeStop[] {
  const tradeStops = [];
  for (let i = 0; i < n; i++) {
    tradeStops.push({
      id: data.read8(),
      kontor_id: data.read8(),
      _1: data.read16(),
      goods: parseShipGoods(data, 2),
      _2: data.read(16)
    });
  }
  return tradeStops;
}

function parseShipGoods(data: Stream, n: number): ShipGood[] {
  const cargo = [];
  for (let i = 0; i < n; i++) {
    cargo.push({
      good_id: data.read16(),
      amount: data.read16(),
      action: data.read32() // 0 == 'load', 1 == 'unload'
    });
  }
  return cargo;
}
