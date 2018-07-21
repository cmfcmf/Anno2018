/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import * as assert from "assert";
import Castle from "../../game/world/castle";
import City from "../../game/world/city";
import Field from "../../game/world/field";
import Island from "../../game/world/island";
import Kontor from "../../game/world/kontor";
import Player from "../../game/world/player";
import Ship from "../../game/world/ship";
import Soldier from "../../game/world/soldier";
import Task from "../../game/world/task";
import Trader from "../../game/world/trader";
import World from "../../game/world/world";
import Stream from "../stream";
import {Block, IslandBlock} from "./block";
import IslandLoader from "./island-loader";

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

export type PlayerMap = ReadonlyMap<number, Player>;
export type IslandMap = ReadonlyMap<number, Island>;

interface Entity<T> {
    fromSaveGame(data: Stream, players: PlayerMap, islands: IslandMap): T;
}

export default class GAMParser {
    constructor(private islandLoader: IslandLoader) { }

    public async parse(data: Stream) {
        const blocks: Map<string, Block[]> = new Map();
        while (!data.eof()) {
            const block = this.readBlock(data);
            console.log(block.type);
            if (block.type !== "INSELHAUS") {
                if (!blocks.has(block.type)) {
                    blocks.set(block.type, []);
                }
                blocks.get(block.type).push(block);
            } else {
                const lastIslandBlock = blocks.get("INSEL5")[blocks.get("INSEL5").length - 1] as IslandBlock;
                if (lastIslandBlock.inselHausBlocks === undefined) {
                    lastIslandBlock.inselHausBlocks = [];
                }
                lastIslandBlock.inselHausBlocks.push(block);
            }
        }

        return this.doParse(blocks);
    }

    private async doParse(blocks: Map<string, Block[]>) {
        // console.log([...blocks.keys()].map(key => [key, blocks.get(key).length]));
        console.log(
            [...blocks.keys()]
                .filter((key) => blocks.get(key).find((block) => block.length > 0) !== undefined)
                .map((key) => [key, blocks.get(key)]),
        );

        let gameName = "";
        if (blocks.has("NAME")) {
            // Missions don't have a name.
            const nameBlock = blocks.get("NAME")[0];
            gameName = nameBlock.data.readString(nameBlock.length);
        }

        let task = null;
        if (blocks.has("AUFTRAG4")) {
            const taskBlock = blocks.get("AUFTRAG4")[0];
            if (taskBlock.length > 0) {
                task = Task.fromSaveGame(taskBlock.data);
            }
        }

        const playerBlock = blocks.get("PLAYER4")[0];
        const players = this.parsePlayers(playerBlock);

        const islandBlocks = blocks.has("INSEL5") ? blocks.get("INSEL5") as IslandBlock[] : [];
        const islands = await this.parseIslands(islandBlocks, players);

        const ships    = this.handleBlock<Ship>(   blocks, "SHIP4",   Ship,    players, islands);
        const soldiers = this.handleBlock<Soldier>(blocks, "SOLDAT3", Soldier, players, islands);
        const kontors  = this.handleBlock<Kontor>( blocks, "KONTOR2", Kontor,  players, islands);
        const castles  = this.handleBlock<Castle>( blocks, "MILITAR", Castle,  players, islands);
        const cities   = this.handleBlock<City>(   blocks, "STADT4",  City,    players, islands);

        // TODO: HIRSCH2, PRODLIST2, WERFT, SIEDLER, ROHWACHS2, MARKT2, HANDLER, TURM, TIMERS, WIFF
        let trader = null;
        if (blocks.has("HANDLER") && blocks.get("HANDLER")[0].length > 0) {
            trader = Trader.fromSaveGame(blocks.get("HANDLER")[0].data, players, islands);
        }

        return new World(
            [...islands.values()],
            [...players.values()],
            task,
            gameName,
            soldiers,
            ships,
            kontors,
            castles,
            cities,
            trader,
        );
    }

    private handleBlock<T>(blocks: Map<string, Block[]>, name: string, entity: any, players: PlayerMap,
                           islands: IslandMap): T[] {
        if (!blocks.has(name)) {
            return [];
        }
        const entities: T[] = [];
        for (const block of blocks.get(name)) {
            while (!block.data.eof()) {
                entities.push(entity.fromSaveGame(block.data, players, islands));
            }
        }
        return entities;
    }

    private async parseIslands(islandBlocks: IslandBlock[], players: PlayerMap) {
        const islands: Map<number, Island> = new Map();
        for (const islandBlock of islandBlocks) {
            const island = Island.fromSaveGame(islandBlock.data);
            const islandBuildingBlocks = islandBlock.inselHausBlocks;
            assert(islandBuildingBlocks.length === 2);
            const islandBottomBlock = islandBuildingBlocks[0];
            const islandTopBlock = islandBuildingBlocks[1];

            if (!island.differsFromBaseIsland) {
                const islandFile = await this.islandLoader.load(island);
                // TODO: Why do we ignore this block
                const islandBasisBlock = this.readBlock(islandFile);
                const islandBaseFieldsBlock = this.readBlock(islandFile);
                // TODO: Are there more blocks?
                island.baseFields = this.parseIslandBuildings(
                    island,
                    islandBaseFieldsBlock,
                    players,
                );
            } else {
                island.baseFields = this.parseIslandBuildings(
                    island,
                    islandBottomBlock,
                    players,
                );
            }

            island.topFields = this.parseIslandBuildings(
                island,
                islandTopBlock,
                players,
            );

            islands.set(island.id, island);
        }
        return islands;
    }

    private parseIslandBuildings(island: Island, block: Block, players: PlayerMap): Array<Array<Field|null>> {
        const data = block.data;
        const dataLength = block.length;

        const fields: Field[][] = [];
        for (let x = 0; x < island.width; x++) {
            fields.push(new Array(island.height).fill(null));
        }

        for (let i = 0; i < dataLength / Field.saveGameDataLength; i++) {
            const field = Field.fromSaveGame(data, players);
            assert(field.x < island.width);
            assert(field.y < island.height);
            fields[field.x][field.y] = field;
        }

        return fields;
    }

    private parsePlayers(block: Block) {
        const players: Map<number, Player> = new Map();
        while (!block.data.eof()) {
            const player = Player.fromSaveGame(block.data);
            players.set(player.id, player);
        }
        return players;
    }

    private readBlock(data: Stream): Block {
        return new Block(data.readString(16), data.read32(), data);
    }
}
