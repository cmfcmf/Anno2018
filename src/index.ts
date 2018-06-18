import * as log from "loglevel";
import * as PIXI from "pixi.js";
import FileSystem from "./filesystem";
import GameRenderer from "./game/game-renderer";
import Menu from "./menu";
import GAMParser from "./parsers/GAM/gam-parser";
import IslandLoader from "./parsers/GAM/island-loader";
import UploadHandler from "./upload";

// tslint:disable-next-line:no-floating-promises
(async () => {
    log.enableAll();

    // PIXI.utils.skipHello();
    const app = new PIXI.Application({
        width: 256 * 1,
        height: 256 * 1,
        antialias: true,
        transparent: false,
        resolution: 1,
    });
    document.body.appendChild(app.view);

    const fs = new FileSystem();
    await fs.init(1024 * 1024 * 200);

    (window as any).app = app;
    (window as any).fs = fs;

    const uploadHandler = new UploadHandler(fs);
    await uploadHandler.init();
    uploadHandler.render();

    const gamParser = new GAMParser(new IslandLoader(fs));
    const gameRenderer = new GameRenderer(app, fs);
    const menu = new Menu(fs, gamParser, gameRenderer);
    await menu.render();
})();
