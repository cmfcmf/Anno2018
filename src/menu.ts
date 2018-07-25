import * as Viewport from "pixi-viewport";
import FileSystem from "./filesystem";
import Game from "./game/game";
import GameRenderer from "./game/game-renderer";
import IslandRenderer from "./game/island-renderer";
import GAMParser from "./parsers/GAM/gam-parser";

export default class Menu {
    private savesAndMissions: WebKitEntry[];

    constructor(private fs: FileSystem, private gamParser: GAMParser,
                private islandRenderer: IslandRenderer, private viewport: Viewport) { }

    public async render(game: HTMLElement) {
        await this.loadSavesAndMissions();

        const menu = game.appendChild(document.createElement("div"));

        for (const saveOrMission of this.savesAndMissions) {
            const title = document.createElement("p");
            title.innerText = saveOrMission.name;
            title.onclick = () => this.load(saveOrMission);
            menu.appendChild(title);
        }
    }

    public async loadByName(gameName: string) {
        const saveGame = this.savesAndMissions
            .find((saveOrMission) => saveOrMission.name === gameName);
        await this.load(saveGame);
    }

    public async load(saveGame: WebKitEntry) {
        const saveGameData = await this.fs.openAndGetContentAsStream(saveGame);
        const world = await this.gamParser.parse(saveGameData);
        const gameRenderer = new GameRenderer(world, this.islandRenderer, this.viewport);
        const gameLogic = new Game(world, gameRenderer);
        await gameLogic.begin();

//      this.viewport.parent.addChild(new PIXI.Text(
//          `Money: ${world.players.find((player) => player.id === 0).money}`,
//          {fontFamily : "Arial", fontSize: 24, fill : 0xff1010},
//      ));
    }

    private async loadSavesAndMissions() {
        const saves = [];
        try {
            saves.push(...await this.fs.ls("/saves"));
        } catch (e) {
            // Ignore errors
        }

        const missions = [];
        try {
            missions.push(...await this.getMissions("missions-original"));
            missions.push(...await this.getMissions("missions-custom"));
        } catch (e) {
            // Ignore errors
        }
        this.savesAndMissions = saves.concat(missions);
    }

    private async getMissions(folderName: string) {
        return (await this.fs.ls("/" + folderName)).filter((file) => {
            return file.isFile && (file.name.endsWith(".szs") || file.name.endsWith(".szm"));
        });
    }
}
