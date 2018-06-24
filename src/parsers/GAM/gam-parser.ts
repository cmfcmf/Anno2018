/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import * as assert from "assert";
import Stream from "../stream";
import {AnnoMap} from "./anno-map";
import Good from "./entities/good";
import Player from "./entities/player";
import Ship from "./entities/ship";
import Task from "./entities/task";
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

export interface Kontor {
    island: number;
    position: PIXI.Point;
    player: number;
    goods: Good[];
}

export default class GAMParser {
    constructor(private islandLoader: IslandLoader) { }

    public async parse(data: Stream) {
        const islands: Island[] = [];
        let kontors: Kontor[] = [];
        let ships: Ship[] = [];
        let players: Player[] = [];
        const debugTypes: Set<string> = new Set<string>();
        let task: Task;
        let gameName: string;

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
                case "KONTOR2":
                    assert.strictEqual(kontors.length, 0);
                    kontors = this.parseKontors(block, data);
                    break;
                case "PLAYER4":
                    assert.strictEqual(players.length, 0);
                    players = this.parsePlayers(block, data);
                    break;
                case "AUFTRAG4":
                    assert.strictEqual(task, undefined);
                    if (block.length > 0) {
                        task = new Task(data);
                    }
                    break;
                case "NAME":
                    assert.strictEqual(gameName, undefined);
                    gameName = data.readString(block.length);
                    break;
                default:
                    this.discardBlock(block, data);
                    debugTypes.add(block.type);
                    break;
            }

            assert.strictEqual(data.position(), oldPosition + block.length);
        }

        console.log(debugTypes);

        return new AnnoMap(islands, ships, kontors, players, task, gameName);
    }

    private parseShips(block: Block, data: Stream) {
        const ships = [];
        const startPos = data.position();
        while (data.position() < startPos + block.length) {
            ships.push(new Ship(data));
        }
        return ships;
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

    private parseKontors(block: Block, data: Stream): Kontor[] {
        const kontors: Kontor[] = [];
        const startPos = data.position();
        while (data.position() < startPos + block.length) {
            kontors.push({
                island: data.read8(),
                position: new PIXI.Point(data.read8(), data.read8()),
                player: data.read8(),
                goods: this.parseGoods(data),
            });
        }
        return kontors;
    }

    private parsePlayers(block: Block, data: Stream) {
        const players: Player[] = [];
        const startPos = data.position();
        while (data.position() < startPos + block.length) {
            players.push(new Player(data));
        }
        return players;
    }

    private parseGoods(data: Stream): Good[] {
        const goods: Good[] = [];
        for (let i = 0; i < 50; i++) {
            goods.push(new Good(data));
        }
        return goods;
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
