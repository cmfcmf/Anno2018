import assert from "browser-assert";
import Island from "../../game/world/island";
import World from "../../game/world/world";
import WorldGenerationSettings from "../../game/world/world-generation-settings";
import {Block} from "./block";
import IslandLoader from "./island-loader";

export default class WorldGenerator {
    constructor(private islandLoader: IslandLoader) {}

    public async populateWorld(
        world: World,
        worldGenerationSettings: WorldGenerationSettings,
    ) {
        let nextIslandId = Math.max(...world.islands.map((island) => island.id)) + 1;

        for (const islandTemplate of worldGenerationSettings.islandTemplates) {
            const {data, isSouth, id: numBaseIsland} = await this.islandLoader.loadRandomIslandFile(
                islandTemplate.size,
                islandTemplate.climate,
            );

            const blocks: Block[] = [];
            while (!data.eof()) {
                blocks.push(Block.fromStream(data));
            }

            const inselBlock = blocks.find((block) => ["INSEL5", "INSEL4", "INSEL3"].includes(block.type));
            assert(inselBlock !== undefined);
            const inselHausBlock = blocks.find((block) => block.type === "INSELHAUS");
            assert(inselHausBlock !== undefined);

            // TODO: Place random things:
            // numNativesNorth,
            // numNativesSouth,
            // numBigIronOre,
            // numSmallIronOre,
            // numGoldOre,
            // numWine,
            // numSugarCane,
            // numSpice,
            // numCacao,
            // numTobacco,
            // numCotton,
            // numTreasures,

            let newIsland;
            switch (inselBlock.type) {
                case "INSEL5":
                    newIsland = Island.fromIsland5File(nextIslandId++, islandTemplate.position, isSouth, numBaseIsland,
                        inselBlock.data);
                    break;
                case "INSEL4":
                    newIsland = Island.fromIsland4File(nextIslandId++, islandTemplate.position, isSouth, numBaseIsland,
                        inselBlock.data);
                    break;
                case "INSEL3":
                    newIsland = Island.fromIsland3File(nextIslandId++, islandTemplate.position, isSouth, numBaseIsland,
                        inselBlock.data);
                    break;
                default:
                    throw new Error("This code cannot be reached.");
            }

            newIsland.baseFields = this.islandLoader.parseIslandBuildings(
                newIsland,
                inselHausBlock,
                world.playerMap,
            );
            newIsland.topFields = this.islandLoader.parseIslandBuildings(
                newIsland,
                Block.empty("INSELHAUS"),
                world.playerMap,
            );

            world.islands.push(newIsland);
        }
    }
}
