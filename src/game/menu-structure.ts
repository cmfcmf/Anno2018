import { Container, Sprite } from "pixi.js";
import { utils } from "pixi.js";
import FileSystem from "../filesystem";
import { textureFromUint8ArrayMP4 } from "../util/pixi";
import GADRenderer from "./gad-renderer";
import Missions from "./menu/missions";
import MusicPlayer from "./music-player";
import { Translator } from "../translation/translator";

type Callback = (container: Container) => void;
type BtnCallback = (container: Container, active: boolean) => void;

export interface ScreenConfig {
  onLoad: Callback;
  buttons: BtnCallback[] | Record<number, BtnCallback>;
  texts: Record<number, string>;
  ignore: number[];
}

export default class MenuStructure extends utils.EventEmitter {
  private readonly structure: { [k: string]: ScreenConfig } = {
    menu_main: {
      onLoad: () => this._playMainMenuMusic(),
      buttons: [
        container => this.renderScreen(container, "menu_missions"),
        () => console.log("Multiplayer"),
        async (container: Container) => {
          // Credits
          this.musicPlayer.stop();
          const videoSprite = await this.loadVideoSprite(10);
          videoSprite.width = 453 - 14;
          videoSprite.height = 367 - 14;
          videoSprite.position.set(500 + 7, 359 + 7);
          this.gadRenderer.renderVideo(
            container,
            videoSprite,
            () => this._playMainMenuMusic
          );
        },
        async (container: Container) => {
          // Intro
          const videoSprite = await this.loadVideoSprite(58);
          this.musicPlayer.stop();
          this.gadRenderer.renderVideoFullscreen(container, videoSprite, () =>
            this.renderScreen(container, "menu_main")
          );
        },
        () => console.log("Exit")
      ],
      texts: [],
      ignore: []
    },
    menu_missions: new Missions(this.fs, this, this.translator),
    menu_loading: {
      onLoad: () => {
        // Nothing to do
      },
      buttons: [],
      texts: [],
      ignore: []
    },
    menu_mission_details: {
      onLoad: () => {
        // Nothing to do
      },
      buttons: [
        () => console.log("Start Mission"),
        (container: Container) => this.renderScreen(container, "menu_missions"),
        () => console.log("Highscores up"),
        () => console.log("Highscores down"),
        () => console.log("Sub-Mission 0"),
        () => console.log("Sub-Mission 1"),
        () => console.log("Sub-Mission 2"),
        () => console.log("Sub-Mission 3"),
        () => console.log("Sub-Mission 4"),
        () => console.log("Mission Description up"),
        () => console.log("Mission Description down"),
        () => console.log("Mission Description Slider")
      ],
      texts: [],
      ignore: []
    }
  };

  constructor(
    private readonly fs: FileSystem,
    private readonly gadRenderer: GADRenderer,
    private readonly musicPlayer: MusicPlayer,
    private readonly translator: Translator
  ) {
    super();
  }

  public async renderScreen(
    container: Container,
    screen: string,
    model?: ScreenConfig
  ) {
    const data = JSON.parse(
      await this.fs.openAndGetContentAsText(`/screens/${screen}.json`)
    );
    console.log(data);
    const config = model ||
      this.structure[screen] || {
        onLoad: () => {
          /* Nothing to do */
        },
        buttons: [],
        texts: {},
        ignore: []
      };
    this.gadRenderer.clear(container);
    await this.gadRenderer.render(container, data, config);
  }

  public async _playMainMenuMusic() {
    await this.musicPlayer.play("1st Beginning", true);
  }

  private async loadVideoSprite(videoNumber: number) {
    const videoData = await this.fs.openAndGetContentAsUint8Array(
      `/videos/${videoNumber}.mp4`
    );
    return Sprite.from(await textureFromUint8ArrayMP4(videoData));
  }
}
