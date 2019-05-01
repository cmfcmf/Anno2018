import * as log from "loglevel";
import "pixi-keyboard";
import * as PIXI from "pixi.js";
import FileSystem from "./filesystem";
import GameLoader from "./game-loader";
import AnimationRenderer from "./game/animation-renderer";
import ConfigLoader from "./game/config-loader";
import FontLoader from "./game/font-loader";
import GADRenderer from "./game/gad-renderer";
import IslandRenderer from "./game/island-renderer";
import IslandSpriteLoader from "./game/island-sprite-loader";
import MenuStructure from "./game/menu-structure";
import MusicPlayer from "./game/music-player";
import GAMParser from "./parsers/GAM/gam-parser";
import IslandLoader from "./parsers/GAM/island-loader";
import SpriteLoader from "./sprite-loader";
import { loadTranslations } from "./translation/translator";
import UploadHandler from "./upload";
import { getQueryParameter } from "./util/util";

const Viewport = require("pixi-viewport");

// tslint:disable-next-line:no-floating-promises
(async () => {
  log.enableAll();

  const style = document.createElement("style");
  style.innerText = `
        body, html {
            margin: 0;
        }
    `;
  const game = document.createElement("div");
  game.id = "game";
  const version = document.createElement("p");
  version.innerHTML = `Anno 2018, version ${__VERSION__},
                         made by <a href="https://github.com/cmfcmf">@cmfcmf</a>.
                         The sourcecode can be found at <a href="https://github.com/cmfcmf/Anno2018">GitHub</a>.`;

  document.head.appendChild(style);
  document.body.appendChild(game);
  document.body.appendChild(version);

  const fs = new FileSystem();
  const FS_SIZE_MB = 2000;
  await fs.init(1024 * 1024 * FS_SIZE_MB);
  (window as any).fs = fs;

  const uploadHandler = new UploadHandler(fs);
  await uploadHandler.init();
  uploadHandler.render(game);

  if (!(await uploadHandler.isUploaded())) {
    console.warn("Anno 1602 files not yet uploaded.");
    return;
  }

  // PIXI.utils.skipHello();
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
  PIXI.settings.MIPMAP_TEXTURES = false;
  // PIXI.settings.RENDER_OPTIONS.antialias = false;
  PIXI.settings.RENDER_OPTIONS.roundPixels = true;

  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight - 120,
    antialias: false,
    transparent: false
  });
  game.insertAdjacentElement("afterbegin", app.view);

  const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height
  });
  app.stage.addChild(viewport);

  viewport.drag({ direction: "all", wheel: false }).wheel();
  //    .mouseEdges({distance: 1000})
  //    .clamp({direction: "all"})

  const menuViewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth: 1024,
    worldHeight: 768
  });
  app.stage.addChild(menuViewport);

  await loadTranslations(fs);

  const fontLoader = new FontLoader(fs);
  await fontLoader.load();

  const configLoader = new ConfigLoader(fs);
  await configLoader.load();
  console.log(`Finished loading config.`);

  const musicPlayer = new MusicPlayer(fs);
  await musicPlayer.load();
  console.log(`Finished loading music.`);

  const spriteLoader = new SpriteLoader(fs);

  const gamParser = new GAMParser(new IslandLoader(fs));
  const worldFieldBuilder = new IslandSpriteLoader(
    fs,
    configLoader,
    spriteLoader
  );
  const islandRenderer = new IslandRenderer(viewport, fs, worldFieldBuilder);

  const gameLoader = new GameLoader(
    fs,
    gamParser,
    islandRenderer,
    app,
    viewport,
    configLoader,
    musicPlayer
  );

  const queryGameName = getQueryParameter("load");
  const gad = getQueryParameter("gad");
  const animationName = getQueryParameter("animation");
  if (queryGameName !== null) {
    await gameLoader.loadByName(queryGameName);
    menuViewport.visible = false;
  } else if (gad !== null) {
    console.info(`Rendering "${gad}" screen.`);
    const gadRenderer = new GADRenderer(menuViewport, spriteLoader);
    const menuStructure = new MenuStructure(fs, gadRenderer, musicPlayer);
    await menuStructure.renderScreen(gad);
  } else if (animationName !== null) {
    console.log(`Rendering animation "${animationName}".`);
    const animationData = JSON.parse(
      await fs.openAndGetContentAsText("/animations.json")
    );
    const animationRenderer = new AnimationRenderer(
      animationData,
      spriteLoader
    );
    // await animationRenderer.renderAnimation(animation, viewport);
    const animation = await animationRenderer.getAnimation(animationName);

    const animIdx = 0;
    const rotation = 1;

    const sprite = animation[animIdx].sprites[rotation];
    const config = animation[animIdx].config;
    sprite.loop = true;
    if (config.Kind !== "ENDLESS") {
      let cnt = 0;
      sprite.onLoop = () => {
        cnt++;
        console.log(cnt, config.AnimRept);
        if (cnt === config.AnimRept) {
          sprite.loop = false;
        }
      };
    }

    viewport.addChild(sprite);
    sprite.play();
  } else {
    // menuViewport.fit(); // TODO: Makes usage of sliders harder
    const gadRenderer = new GADRenderer(menuViewport, spriteLoader);
    const menuStructure = new MenuStructure(fs, gadRenderer, musicPlayer);
    menuStructure.on("load-game", async (mission: string) => {
      await gameLoader.load(mission);
      menuViewport.visible = false;
    });
    await menuStructure.renderScreen("menu_main");
  }
})();
