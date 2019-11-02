import { Viewport } from "pixi-viewport";
import { Application } from "pixi.js";
import FileSystem from "./filesystem";
import AnimationRenderer from "./game/animation-renderer";
import ConfigLoader from "./game/config-loader";
import Game from "./game/game";
import GameRenderer from "./game/game-renderer";
import IslandSpriteLoader from "./game/island-sprite-loader";
import MusicPlayer from "./game/music-player";
import { SimulationSpeed } from "./game/world/world";
import GAMParser from "./parsers/GAM/gam-parser";

export default class GameLoader {
  constructor(
    private readonly fs: FileSystem,
    private readonly gamParser: GAMParser,
    private readonly islandSpriteLoader: IslandSpriteLoader,
    private readonly app: Application,
    private readonly viewport: Viewport,
    private readonly configLoader: ConfigLoader,
    private readonly musicPlayer: MusicPlayer,
    private readonly animationRenderer: AnimationRenderer
  ) {}

  public async loadByName(gameName: string) {
    const games = await this.loadSavesAndMissions();
    const saveGame = games.find(
      saveOrMission => saveOrMission.name === gameName
    );
    if (!saveGame) {
      throw new Error(
        `Could not find ${gameName}. The following files are available: ${games
          .map(game => game.name)
          .join(", ")}`
      );
    }
    await this.load(saveGame);
  }

  public async load(saveGame: WebKitEntry | string) {
    const saveGameData = await this.fs.openAndGetContentAsStream(saveGame);
    const world = await this.gamParser.getWorld(saveGameData);
    const myPlayerId = 0;

    const gameLogic = new Game(this.configLoader, world);
    const gameRenderer = new GameRenderer(
      gameLogic,
      this.islandSpriteLoader,
      this.app,
      this.viewport,
      this.configLoader,
      this.animationRenderer,
      myPlayerId
    );

    await gameRenderer.begin();
    this.musicPlayer.playAll();

    gameLogic.setSimulationSpeed(SimulationSpeed.Default);
  }

  private async loadSavesAndMissions() {
    const saves = [];
    try {
      saves.push(...(await this.fs.ls("/saves", ".gam")));
    } catch (e) {
      // Ignore errors
    }

    const missions = [];
    try {
      missions.push(...(await this.fs.ls("/missions-original", ".szs|.szm")));
      missions.push(...(await this.fs.ls("/missions-custom", ".szs|.szm")));
    } catch (e) {
      // Ignore errors
    }
    return saves.concat(missions);
  }
}
