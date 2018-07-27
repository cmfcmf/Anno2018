import {islandFromIsland3File, islandFromIsland4File, islandFromIsland5File} from "../../game/world/island";
import World from "../../game/world/world";
import WorldGenerationSettings from "../../game/world/world-generation-settings";
import assert from "../../util/assert";
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
                    newIsland = islandFromIsland5File(nextIslandId++, islandTemplate.position, isSouth, numBaseIsland,
                        inselBlock.data);
                    break;
                case "INSEL4":
                    newIsland = islandFromIsland4File(nextIslandId++, islandTemplate.position, isSouth, numBaseIsland,
                        inselBlock.data);
                    break;
                case "INSEL3":
                    newIsland = islandFromIsland3File(nextIslandId++, islandTemplate.position, isSouth, numBaseIsland,
                        inselBlock.data);
                    break;
                default:
                    throw new Error("This code cannot be reached.");
            }

            newIsland.baseFields = this.islandLoader.parseIslandBuildings(
                newIsland,
                inselHausBlock,
            );
            newIsland.topFields = this.islandLoader.parseIslandBuildings(
                newIsland,
                Block.empty("INSELHAUS"),
            );

            world.islands.push(newIsland);
        }
    }
}
