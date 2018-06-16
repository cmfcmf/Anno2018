import './upload';
import 'pixi.js';
import *  as log from 'loglevel';
import './filesystem';
import FileSystem from "./filesystem";

log.enableAll();

//Create a Pixi Application
let app = new PIXI.Application({ 
    width: 256,
    height: 256,
    antialias: true,
    transparent: false,
    resolution: 1
  }
);

//Add the canvas that Pixi automatically created for you to the HTML document
document.body.appendChild(app.view);

(async () => {
    const fs = new FileSystem();
    await fs.init(1024 * 1024 * 200);

    /** @var FileEntry */
    try {
        var spriteSheet = await fs.open('/gfx/STADTFLD/sprite-sheet-0.png');
    } catch (e) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (event => {
        const tmpImage = new window.Image();
        tmpImage.src = 'data:image/png;base64,' + btoa(event.target.result);

        const tex = PIXI.Texture.from(tmpImage);

        app.stage.addChild(new PIXI.Sprite(tex));
    });
    reader.readAsBinaryString(spriteSheet);
})();