/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { Point } from "pixi.js";
import Stream from "../../parsers/stream";
import { Rotation8 } from "./world";

export enum SoldierType {
  Swordsman = 0,
  Cavalry = 1,
  Musketeer = 2,
  Gunner = 3,
  Native = 8
}

export type Soldier = ReturnType<typeof soldierFromSaveGame>;

export function soldierFromSaveGame(data: Stream) {
  const position = new Point(data.read16() / 2, data.read16() / 2);
  const hp = data.read16();
  const type = data.read16();
  const id = data.read16();
  const course1 = data.read(4);
  const _1 = data.read16();
  const _2 = data.read16();
  const _3 = data.read8();
  const _4 = data.read8();
  const _5 = data.read32();
  const playerId = data.read8();
  const _6 = data.read8();
  const _7 = data.read8();
  const rotation = data.read8() as Rotation8;
  const _8 = data.read8();
  const isPatrolling = data.read8Bool();
  const course2 = data.read(4);
  const course3 = data.read(4);
  const empty = data.read(30);

  return {
    id,
    playerId,
    type,
    position: position,
    rotation,
    isPatrolling,
    hp
  };
}
