import * as log from "loglevel";
import "pixi-keyboard";
import * as PIXI from "pixi.js";
import FileSystem from "./filesystem";
import ConfigLoader from "./game/config-loader";
import GADRenderer from "./game/gad-renderer";
import IslandRenderer from "./game/island-renderer";
import IslandSpriteLoader from "./game/island-sprite-loader";
import MenuStructure from "./game/menu-structure";
import MusicPlayer from "./game/music-player";
import Menu from "./menu";
import GAMParser from "./parsers/GAM/gam-parser";
import IslandLoader from "./parsers/GAM/island-loader";
import SpriteLoader from "./sprite-loader";
import UploadHandler from "./upload";
import {getQueryParameter} from "./util/util";

const Viewport = require("pixi-viewport");

// tslint:disable-next-line:no-floating-promises
(async () => {
    log.enableAll();

    document.getElementById("version").innerText = `Anno 2018, version ${__VERSION__}.`;

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
        screenWidth: app.screen.width,
        screenHeight: app.screen.height,
    });

    app.stage.addChild(viewport);

    viewport
        .drag({direction: "all", wheel: false})
        .wheel()
    //    .mouseEdges({distance: 1000})
    //    .clamp({direction: "all"})
    ;

    const menuViewport = new Viewport({
        screenWidth: app.screen.width,
        screenHeight: app.screen.height,
        worldWidth: 1024,
        worldHeight: 768,
    });
    app.stage.addChild(menuViewport);

    const fs = new FileSystem();
    const FS_SIZE_MB = 1000;
    await fs.init(1024 * 1024 * FS_SIZE_MB);

    (window as any).app = app;
    (window as any).fs = fs;

    const uploadHandler = new UploadHandler(fs);
    await uploadHandler.init();
    uploadHandler.render(game);

    if (!await uploadHandler.isUploaded()) {
        console.warn("Anno 1602 files not yet uploaded.");
        return;
    }

    const spriteLoader = new SpriteLoader(fs);

    const configLoader = new ConfigLoader(fs);
    await configLoader.load();

    const musicPlayer = new MusicPlayer(fs);
    await musicPlayer.load();

    const gamParser = new GAMParser(new IslandLoader(fs));
    const worldFieldBuilder = new IslandSpriteLoader(fs, configLoader, spriteLoader);
    const islandRenderer = new IslandRenderer(viewport, fs, worldFieldBuilder);

    const menu = new Menu(fs, gamParser, islandRenderer, viewport, configLoader, musicPlayer);
    await menu.render(game);

    const queryGameName = getQueryParameter("load");
    if (queryGameName !== null) {
        await menu.loadByName(queryGameName);
        menuViewport.visible = false;
    } else {
        // menuViewport.fit(); // TODO: Makes usage of sliders harder
        const gadRenderer = new GADRenderer(menuViewport, spriteLoader);
        const menuStructure = new MenuStructure(fs, gadRenderer, musicPlayer);
        menuStructure.on("load-game", async (gameName: string) => {
            await menu.loadByName(gameName);
            menuViewport.visible = false;
        });
        await menuStructure.renderScreen("menu_main");
    }
})();
