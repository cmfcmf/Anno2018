import FileSystem from "../filesystem";
import GADRenderer from "./gad-renderer";

type Callback = () => void;

interface ScreenConfig {
    callbacks: Callback[];
}

export default class MenuStructure extends PIXI.utils.EventEmitter {
    private readonly structure: {[k: string]: ScreenConfig} = {
        menu_main: {
            callbacks: [
                async () => this.renderScreen("menu_missions"),
                async () => console.log("Multiplayer"),
                async () => console.log("Credits"),
                async () => console.log("Intro"),
                async () => console.log("Exit"),
            ],
        },
        menu_missions: {
            callbacks: [
                async () => console.log("New Game"),
                async () => console.log("Load Game"),
                async () => {
                    await this.renderScreen("menu_loading");
                    this.emit("load-game", "lastgame.gam");
                },
                async () => this.renderScreen("menu_main"),
                async () => console.log("move up"),
                async () => console.log("move down"),
            ],
        },
        menu_loading: {
            callbacks: [],
        },
        menu_mission_details: {
            callbacks: [
                async () => console.log("Start Mission"),
                async () => this.renderScreen("menu_missions"),
                async () => console.log("Highscores up"),
                async () => console.log("Highscores down"),
                async () => console.log("Sub-Mission 0"),
                async () => console.log("Sub-Mission 1"),
                async () => console.log("Sub-Mission 2"),
                async () => console.log("Sub-Mission 3"),
                async () => console.log("Sub-Mission 4"),
                async () => console.log("Mission Description up"),
                async () => console.log("Mission Description down"),
                async () => console.log("Mission Description Slider"),
            ],
        },
    };

    constructor(private readonly fs: FileSystem, private readonly gadRenderer: GADRenderer) {
        super();
    }

    public async renderScreen(screen: string) {
        const data = JSON.parse(await this.fs.openAndGetContentAsText(`/screens/${screen}.json`));
        console.log(data);
        await this.gadRenderer.render(data, this.structure[screen].callbacks);
    }
}
