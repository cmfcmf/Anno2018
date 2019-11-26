import Stream from "../../parsers/stream";
import { Point } from "pixi.js";
import assert from "../../util/assert";

export class FarmField {
  public islandId: number;
  public position: Point;
  public cntGrowthTimerIdx: number;
  public lastGrowthCntWhenFieldHasGrown: number;
  public animCnt: number;

  public static load(stream: Stream) {
    const f = new FarmField();

    f.islandId = stream.read8();
    f.position = new Point(stream.read8(), stream.read8());
    f.cntGrowthTimerIdx = stream.read8();
    assert(f.cntGrowthTimerIdx >= 0 && f.cntGrowthTimerIdx <= 32);
    f.lastGrowthCntWhenFieldHasGrown = stream.read8();

    // The animCnt must always be overwritten with the anim property of the
    //  Field at the same position. If we do not overwrite it, this is always 0
    // for missions created with the Editor.
    f.animCnt = stream.read8();
    assert(stream.read16() === 0);

    return f;
  }

  public save(stream: Stream) {
    throw new Error("Not implemented");
  }
}
