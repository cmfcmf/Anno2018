/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import { castleFromSaveGame } from "../../game/world/castle";
import { cityFromSaveGame } from "../../game/world/city";
import { Island, islandFromSaveGame } from "../../game/world/island";
import { kontorFromSaveGame } from "../../game/world/kontor";
import { Player, playerFromSaveGame } from "../../game/world/player";
import { producerFromSaveGame } from "../../game/world/producer";
import { shipFromSaveGame } from "../../game/world/ship";
import { soldierFromSaveGame } from "../../game/world/soldier";
import { taskFromSaveGame } from "../../game/world/task";
import { timersFromSaveGame } from "../../game/world/timers";
import { traderFromSaveGame } from "../../game/world/trader";
import World from "../../game/world/world";
import WorldGenerationSettings from "../../game/world/world-generation-settings";
import assert from "../../util/assert";
import Stream from "../stream";
import { Block, IslandBlock } from "./block";
import IslandLoader from "./island-loader";
import WorldGenerator from "./world-generator";

export default class GAMParser {
  private worldGenerator: WorldGenerator;

  constructor(private islandLoader: IslandLoader) {
    this.worldGenerator = new WorldGenerator(islandLoader);
  }

  public parse(data: Stream) {
    const blocks: Map<string, Block[]> = new Map();
    while (!data.eof()) {
      const block = Block.fromStream(data);
      if (block.type !== "INSELHAUS") {
        if (!blocks.has(block.type)) {
          blocks.set(block.type, []);
        }
        blocks.get(block.type).push(block);
      } else {
        const lastIslandBlock = blocks.get("INSEL5")[
          blocks.get("INSEL5").length - 1
        ] as IslandBlock;
        if (lastIslandBlock.inselHausBlocks === undefined) {
          lastIslandBlock.inselHausBlocks = [];
        }
        lastIslandBlock.inselHausBlocks.push(block);
      }
    }
    return blocks;
  }

  public async getWorld(data: Stream) {
    const blocks = this.parse(data);

    const { world, worldGenerationSettings } = await this.doParse(blocks);

    await this.worldGenerator.populateWorld(world, worldGenerationSettings);

    return world;
  }

  public async doParse(blocks: Map<string, Block[]>) {
    // console.log([...blocks.keys()].map(key => [key, blocks.get(key).length]));
    console.log(
      [...blocks.keys()]
        .filter(
          key => blocks.get(key).find(block => block.length > 0) !== undefined
        )
        .map(key => [key, blocks.get(key)])
    );

    let gameName = "";
    if (blocks.has("NAME")) {
      // Missions don't have a name.
      const nameBlock = blocks.get("NAME")[0];
      gameName = nameBlock.data.readString(nameBlock.length);
    }

    const playerBlock = blocks.get("PLAYER4")[0];
    const players = this.parsePlayers(playerBlock);

    const islandBlocks = blocks.has("INSEL5")
      ? (blocks.get("INSEL5") as IslandBlock[])
      : [];
    const islands = await this.parseIslands(islandBlocks);

    const tasks = this.handleBlock(blocks, "AUFTRAG4", taskFromSaveGame);
    const ships = this.handleBlock(blocks, "SHIP4", shipFromSaveGame);
    const soldiers = this.handleBlock(blocks, "SOLDAT3", soldierFromSaveGame);
    const kontors = this.handleBlock(blocks, "KONTOR2", kontorFromSaveGame);
    const castles = this.handleBlock(blocks, "MILITAR", castleFromSaveGame);
    const cities = this.handleBlock(blocks, "STADT4", cityFromSaveGame);
    const producers = this.handleBlock(
      blocks,
      "PRODLIST2",
      producerFromSaveGame
    );

    // TODO: HIRSCH2, WERFT, SIEDLER, ROHWACHS2, MARKT2, TURM, WIFF
    let trader = null;
    if (blocks.has("HANDLER") && blocks.get("HANDLER")[0].length > 0) {
      trader = traderFromSaveGame(blocks.get("HANDLER")[0].data);
    }

    assert(blocks.has("TIMERS"));
    assert(blocks.get("TIMERS").length === 1);
    const timers = timersFromSaveGame(blocks.get("TIMERS")[0].data);

    let worldGenerationSettings = WorldGenerationSettings.empty();
    if (blocks.has("SZENE")) {
      const data = blocks.get("SZENE")[0].data;
      worldGenerationSettings = WorldGenerationSettings.fromSaveGame(data);
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
      producers
    );

    return { world, worldGenerationSettings };
  }

  private handleBlock<T>(
    blocks: Map<string, Block[]>,
    name: string,
    fromSaveGame: (data: Stream) => T
  ): T[] {
    if (!blocks.has(name)) {
      return [];
    }
    const entities: T[] = [];
    for (const block of blocks.get(name)) {
      while (!block.data.eof()) {
        entities.push(fromSaveGame(block.data));
      }
    }
    return entities;
  }

  private async parseIslands(islandBlocks: IslandBlock[]) {
    const islands: Island[] = [];
    if (!this.islandLoader) {
      return islands;
    }

    for (const islandBlock of islandBlocks) {
      const island = islandFromSaveGame(islandBlock.data);
      const islandBuildingBlocks =
        islandBlock.inselHausBlocks !== undefined
          ? islandBlock.inselHausBlocks
          : [];

      let islandTopBlock = Block.empty("INSELHAUS");
      let islandBottomBlock;
      if (!island.differsFromBaseIsland && islandBuildingBlocks.length <= 1) {
        if (islandBuildingBlocks.length === 1) {
          islandTopBlock = islandBuildingBlocks[0];
        }

        const islandFile = await this.islandLoader.loadIslandFile(island);

        // The basis block contains the same information already present in
        // the island block of the savegame. We can safely skip over it.
        const islandBasisBlock = Block.fromStream(islandFile);
        assert(islandBasisBlock.type === "INSEL5");

        islandBottomBlock = Block.fromStream(islandFile);
        assert(islandBottomBlock.type === "INSELHAUS");
        // TODO: There are some more HIRSCH blocks we ignore.
      } else {
        assert(
          islandBuildingBlocks.length >= 1 && islandBuildingBlocks.length <= 2
        );
        islandBottomBlock = islandBuildingBlocks[0];
        if (islandBuildingBlocks.length === 2) {
          islandTopBlock = islandBuildingBlocks[1];
        }
      }
      this.islandLoader.setIslandFields(island, [
        // islandBottomBlock,
        islandTopBlock
      ]);

      islands.push(island);
    }
    return islands;
  }

  private parsePlayers(block: Block) {
    const players: Player[] = [];
    while (!block.data.eof()) {
      players.push(playerFromSaveGame(block.data));
    }
    return players;
  }
}
