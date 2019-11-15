/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { Point } from "pixi.js";
import Stream from "../../parsers/stream";
import assert from "../../util/assert";

export class Producer {
  public islandId: number;
  public position: Point;

  /**
   * The amount of goods already produced and waiting for pickup.
   */
  public stock: number;
  // The amount of primary input goods waiting to be used.
  // They are only "taken" when an output good is finished.
  public firstGoodStock: number;
  // The amount of secondary input goods waiting to be used (normally wood).
  // This is 0 for buildings which don't use secondary goods.
  // They are only "taken" when an output good is finished.
  public secondGoodStock: number;

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
  public timer: number;
  public prodCount: number;
  public timeCount: number;
  public howMuchIsBeingProduced: number;

  private goodWasProduced: number;
  private speedCnt: number;

  public static load(data: Stream) {
    const p = new Producer();

    p.islandId = data.read8();
    p.position = new Point(data.read8(), data.read8());
    data.read8();

    p.speedCnt = data.read8() & 0b111;
    p.stock = data.read16();
    data.read8();

    p.timer = data.read16();
    p.secondGoodStock = data.read16();

    p.firstGoodStock = data.read16();
    data.read8();
    p.howMuchIsBeingProduced = data.read8();

    p.prodCount = data.read16();
    p.timeCount = data.read16();

    const flags = data.read8();
    p.setActive(!!(flags & (1 << 0)));
    p.setAnimCount((flags >> 2) & 0b1111);
    p.setGoodsAllowedForPickup((flags & (1 << 6)) === 1);
    if (flags & (1 << 1)) {
      p.goodWasProduced |= 1 << 6;
    } else {
      p.goodWasProduced &= ~(1 << 6);
    }

    p.setGoodWasProducedTimer(data.read8() & 0b1111);
    assert(data.read16() === 0);

    return p;
  }

  public save(stream: Stream) {
    stream.write8(this.islandId);
    stream.write8(this.position.x);
    stream.write8(this.position.y);
    stream.write8(0);

    stream.write8(this.speedCnt & 0b111);
    stream.write16(this.stock);
    stream.write8(0);

    stream.write16(this.timer);
    stream.write16(this.secondGoodStock);

    stream.write16(this.firstGoodStock);
    stream.write8(0);
    stream.write8(this.howMuchIsBeingProduced);

    stream.write16(this.prodCount);
    stream.write16(this.timeCount);

    const flags =
      ((this.isActive() ? 0b1 : 0b0) << 0) |
      (((this.goodWasProduced >> 6) & 1) << 1) |
      (this.getAnimCount() << 2) |
      ((this.goodsAllowedForPickup() ? 0b1 : 0b0) << 6);
    stream.write8(flags);
    stream.write8(this.getGoodWasProducedTimer());
    stream.write16(0);
  }

  public isProducing() {
    return !!(this.goodWasProduced & (1 << 7));
  }

  public isActive() {
    return !!(this.speedCnt & (1 << 3));
  }

  public setActive(active: boolean) {
    if (active) {
      this.speedCnt |= 1 << 3;
    } else {
      this.speedCnt &= ~(1 << 3);
    }
  }

  public goodsAllowedForPickup() {
    return !!(this.goodWasProduced & (1 << 4));
  }

  public setGoodsAllowedForPickup(value: boolean) {
    if (value) {
      this.goodWasProduced |= 1 << 4;
    } else {
      this.goodWasProduced &= ~(1 << 4);
    }
  }

  public stockAsInt() {
    return this.stock >>> 5;
  }

  public firstGoodStockAsInt() {
    return this.firstGoodStock >>> 5;
  }

  public secondGoodStockAsInt() {
    return this.secondGoodStock >>> 5;
  }

  /**
   * timer that counts up and is reset whenever a good is produced
   */
  public getGoodWasProducedTimer() {
    return this.goodWasProduced & 0b1111;
  }

  public setGoodWasProducedTimer(value: number) {
    assert(value >= 0 && value <= 0b1111);
    this.goodWasProduced =
      (this.goodWasProduced & 0b11110000) | (value & 0b1111);
  }

  public getAnimCount() {
    return (this.speedCnt >> 4) & 0b1111;
  }

  public setAnimCount(value: number) {
    assert(value >= 0 && value <= 0b1111);
    this.speedCnt = (this.speedCnt & 0b1111) | (value << 4);
  }
}
