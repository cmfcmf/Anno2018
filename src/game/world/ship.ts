/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { Point } from "pixi.js";
import Stream from "../../parsers/stream";
import { ShipCourse } from "./ship-course";
import { Rotation8 } from "./world";

/**
 * # Animation Notes
 *
 * There are the following flags:
 * FAHNE1, FAHNE2, FAHNE3, FAHNE4 and FAHNEWEISS
 *
 * and these ships:
 * HANDEL1, HANDEL2, HANDELD1, HANDELD2
 * KRIEG1, KRIEG2, KRIEGD1, KRIEGD2
 *
 * HANDLER, HANDLERD
 * PIRAT, PIRATD
 *
 */

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

export const SHIP_TYPES = {
  0x15: "HANDEL1",
  0x17: "HANDEL2",
  0x19: "KRIEG1",
  0x1b: "KRIEG2",
  0x1d: "HANDLER",
  0x1f: "PIRAT",
  0x25: "HANDLER" // TODO, Why is this duplicated?
};

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
  const kind = data.read8(); // ?
  const playerId = data.read8();
  const _5 = data.read32();
  const rotation = data.read16() as Rotation8;
  const tradeStops = parseShipTradeStops(data, 8);
  const _6 = data.read16();
  const cargo = parseShipGoods(data, 8);

  return {
    id,
    type,
    kind,
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
