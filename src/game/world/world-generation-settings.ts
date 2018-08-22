/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { IslandSizeId } from "../../parsers/GAM/island-loader";
import Stream from "../../parsers/stream";
import assert from "../../util/assert";

export interface IslandTemplate {
  num: number;
  size: 0 | 1 | 2 | 3 | 4;
  position: PIXI.Point;
  climate: "NORTH" | "SOUTH" | "ANY";
}

export default class WorldGenerationSettings {
  public static fromSaveGame(data: Stream) {
    const _1 = data.slice(100);

    const numNativesNorth = _1[64];
    const numNativesSouth = _1[68];

    const numIslands = data.read32();

    const _2 = data.slice(268);

    const numBigIronOre = _2[46]; // Erzberg:    ERZBERG_GROSS, 6
    const numSmallIronOre = _2[54]; // Erzberg:    ERZBERG_KLEIN, 8
    const numGoldOre = _2[62];

    const numWine = _2[110]; // Ware:       WEINTRAUBEN, 4
    const numSugarCane = _2[95]; // Ware:       ZUCKERROHR, 3
    const numSpice = _2[86]; // Ware:       GEWUERZBAUM, 2
    const numCacao = _2[118]; // Ware:       KAKAOBAUM, 2
    const numTobacco = _2[78]; // Ware:       TABAKBAUM, 3
    const numCotton = _2[102]; // Ware:       BAUMWOLLE, 3

    const numTreasures = _2[174]; // Schatz:     10

    const islandTemplates: IslandTemplate[] = [];
    for (let i = 0; i < numIslands; i++) {
      const flags = data.read8();
      const forceNorth = flags === 0;
      const forceSouth = flags === 1;
      const islandSize = data.read8(); // 0...4, where 0 is small and 4 is large.
      if (islandSize < 0 || islandSize > 4) {
        throw new Error(`Invalid island size category: ${islandSize}.`);
      }
      assert(data.read8() === 0x0000);
      const num = data.read8();
      const fileNr = data.read32(); // Largely uninteresting, mostly 0x0000FFFF, sometimes 0x00000000
      const position = new PIXI.Point(data.read32(), data.read32());
      islandTemplates.push({
        num,
        size: islandSize as IslandSizeId,
        position: position,
        climate: forceNorth ? "NORTH" : forceSouth ? "SOUTH" : "ANY"
      });
    }
    for (const each of data.slice(data.length - data.position())) {
      assert(each === 0);
    }

    // function dbg(arr: Uint8Array) {
    //    let debug = "";
    //    for (const each of arr) {
    //        debug += `${each}\n`;
    //    }
    //    console.log(debug);
    // }
    // dbg(_1);
    // dbg(_2);

    return new WorldGenerationSettings(
      numNativesNorth,
      numNativesSouth,
      numBigIronOre,
      numSmallIronOre,
      numGoldOre,
      numWine,
      numSugarCane,
      numSpice,
      numCacao,
      numTobacco,
      numCotton,
      numTreasures,
      islandTemplates
    );
  }

  public static empty() {
    return new WorldGenerationSettings(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, []);
  }

  constructor(
    public readonly numNativesNorth: number,
    public readonly numNativesSouth: number,
    public readonly numBigIronOre: number,
    public readonly numSmallIronOre: number,
    public readonly numGoldOre: number,
    public readonly numWine: number,
    public readonly numSugarCane: number,
    public readonly numSpice: number,
    public readonly numCacao: number,
    public readonly numTobacco: number,
    public readonly numCotton: number,
    public readonly numTreasures: number,
    public readonly islandTemplates: IslandTemplate[]
  ) {}
}
