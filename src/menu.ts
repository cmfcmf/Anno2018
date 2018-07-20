import * as Viewport from "pixi-viewport";
import FileSystem from "./filesystem";
import GameRenderer from "./game/game-renderer";
import IslandRenderer from "./game/island-renderer";
import GAMParser from "./parsers/GAM/gam-parser";

export default class Menu {
    constructor(private fs: FileSystem, private gamParser: GAMParser,
                private islandRenderer: IslandRenderer, private viewport: Viewport) { }

    public async render() {
        const menu = document.body.appendChild(document.createElement("div"));

        let saves;
        try {
            saves = await this.fs.ls("/saves");
        } catch (e) {
            return;
        }
        console.table(saves);
        for (const saveGame of saves) {
            const title = document.createElement("p");
            title.innerText = saveGame.name;
            title.onclick = async () => {
                const saveGameData = await this.fs.openAndGetContentAsStream(saveGame);
                const world = await this.gamParser.parse(saveGameData);
                const game = new GameRenderer(world, this.islandRenderer, this.viewport);
                await game.begin();
            };
            menu.appendChild(title);
        }
    }
}
