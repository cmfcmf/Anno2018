import { Point } from "pixi.js";
import Stream from "../../parsers/stream";

export class House {
  public islandId: number;
  public position: Point;
  public inhabitantLevel: number;

  public static load(stream: Stream) {
    const h = new House();
    h.islandId = stream.read8();
    h.position = new Point(stream.read8(), stream.read8());
    const speedCnt = stream.read8();

    const stadtCnt = stream.read8();
    h.inhabitantLevel = stream.read8();
    const marketDistance = stream.read8();
    stream.read8();

    const anz = stream.read16();
    const flags1 = stream.read8();
    const flags2 = stream.read8();

    stream.read32();

    return h;
  }
}
