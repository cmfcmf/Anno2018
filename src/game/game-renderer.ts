import * as Viewport from "pixi-viewport";
import IslandRenderer from "./island-renderer";
import World from "./world/world";

export default class GameRenderer {
    constructor(private world: World, private islandRenderer: IslandRenderer,
                private viewport: Viewport) { }

    public async begin() {
        // Render islands
        await this.islandRenderer.render(this.world.islands);

        // Render ships
        // ...

        // Render soldiers
        // ...

        // Adjust viewport
        this.viewport.fit();
    }
}
