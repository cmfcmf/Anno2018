/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import assert from "../../util/assert";

export type Timers = ReturnType<typeof timersFromSaveGame>;

export function timersFromSaveGame(data: Stream) {
  const cntCity = data.read8();
  const cntIsland = data.read8();
  const cntShipyard = data.read8();
  const cntMilitary = data.read8();
  const cntProduction = data.read8();
  data.read(31 + 32);
  const cntSettlers = data.read(8, 4);
  const cntGrowth = data.read(8, 4);

  const timeCity = data.read32();
  const timeIsland = data.read32();
  const timeShipyard = data.read32();
  const timeMilitary = data.read32();
  const timeProduction = data.read32();
  const timeGoodToolsCnt = data.read32();
  const timeGoodToolsMax = data.read32();
  const timeGame = data.read32(); // Incremented every 100ms

  const noErzOutFlg = data.read8();
  const tutorFlg = data.read8();
  const aiLevel = data.read8();
  const missionNumber = data.read8();

  const flags = data.read32();
  const enableTrader = (flags & (1 << 6)) === 0;
  const bigIronRunsOut = (flags & (1 << 3)) === 0;
  const enableDroughts = (flags & (1 << 2)) === 0; // TODO: Does not appear to be working for endless games.
  const enablePirate = (flags & (1 << 0)) === 0;
  const enableVulcano = (flags & (1 << 8)) === 0;

  const gameId = data.read32();
  const cityNameNumber = data.read32();
  const timeNextDrought = data.read32();
  const timePirateSec = data.read32();
  const missionSubNumber = data.read32();
  const shipMax = data.read32();

  // vulcano
  data.read(4);
  // vulcano 2
  data.read(4);

  const timeNextVulcano = data.read32();
  const cntVulcano = data.read32();

  data.read(17 + 32, 4);
  // assert(data.read(17 + 32, 4).every((e) => e === 0));
  const timeSettlers = data.read(32, 4);
  const timeGrowth = data.read(32, 4);

  const timers = {
    /**
     * Range: 0 to 7
     * Update: Every 10 ticks (100 game time)
     * Influence: ???
     */
    cntCity,
    /**
     * Range: 0 to 7
     * Update: Every 30 ticks (300 game time)
     * Influence: ???
     */
    cntIsland,
    /**
     * Range: 0 to 7
     * Updaste: Every tick (10 game time)
     * Influence: ???
     */
    cntShipyard,
    /**
     * Range: 0 to 7
     * Updaste: Every tick (10 game time)
     * Influence: ???
     */
    cntMilitary,
    /**
     * Range: 0 to 7
     * Update: Every tick (10 game time)
     * Influence: Whenever the timer reaches 0, all production buildings which are currently not producing
     *            but active check if enough input goods have arrived in the meantime.
     */
    cntProduction,

    cntSettlers,
    cntGrowth,
    timeCity,
    timeIsland,
    timeShipyard,
    timeMilitary,
    /**
     * Increments by at most 200, but sometimes less (it likely depends on PC
     * speed). Whenever it reaches at least 1000, cntProduction is incremented.
     */
    timeProduction,
    timeGoodToolsCnt,
    timeGoodToolsMax,
    timeGame,
    noErzOutFlg,
    tutorFlg,
    aiLevel,
    missionNumber,
    gameId,
    cityNameNumber,
    timeNextDrought,
    timePirateSec,
    missionSubNumber,
    shipMax,
    timeNextVulcano,
    cntVulcano,
    timeSettlers,
    timeGrowth,
    enableTrader,
    bigIronRunsOut,
    enableDroughts,
    enablePirate,
    enableVulcano
  };
  console.log(timers);

  return timers;
}
