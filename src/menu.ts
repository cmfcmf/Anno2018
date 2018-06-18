import FileSystem from "./filesystem";
import GameRenderer from "./game/game-renderer";
import GAMParser from "./parsers/GAM/gam-parser";

export default class Menu {
    constructor(private fs: FileSystem, private gamParser: GAMParser,
                private gameRenderer: GameRenderer) { }

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
                const map = await this.gamParser.parse(saveGameData);
                await this.gameRenderer.render(map);
            };
            menu.appendChild(title);
        }
    }
}
