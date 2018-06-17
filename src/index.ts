import './upload';
import Menu from './menu';
import * as PIXI from 'pixi.js';
import * as log from 'loglevel';
import FileSystem from "./filesystem";
import GAMParser from "./parsers/GAM/gam-parser";
import IslandLoader from "./parsers/GAM/island-loader";
import GameRenderer from "./game/game-renderer";

(async () => {
    log.enableAll();

    // PIXI.utils.skipHello();

    //Create a Pixi Application
    const app = new PIXI.Application({
            width: 256 * 1,
            height: 256 * 1,
            antialias: true,
            transparent: false,
            resolution: 1,
        }
    );

    //Add the canvas that Pixi automatically created for you to the HTML document
    document.body.appendChild(app.view);


    const fs = new FileSystem();
    await fs.init(1024 * 1024 * 200);

    (<any>window).app = app;
    (<any>window).fs = fs;

    const gamParser = new GAMParser(new IslandLoader(fs));
    const gameRenderer = new GameRenderer(app, fs);
    const menu = new Menu(fs, gamParser, gameRenderer);
    await menu.render();
})();