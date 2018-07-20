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

export type PlayerMap = Map<number, Player>;
export type IslandMap = Map<number, Island>;

export default class GAMParser {
    constructor(private islandLoader: IslandLoader) { }

    public async parse(data: Stream) {
        const blocks: Map<string, Block[]> = new Map();
        const blockTypes = [];
        while (!data.eof()) {
            const block = this.readBlock(data);
            if (!blocks.has(block.type)) {
                blocks.set(block.type, []);
            }
            if (block.type !== "INSELHAUS") {
                blocks.get(block.type).push(block);
            } else {
                const lastIslandBlock = blocks.get("INSEL5")[blocks.get("INSEL5").length - 1] as IslandBlock;
                if (lastIslandBlock.inselHausBlocks === undefined) {
                    lastIslandBlock.inselHausBlocks = [];
                }
                lastIslandBlock.inselHausBlocks.push(block);
            }
            blockTypes.push(block.type);
        }

        return this.doParse(blocks);
    }

    private async doParse(blocks: Map<string, Block[]>) {
        const nameBlock = blocks.get("NAME")[0];
        const gameName = nameBlock.data.readString(nameBlock.length);

        const taskBlock = blocks.get("AUFTRAG4")[0];
        let task = null;
        if (taskBlock.length > 0) {
            task = Task.fromSaveGame(taskBlock.data);
        }

        const playerBlock = blocks.get("PLAYER4")[0];
        const players = this.parsePlayers(playerBlock);

        const shipBlock = blocks.get("SHIP4")[0];
        const ships = this.parseShips(shipBlock, players);

        const soldierBlock = blocks.get("SOLDAT3")[0];
        const soldiers = this.parseSoldiers(soldierBlock, players);

        const islandBlocks = blocks.get("INSEL5") as IslandBlock[];
        const islands = await this.parseIslands(islandBlocks, players);

        const kontorBlock = blocks.get("KONTOR2")[0];
        const kontors = this.parseKontors(kontorBlock, players, islands);

        const castleBlock = blocks.get("MILITAR")[0];
        const castles = this.parseCastles(castleBlock, islands);

        const cityBlock = blocks.get("STADT4")[0];
        const cities = this.parseCities(cityBlock, players, islands);

        // TODO: HIRSCH2, PRODLIST2, WERFT, SIEDLER, ROHWACHS2, MARKT2, HANDLER, TURM, TIMERS, WIFF

        console.log(blocks.keys());

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
        );
    }

    private async parseIslands(islandBlocks: IslandBlock[], players: PlayerMap) {
        const islands: IslandMap = new Map();
        for (const islandBlock of islandBlocks) {
            const islandBuildingBlocks = islandBlock.inselHausBlocks;
            const island = Island.fromSaveGame(islandBlock.data);
            // TODO: What does diff stand for?
            if (!island.diff) {
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
            }

            island.topFields = this.parseIslandBuildings(
                island,
                // TODO: Why do we only use the last block?
                islandBuildingBlocks[islandBuildingBlocks.length - 1],
                players,
            );

            islands.set(island.id, island);
        }
        return islands;
    }

    private parseShips(block: Block, players: PlayerMap) {
        const ships = [];
        while (!block.data.eof()) {
            ships.push(Ship.fromSaveGame(block.data, players));
        }
        return ships;
    }

    private parseSoldiers(block: Block, players: PlayerMap) {
        const soldiers = [];
        while (!block.data.eof()) {
            soldiers.push(Soldier.fromSaveGame(block.data, players));
        }
        return soldiers;
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

    private parseKontors(block: Block, players: PlayerMap, islands: IslandMap): Kontor[] {
        const kontors: Kontor[] = [];
        while (!block.data.eof()) {
            kontors.push(Kontor.fromSaveGame(block.data, players, islands));
        }
        return kontors;
    }

    private parseCastles(block: Block, islands: IslandMap): Castle[] {
        const castles: Castle[] = [];
        while (!block.data.eof()) {
            castles.push(Castle.fromSaveGame(block.data, islands));
        }
        return castles;
    }

    private parseCities(block: Block, players: PlayerMap, islands: IslandMap): City[] {
        const cities: City[] = [];
        while (!block.data.eof()) {
            cities.push(City.fromSaveGame(block.data, players, islands));
        }
        return cities;
    }

    private parsePlayers(block: Block) {
        const players: PlayerMap = new Map();
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
