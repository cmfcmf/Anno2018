import * as Viewport from "pixi-viewport";
import FileSystem from "./filesystem";
import GameRenderer from "./game/game-renderer";
import IslandRenderer from "./game/island-renderer";
import GAMParser from "./parsers/GAM/gam-parser";

export default class Menu {
    constructor(private fs: FileSystem, private gamParser: GAMParser,
                private islandRenderer: IslandRenderer, private viewport: Viewport) { }

    public async render(game: HTMLElement) {
        const menu = game.appendChild(document.createElement("div"));

        let saves;
        try {
            saves = await this.fs.ls("/saves");
        } catch (e) {
            return;
        }
        const missions = [];
        try {
            missions.push(...await this.getMissions("missions-original"));
            missions.push(...await this.getMissions("missions-custom"));
        } catch (e) {
            return;
        }

        console.table(saves);
        for (const saveGame of saves.concat(missions)) {
            const title = document.createElement("p");
            title.innerText = saveGame.name;
            title.onclick = async () => {
                const saveGameData = await this.fs.openAndGetContentAsStream(saveGame);
                const world = await this.gamParser.parse(saveGameData);
                const gameRenderer = new GameRenderer(world, this.islandRenderer, this.viewport);

                this.viewport.parent.addChild(new PIXI.Text(
                    `Money: ${world.players.find((player) => player.id === 0).money}`,
                    {fontFamily : "Arial", fontSize: 24, fill : 0xff1010},
                ));

                await gameRenderer.begin();
            };
            menu.appendChild(title);
        }
    }

    private async getMissions(folderName: string) {
        return (await this.fs.ls("/" + folderName)).filter((file) => {
            return file.isFile && (file.name.endsWith(".szs") || file.name.endsWith(".szm"));
        });
    }
}
