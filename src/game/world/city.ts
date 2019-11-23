/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";

export type City = ReturnType<typeof cityFromSaveGame>;

export function cityFromSaveGame(data: Stream) {
  const islandId = data.read8();
  const cityIslandNum = data.read8();
  const playerId = data.read16();
  const progressAllowed = !data.read8Bool();
  const lastMeldNr = data.read8();
  const stimmung = data.read16();
  const einkauf = data.read32();
  const verkauf = data.read32();
  const tragedyCnt = data.read32();
  const marketCnt = data.read32(); // definitely not, always 0
  const playerCredit = data.read(16, 4);
  const wohnRes = data.read32();
  const inhabitants = [];
  for (let i = 0; i < 5; i++) {
    inhabitants.push(data.read32());
  }
  const _2 = data.read(15);
  const taxes = [];
  for (let i = 0; i < 5; i++) {
    taxes.push(data.read8());
  }
  const _3 = data.read(3);
  const name = data.readString(33);

  return {
    islandId,
    playerId,
    cityIslandNum,
    progressAllowed,
    inhabitants,
    taxes,
    name,

    // Very unsure about these
    marketCnt,
    lastMeldNr,
    stimmung,
    einkauf,
    verkauf,
    tragedyCnt,
    playerCredit,
    wohnRes
  };
}
