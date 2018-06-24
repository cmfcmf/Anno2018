import {AnnoMap} from '../parsers/GAM/anno-map';
import IslandRenderer from './island-renderer';
import * as Viewport from "pixi-viewport";

export default class AnnoGame {
    constructor(private map: AnnoMap, private islandRenderer: IslandRenderer,
                private viewport: Viewport) { }

    public async begin() {
        await this.islandRenderer.render(this.map);
        this.viewport.fit();
    }
}