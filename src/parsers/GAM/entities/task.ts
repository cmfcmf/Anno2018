/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../stream";

export default class Task {
    public readonly playerId: number;
    public readonly text: string;

    constructor(data: Stream) {
        this.playerId = data.read32();
        data.read(100);
        this.text = data.readString(2140);
    }
}
