/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Castle from "../../game/world/castle";
import City from "../../game/world/city";
import Island from "../../game/world/island";
import Kontor from "../../game/world/kontor";
import Player from "../../game/world/player";
import Ship from "../../game/world/ship";
import Soldier from "../../game/world/soldier";
import Task from "../../game/world/task";
import Timers from "../../game/world/timers";
import Trader from "../../game/world/trader";
import World from "../../game/world/world";
import WorldGenerationSettings from "../../game/world/world-generation-settings";
import assert from "../../util/assert";
import Stream from "../stream";
import {Block, IslandBlock} from "./block";
import IslandLoader from "./island-loader";
import WorldGenerator from "./world-generator";

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
    private worldGenerator: WorldGenerator;

    constructor(private islandLoader: IslandLoader) {
        this.worldGenerator = new WorldGenerator(islandLoader);
    }

    public async parse(data: Stream) {
        const blocks: Map<string, Block[]> = new Map();
        while (!data.eof()) {
            const block = Block.fromStream(data);
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

        const {world, worldGenerationSettings} = await this.doParse(blocks);

        await this.worldGenerator.populateWorld(world, worldGenerationSettings);

        return world;
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

        const playerBlock = blocks.get("PLAYER4")[0];
        const players = this.parsePlayers(playerBlock);

        const islandBlocks = blocks.has("INSEL5") ? blocks.get("INSEL5") as IslandBlock[] : [];
        const islands = await this.parseIslands(islandBlocks, players);

        const tasks    = this.handleBlock<Task>(   blocks, "AUFTRAG4", Task,    players, islands);
        const ships    = this.handleBlock<Ship>(   blocks, "SHIP4",    Ship,    players, islands);
        const soldiers = this.handleBlock<Soldier>(blocks, "SOLDAT3",  Soldier, players, islands);
        const kontors  = this.handleBlock<Kontor>( blocks, "KONTOR2",  Kontor,  players, islands);
        const castles  = this.handleBlock<Castle>( blocks, "MILITAR",  Castle,  players, islands);
        const cities   = this.handleBlock<City>(   blocks, "STADT4",   City,    players, islands);

        // TODO: HIRSCH2, PRODLIST2, WERFT, SIEDLER, ROHWACHS2, MARKT2, TURM, WIFF
        let trader = null;
        if (blocks.has("HANDLER") && blocks.get("HANDLER")[0].length > 0) {
            trader = Trader.fromSaveGame(blocks.get("HANDLER")[0].data, players, islands);
        }

        assert(blocks.has("TIMERS"));
        assert(blocks.get("TIMERS").length === 1);
        const timers = Timers.fromSaveGame(blocks.get("TIMERS")[0].data, players, islands);

        let worldGenerationSettings = WorldGenerationSettings.empty();
        if (blocks.has("SZENE")) {
            const data = blocks.get("SZENE")[0].data;
            worldGenerationSettings = WorldGenerationSettings.fromSaveGame(data, players, islands);
        }

        const world = new World(
            islands,
            players,
            tasks,
            gameName,
            soldiers,
            ships,
            kontors,
            castles,
            cities,
            trader,
            timers,
        );

        return {world, worldGenerationSettings};
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
            const islandBuildingBlocks = islandBlock.inselHausBlocks !== undefined ? islandBlock.inselHausBlocks : [];

            let islandTopBlock = Block.empty("INSELHAUS");
            let islandBottomBlock;
            if (!island.differsFromBaseIsland && islandBuildingBlocks.length <= 1) {
                if (islandBuildingBlocks.length === 1) {
                    islandTopBlock = islandBuildingBlocks[0];
                }

                const islandFile = await this.islandLoader.loadIslandFile(island);
                // TODO: Why do we ignore this block
                const islandBasisBlock = Block.fromStream(islandFile);
                // TODO: Are there more blocks?
                islandBottomBlock = Block.fromStream(islandFile);
            } else {
                assert(islandBuildingBlocks.length >= 1 && islandBuildingBlocks.length <= 2);
                islandBottomBlock = islandBuildingBlocks[0];
                if (islandBuildingBlocks.length === 2) {
                    islandTopBlock = islandBuildingBlocks[1];
                }

            }
            island.baseFields = this.islandLoader.parseIslandBuildings(
                island,
                islandBottomBlock,
                players,
            );

            island.topFields = this.islandLoader.parseIslandBuildings(
                island,
                islandTopBlock,
                players,
            );

            islands.set(island.id, island);
        }
        return islands;
    }

    private parsePlayers(block: Block) {
        const players: Map<number, Player> = new Map();
        while (!block.data.eof()) {
            const player = Player.fromSaveGame(block.data);
            players.set(player.id, player);
        }
        return players;
    }
}
