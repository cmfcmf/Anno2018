/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";

export default class Task {
    public static fromSaveGame(data: Stream) {
        // TODO: The parsing here is most likely incorrect.
        const playerId = data.read32();
        data.read(100);
        const text = data.readString(2140);

        return new Task(playerId, text);
    }

    constructor(
        public readonly playerId: number,
        public readonly text: string,
    ) { }
}
