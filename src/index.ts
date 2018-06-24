import * as log from "loglevel";
import * as PIXI from "pixi.js";
import FileSystem from "./filesystem";
import IslandRenderer from "./game/island-renderer";
import WorldFieldBuilder from "./game/world-field-builder";
import Menu from "./menu";
import GAMParser from "./parsers/GAM/gam-parser";
import IslandLoader from "./parsers/GAM/island-loader";
import UploadHandler from "./upload";

const Viewport = require("pixi-viewport");

// tslint:disable-next-line:no-floating-promises
(async () => {
    log.enableAll();

    // PIXI.utils.skipHello();
    const app = new PIXI.Application({
        width: window.innerWidth,
        height: window.innerHeight - 50,
        antialias: false,
        transparent: false,
        // resolution: window.devicePixelRatio,
    });
    document.body.appendChild(app.view);

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
    uploadHandler.render();

    const gamParser = new GAMParser(new IslandLoader(fs));
    const worldFieldBuilder = new WorldFieldBuilder(fs);
    const islandRenderer = new IslandRenderer(viewport, fs, worldFieldBuilder);

    const menu = new Menu(fs, gamParser, islandRenderer, viewport);
    await menu.render();

    if (document.location.search.indexOf("debug=1") >= 0) {
        (document.querySelector("body > div > p:nth-child(2)") as HTMLParagraphElement).click();
    }
})();
