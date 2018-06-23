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
        const state = data & 0xFF;
        console.log(state);
        assert(state in CourseState);
        this.state = state;

        const byte2 = (data >> 8) & 0xFF;
        const byte3 = (data >> 16) & 0xFF;
        const byte4 = (data >> 24) & 0xFF;

        this.position = new PIXI.Point(
            byte4 + ((byte2 & 0b00001111) << 8),
            byte3 + ((byte2 & 0b11110000) << 4),
        );
    }
}
