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
        for (const islandTemplate of worldGenerationSettings.islandTemplates) {
            const islandData = await this.islandLoader.loadRandom(islandTemplate.size, islandTemplate.climate);
            console.log("here goes nothin'");
            while (!islandData.eof()) {
                const block = Block.fromStream(islandData);
                console.log(block);
            }
        }
    }
}
