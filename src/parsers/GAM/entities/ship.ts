import Stream from "../../stream";
import {ShipCourse} from "./ship-course";

export interface ShipGood {
    good_id: number;
    amount: number;
    action: number;
}

export interface ShipTradeStop {
    id: number;
    kontor_id: number;
    _1: number;
    goods: ShipGood[];
    _2: number[];
}

export default class Ship {
    public readonly name: string;
    public readonly position: {
      x: number,
      y: number,
    };
    public readonly _1: number[];
    public readonly courseFrom: ShipCourse;
    public readonly courseTo: ShipCourse;
    public readonly courseCurrent: ShipCourse;
    public readonly _2: number;
    public readonly hp: number;
    public readonly _3: number;
    public readonly canons: number;
    public readonly flags: number;
    public readonly sellingPrice: number;
    public readonly id: number;
    public readonly type: number;
    public readonly _4: number;
    public readonly player: number;
    public readonly _5: number;
    public readonly rotation: number;
    public readonly tradeStops: ShipTradeStop[];
    public readonly _6: number;
    public readonly cargo: ShipGood[];

    constructor(data: Stream) {
        this.name = data.readString(28),
        this.position = new PIXI.Point(data.read16(), data.read16());
        this._1 = data.read(3 * 4);

        this.courseFrom = new ShipCourse(data.read32());
        this.courseTo = new ShipCourse(data.read32());
        this.courseCurrent = new ShipCourse(data.read32());

        this._2 = data.read32();
        this.hp = data.read16();
        this._3 = data.read32();
        this.canons = data.read8();
        this.flags = data.read8();
        this.sellingPrice = data.read16();
        this.id = data.read16();
        this.type = data.read16();
        this._4 = data.read8();
        this.player = data.read8();
        this._5 = data.read32();
        this.rotation = data.read16();
        this.tradeStops = this.parseShipTradeStops(data, 8);
        this._6 = data.read16();
        this.cargo = this.parseShipGoods(data, 8);
        // type_name = SHIP_TYPES[ship['type']],
    }

    private parseShipTradeStops(data: Stream, n: number): ShipTradeStop[] {
        const tradeStops = [];
        for (let i = 0; i < n; i++) {
            tradeStops.push({
                id: data.read8(),
                kontor_id: data.read8(),
                _1: data.read16(),
                goods: this.parseShipGoods(data, 2),
                _2: data.read(16),
            });
        }
        return tradeStops;
    }

    private parseShipGoods(data: Stream, n: number): ShipGood[] {
        const cargo = [];
        for (let i = 0; i < n; i++) {
            cargo.push({
                good_id: data.read16(),
                amount: data.read16(),
                action: data.read32(), // 0 == 'load', 1 == 'unload'
            });
        }
        return cargo;
    }
}
