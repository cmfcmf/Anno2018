import * as log from "loglevel";
import "pixi-keyboard";
import * as PIXI from "pixi.js";
import FileSystem from "./filesystem";
import IslandRenderer from "./game/island-renderer";
import IslandSpriteLoader from "./game/island-sprite-loader";
import Menu from "./menu";
import GAMParser from "./parsers/GAM/gam-parser";
import IslandLoader from "./parsers/GAM/island-loader";
import UploadHandler from "./upload";
import {getQueryParameter} from "./util/util";

const Viewport = require("pixi-viewport");

// tslint:disable-next-line:no-floating-promises
(async () => {
    log.enableAll();

    const game = document.getElementById("game");

    // PIXI.utils.skipHello();
    const app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight - 50,
        antialias: false,
        transparent: false,
        // resolution: window.devicePixelRatio,
    });
    game.appendChild(app.view);

    const viewport = new Viewport({
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        worldWidth: 20000,
        worldHeight: 20000,
    });

    app.stage.addChild(viewport);

    viewport
        .drag({direction: "all", wheel: false})
        .wheel()
    //    .mouseEdges({distance: 1000})
    //    .clamp({direction: "all"})
    ;

    // Set (0, 0) to center of the screen.
    // viewport.position.set(app.renderer.width / 2, 0);

    const fs = new FileSystem();
    await fs.init(1024 * 1024 * 200);

    (window as any).app = app;
    (window as any).fs = fs;

    const uploadHandler = new UploadHandler(fs);
    await uploadHandler.init();
    uploadHandler.render(game);

    const gamParser = new GAMParser(new IslandLoader(fs));
    const worldFieldBuilder = new IslandSpriteLoader(fs);
    const islandRenderer = new IslandRenderer(viewport, fs, worldFieldBuilder);

    const menu = new Menu(fs, gamParser, islandRenderer, viewport);
    await menu.render(game);

    const gameName = getQueryParameter("load");
    if (gameName !== null) {
        await menu.loadByName(gameName);
    }

    document.getElementById("version").innerText = `Anno 2018, version ${__VERSION__}.`;
})();
