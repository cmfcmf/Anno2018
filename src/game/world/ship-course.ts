/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import assert from "browser-assert";
import Stream from "../../parsers/stream";

export enum CourseState {
    Stopped = 0x00,
    Sailing = 55,
    Unknown = 53,
    Unknown2 = 52,
    Unknown3 = 54,
}

export class ShipCourse {
    public static fromSaveGame(data: Stream) {
        const num = data.read32();
        const byte1 = (num >>  0) & 0xFF;
        const byte2 = (num >>  8) & 0xFF;
        const byte3 = (num >> 16) & 0xFF;
        const byte4 = (num >> 24) & 0xFF;

        const state: CourseState = byte1;
        assert(state in CourseState);

        const position = new PIXI.Point(
            byte4 + ((byte2 & 0b00001111) << 8),
            byte3 + ((byte2 & 0b11110000) << 4),
        );

        return new ShipCourse(position, state);
    }

    constructor(
        public readonly position: PIXI.Point,
        public readonly state: CourseState,
    ) { }
}
