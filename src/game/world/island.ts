/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { Point, Rectangle } from "pixi.js";
import Stream from "../../parsers/stream";
import assert from "../../util/assert";
import Field from "./field";
import { OreLocation } from "./island-ore-location";

enum IslandFertilityFlags {
  TOBACCO = 1,
  SUGARCANE = 3,
  WINE = 5,
  COTTON = 4,
  CACAO = 6,
  SPICE = 2
}

export interface IslandFertility {
  tobacco: boolean;
  sugarcane: boolean;
  wine: boolean;
  cotton: boolean;
  cacao: boolean;
  spice: boolean;
}

export type Island = ReturnType<typeof islandFromSaveGame>;

export function islandFromIsland3File(
  id: number,
  position: Point,
  isSouth: boolean,
  numBaseIsland: number,
  data: Stream
): Island {
  data.read8(); // Ignore id
  const size = new Point(data.read8(), data.read8());

  return {
    id,
    position,
    size,
    positionRect: new Rectangle(position.x, position.y, size.x, size.y),
    numBaseIsland,
    numOreLocations: 0,
    oreLocations: [],
    fertility: {
      tobacco: false,
      sugarcane: false,
      wine: false,
      cotton: false,
      cacao: false,
      spice: false
    },
    isSouth,
    differsFromBaseIsland: false,
    fertilityDiscovered: false,
    baseFields: [],
    topFields: []
  };
}

export function islandFromIsland4File(
  id: number,
  position: Point,
  isSouth: boolean,
  numBaseIsland: number,
  data: Stream
): Island {
  return islandFromIsland3File(id, position, isSouth, numBaseIsland, data);
}

export function islandFromIsland5File(
  id: number,
  position: Point,
  isSouth: boolean,
  numBaseIsland: number,
  data: Stream
): Island {
  return islandFromIsland3File(id, position, isSouth, numBaseIsland, data);
}

export function islandFromSaveGame(data: Stream) {
  const id = data.read8();
  const width = data.read8();
  const height = data.read8();
  /*
    uint8      strtduerrflg:1;
    uint8      nofixflg:1;
    uint8      vulkanflg:1;
     */
  const _1 = data.read8();
  const x = data.read16();
  const y = data.read16();

  const hirschreviercnt = data.read16();
  const speedcnt = data.read16();
  // the order in which players built their cities on this island
  // is 7, 7, 7, 7, 7, 7, 7, 7, by default
  // fills up from the beginning with player ids once a player builds a kontor.
  // natives are also listed; islands with natives start with 6, 7, 7, ...
  const stadtplayernr = data.read(8);

  assert(data.read(3).every(e => e === 0));

  const vulcanoCount = data.read8();
  const treasureFlag = data.read8Bool();
  const rohstanz = data.read8();

  const numOreLocations = data.read8();
  const fertilityDiscovered = data.read8();
  const oreLocations = [
    OreLocation.fromSaveGame(data),
    OreLocation.fromSaveGame(data)
  ];
  // These look like even more ore locations.
  const _5 = data.read(48);

  const fertility = parseFertility(data.read32());
  const numBaseIsland = data.read16();

  // unsure
  const sizenr = data.read16();

  const isSouth = data.read8Bool();
  const differsFromBaseIsland = data.read8Bool();

  // unsure
  const duerrproz = data.read8();
  // unsure
  const rotier = data.read8();

  const seeplayerflags = data.read32(); // 1 nach bloßem Vorbeifahren (= zeigt Eingebohrene), 0xFF nach Kontorbau

  // unsure
  const duerrcnt = data.read32();

  assert(data.read32() === 0);

  const baseFields: Field[][] = [];
  const topFields: Array<Array<Field | null>> = [];

  return {
    id,
    position: new Point(x, y),
    size: new Point(width, height),
    positionRect: new Rectangle(x, y, width, height),
    numBaseIsland,
    numOreLocations,
    oreLocations,
    fertility,
    isSouth,
    differsFromBaseIsland,
    fertilityDiscovered: fertilityDiscovered !== 0,
    baseFields,
    topFields
  };

  // island.debug = {
  //    _1,
  //    _5,
  //    hirschreviercnt,
  //    speedcnt,
  //    stadtplayernr,
  //    vulcanoCount,
  //    treasureFlag,
  //    rohstanz,
  //
  //    sizenr,
  //    duerrproz,
  //    rotier,
  //
  //    seeplayerflags,
  //    duerrcnt,
  // };
  // console.log(island.debug);
}

function parseFertility(fertility: number): IslandFertility {
  return {
    tobacco: (fertility & (1 << IslandFertilityFlags.TOBACCO)) > 0,
    sugarcane: (fertility & (1 << IslandFertilityFlags.SUGARCANE)) > 0,
    wine: (fertility & (1 << IslandFertilityFlags.WINE)) > 0,
    cotton: (fertility & (1 << IslandFertilityFlags.COTTON)) > 0,
    cacao: (fertility & (1 << IslandFertilityFlags.CACAO)) > 0,
    spice: (fertility & (1 << IslandFertilityFlags.SPICE)) > 0
  };
}
