/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import * as assert from "assert";

export enum CourseState {
    Stopped = 0x00,
    Sailing = 55,
    Unknown = 53,
    Unknown2 = 52,
    Unknown3 = 54,
}

export class ShipCourse {
    public readonly position: PIXI.Point;
    public readonly state: CourseState;

    constructor(data: number) {
        const byte1 = (data >>  0) & 0xFF;
        const byte2 = (data >>  8) & 0xFF;
        const byte3 = (data >> 16) & 0xFF;
        const byte4 = (data >> 24) & 0xFF;

        assert(byte1 in CourseState);
        this.state = byte1;

        this.position = new PIXI.Point(
            byte4 + ((byte2 & 0b00001111) << 8),
            byte3 + ((byte2 & 0b11110000) << 4),
        );
    }
}
