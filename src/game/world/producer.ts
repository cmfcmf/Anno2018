/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import assert from "../../util/assert";

export type Producer = Readonly<ReturnType<typeof producerFromSaveGame>>;

export function producerFromSaveGame(data: Stream) {
  const islandId = data.read8();
  const position = new PIXI.Point(data.read8(), data.read8());
  const speed = data.read8();
  const speedCount = data.read8();
  const stock = data.read16() / 32;

  data.read8();

  const timer = data.read16();

  const secondGoodStock = data.read16() / 32;
  const firstGoodStock = data.read16() / 32;

  data.read8();

  const producedGood = data.read8();

  // The following two values are used to calculate the "Auslastung"

  // Increased by 32 whenever "stock" is increased.
  const prodCnt = data.read16() / 32;
  const timeCnt = data.read16();

  const flags1 = data.read8();
  const active = (flags1 & (1 << 0)) > 0;
  const connectedToMarket = (flags1 & (1 << 1)) > 0;

  const animCnt = (flags1 >> 2) & 0b1111;
  const allowGoodPickup = (flags1 & (1 << 6)) === 0;

  const noGoodCnt = data.read8() & 0b1111;
  assert(data.read16() === 0);

  return {
    // The island id.
    islandId,
    // The position relative to the island.
    position,
    /*
      > BYTE speed; //  Welcher Speedzähler (MAXWACHSSPEEDKIND)
      > immer 0

      Always 0 in a big savegame.
    */
    speed,
    /*
      > UINT speedcnt:8; //  Wenn (Zeitzähler == Speedzähler) timer++ (MAXROHWACHSCNT)
      > 0x07, 0x05, 0x04, 0x03, 0x00 (irgendetwas, blockweise konstant, unterscheidet sich pro Spielstand maximal um 1)

      Always runs from 0 to 7 and repeats.
      It appears to be synchronized across all buildings and was the same value for all buildings in a big savegame.
      It is equal to the global "timers.cntProduction".
    */
    speedCount,

    /**
     * The amount of goods already produced and waiting for pickup.
     */
    stock,

    /**
     * The timer is decremented every second, regardless of whether or not
     * the building has enough input goods to produce something. Once it would reach 0
     * (i.e., the timer never actually reaches 0):
     * If there are enough input goods to produce an output good (= producedGood is 128):
     *   - the timer is set to "HAUS_PRODTYP.Interval"
     *   - "stock" is incremented
     *   - "firstGoodStock" is decremented by "HAUS_PRODTYP.Rohmenge"
     *   - "secondGoodStock" ???
     *   - "noGoodCnt" is set to 0
     * If there are NOT enough goods (= producedGood is not 128):
     *   - it is set to 11 (at least for "Webstube")
     *   - "noGoodCnt" is increased (up to a maximum of 15)
     *
     * Whenever new input goods are delivered and there were previously not enough
     * input goods to create output goods, the timer is immediately set to
     * "HAUS_PRODTYP.Interval" ??
     *
     * I am unsure why the timer is running even when no goods are currently being
     * produced.
     */
    timer,

    // The amount of primary input goods waiting to be used.
    // They are only "taken" when an output good is finished.
    firstGoodStock,
    // The amount of secondary input goods waiting to be used (normally wood).
    // This is 0 for buildings which don't use secondary goods.
    // They are only "taken" when an output good is finished.
    secondGoodStock,

    producedGood,
    prodCnt,
    timeCnt,
    active,

    /**
     * Appears to always be false.
     * In a big savegame, this was true only for a single building: One of the native HQs.
     */
    connectedToMarket,

    // Always 0 for a "Webstube"
    animCnt,
    allowGoodPickup,

    /**
     * Increased up to a maximum of 15 whenever "timer" reaches 0 and no good could be produced,
     * otherwise set to 0.
     * Once it reaches (4?) the "no input goods" symbol is displayed above the building.
     */
    noGoodCnt
  };
}
