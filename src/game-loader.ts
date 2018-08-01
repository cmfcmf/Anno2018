import * as Viewport from "pixi-viewport";
import FileSystem from "./filesystem";
import ConfigLoader from "./game/config-loader";
import Game from "./game/game";
import GameRenderer from "./game/game-renderer";
import IslandRenderer from "./game/island-renderer";
import MusicPlayer from "./game/music-player";
import GAMParser from "./parsers/GAM/gam-parser";

export default class GameLoader {
    constructor(private readonly fs: FileSystem, private readonly gamParser: GAMParser,
                private readonly islandRenderer: IslandRenderer, private readonly viewport: Viewport,
                private readonly configLoader: ConfigLoader, private readonly musicPlayer: MusicPlayer) { }

    public async loadByName(gameName: string) {
        const saveGame = (await this.loadSavesAndMissions())
            .find((saveOrMission) => saveOrMission.name === gameName);
        await this.load(saveGame);
    }

    public async load(saveGame: WebKitEntry|string) {
        const saveGameData = await this.fs.openAndGetContentAsStream(saveGame);
        const world = await this.gamParser.getWorld(saveGameData);
        const gameRenderer = new GameRenderer(world, this.islandRenderer, this.viewport);
        const gameLogic = new Game(gameRenderer, this.configLoader);
        await gameLogic.begin(world);
        this.musicPlayer.playAll();

//      this.viewport.parent.addChild(new PIXI.Text(
//          `Money: ${world.players.find((player) => player.id === 0).money}`,
//          {fontFamily : "Arial", fontSize: 24, fill : 0xff1010},
//      ));
    }

    private async loadSavesAndMissions() {
        const saves = [];
        try {
            saves.push(...await this.fs.ls("/saves", ".gam"));
        } catch (e) {
            // Ignore errors
        }

        const missions = [];
        try {
            missions.push(...await this.fs.ls("/missions-original", ".szs|.szm"));
            missions.push(...await this.fs.ls("/missions-custom", ".szs|.szm"));
        } catch (e) {
            // Ignore errors
        }
        return saves.concat(missions);
    }
}
