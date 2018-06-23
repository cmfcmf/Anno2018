/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import * as assert from "assert";
import Stream from "../stream";
import {AnnoMap} from "./anno-map";
import IslandLoader from "./island-loader";

interface Block { type: string; length: number; }

export interface Island {
    width: number;
    height: number;
    default_fields: IslandField[][];
    current_fields: IslandField[][];

    num: number;
    x: number;
    y: number;
    num_ore_locations: number;
    fertility_discovered: number;
    ore_locations: [IslandOreLocation, IslandOreLocation];
    fertility: number;
    num_base_island: number;
    is_south: boolean;
    diff: number;

    _1: number;
    _2: number;
    _3: number;
    _4: number[];
    _5: number[];
    _6: number;
    _7: number;
    _8: number;
    _9: number[];
}

interface IslandOreLocation {
    type: number;
    x: number;
    y: number;
    discovered: number;
    _1: number;
}

export interface IslandField {
    fieldId: number;
    x: number;
    y: number;
    rotation: number;
    ani: number;
    _1: number;
    status: number;
    random: number;
    player: number;
    _2: number;
}

interface ShipGood {
    good_id: number;
    amount: number;
    action: number;
}

interface ShipTradeStop {
    id: number;
    kontor_id: number;
    _1: number;
    goods: ShipGood[];
    _2: number[];
}

export interface Ship {
    name: string;
    position: {
        x: number,
        y: number,
    };
    _1: number[];
    course_from: number;
    course_to: number;
    course_current: number;
    _2: number;
    hp: number;
    _3: number;
    canons: number;
    flags: number;
    sell_price: number;
    id: number;
    type: number;
    _4: number;
    player: number;
    _5: number;
    rotation: number;
    trade_stops: ShipTradeStop[];
    _6: number;
    cargo: ShipGood[];
}

export default class GAMParser {
    constructor(private islandLoader: IslandLoader) { }

    public async parse(data: Stream) {
        const islands: Island[] = [];
        let ships: Ship[] = [];
        const debugTypes: Set<string> = new Set<string>();

        while (!data.eof()) {
            const block = this.readBlock(data);
            const oldPosition = data.position();

            switch (block.type) {
                case "INSEL5": {
                    const island = this.parseIsland(data);
                    // TODO: What does diff stand for?
                    if (island.diff === 0) {
                        const islandFile = await this.islandLoader.load(island);
                        const islandBasisBlock = this.readBlock(islandFile);
                        this.discardBlock(islandBasisBlock, islandFile);

                        const islandBuildingsBlock = this.readBlock(islandFile);
                        island.default_fields = this.parseIslandBuildings(island, islandBuildingsBlock, islandFile);
                    }
                    islands.push(island);
                    break;
                } case "INSELHAUS": {
                    const island = islands.pop();
                    island.current_fields = this.parseIslandBuildings(island, block, data);
                    islands.push(island);
                    break;
                } case "SHIP4":
                    assert.strictEqual(ships.length, 0);
                    ships = this.parseShips(block, data);
                    break;
                default:
                    this.discardBlock(block, data);
                    break;
            }

            assert.strictEqual(data.position(), oldPosition + block.length);

            debugTypes.add(block.type);
        }

        console.log(debugTypes);

        return new AnnoMap(islands, ships);
    }

    private parseShips(block: Block, data: Stream) {
        const ships = [];
        const startPos = data.position();
        while (data.position() < startPos + block.length) {
            ships.push(this.parseShip(data));
        }
        return ships;
    }

    private parseShip(data: Stream): Ship {
        return {
            name: data.readString(28),
            position: {
                x: data.read16(),
                y: data.read16(),
            },
            _1: data.read(3 * 4),
            course_from: data.read32(),
            course_to: data.read32(),
            course_current: data.read32(),
            _2: data.read32(),
            hp: data.read16(),
            _3: data.read32(),
            canons: data.read8(),
            flags: data.read8(),
            sell_price: data.read16(),
            id: data.read16(),
            type: data.read16(),
            _4: data.read8(),
            player: data.read8(),
            _5: data.read32(),
            rotation: data.read16(),
            trade_stops: this.parseShipTradeStops(data, 8),
            _6: data.read16(),
            cargo: this.parseShipGoods(data, 8),
            // type_name: SHIP_TYPES[ship['type']],
        };
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

    private parseIsland(data: Stream): Island {
        return {
            num: data.read8(),
            width: data.read8(),
            height: data.read8(),
            _1: data.read8(),
            x: data.read16(),
            y: data.read16(),
            _2: data.read16(),
            _3: data.read16(),
            _4: data.read(14),
            num_ore_locations: data.read8(),
            fertility_discovered: data.read8(),
            ore_locations: [this.parseIslandOreLocation(data), this.parseIslandOreLocation(data)],
            _5: data.read(48),
            fertility: data.read8(),
            _6: data.read8(),
            _7: data.read16(),
            num_base_island: data.read16(),
            _8: data.read16(),
            is_south: data.read8Bool(),
            diff: data.read8(),
            _9: data.read(14),
            default_fields: [],
            current_fields: [],
        };
    }

    private parseIslandOreLocation(data: Stream): IslandOreLocation {
        return {
            type: data.read8(),
            x: data.read8(),
            y: data.read8(),
            discovered: data.read8(),
            _1: data.read32(),
        };
    }

    private parseIslandBuildings(island: Island, block: Block, data: Stream): IslandField[][] {
        const dataLength = block.length;

        const fields: IslandField[][] = [];
        for (let x = 0; x < island.width; x++) {
            fields.push([]);
            for (let y = 0; y < island.height; y++) {
                fields[x].push({
                    fieldId: 0xFFFF,
                    x: 0, // x relative to the building's origin
                    y: 0, // y relative to the building's origin
                } as IslandField);
            }
        }

        for (let i = 0; i < dataLength / 8; i++) {
            const field = this.parseIslandField(data);
            assert(field.x < island.width);
            assert(field.y < island.height);

            const buildingId = field.fieldId;
            if (buildingId !== 0xFFFF) {
                fields[field.x][field.y] = field;
            }
        }

        return fields;
    }

    private parseIslandField(data: Stream): IslandField {
        const buildingId = data.read16() + 20000;
        const x = data.read8();
        const y = data.read8();
        const bits = data.read32();

        return {
            fieldId: buildingId,
            // x and y are relative to the island's origin
            x: x,
            y: y,

            // TODO: Verify bitmasks are correct
            rotation: (bits & 3),
            ani: (bits >> 2) & 0xF,
            _1: (bits >> 6) & 0xFF,
            status: (bits >> 14) & 7,
            random: (bits >> 17) & 0x1F,
            player: (bits >> 22) & 7,
            _2: (bits >> 25) & 0x7F,
        };
    }

    private readBlock(data: Stream): Block {
        return {
            type: data.readString(16),
            length: data.read32(),
        };
    }

    private discardBlock(block: Block, data: Stream) {
        data.read(block.length);
    }
}
