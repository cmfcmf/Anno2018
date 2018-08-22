import Stream from "../../parsers/stream";
import assert from "../../util/assert";

enum PlayerEventKind {}
// TODO

export default class PlayerEvent {
  public static fromSaveGame(data: Stream) {
    const kind = data.read8();
    const otherPlayerId = data.read8();
    assert(data.read16() === 0);
    const time = data.read32(); // TODO: Which unit is time in?

    return new PlayerEvent(kind, otherPlayerId, time);
  }

  constructor(
    public readonly kind: PlayerEventKind,
    public readonly otherPlayerId: number,
    public readonly time: number
  ) {}
}
