import {
  BitmapText,
  Container,
  Point,
  Rectangle,
  resources,
  Sprite,
  Texture
} from "pixi.js";
import SpriteLoader from "../sprite-loader";
import assert from "../util/assert";
import { ScreenConfig } from "./menu-structure";
import SliderSprite from "./ui/slider-sprite";
import FontLoader from "./font-loader";

interface RadioButtonData {
  sprite: Sprite;
  defaultTexture: Texture;
  activeTexture: Texture;
}

export default class GADRenderer {
  private videos: Sprite[] = [];

  constructor(private readonly spriteLoader: SpriteLoader) {}

  public clear(container: Container) {
    this.destroyVideos();
    container.removeChildren();
  }

  public async render(container: Container, data: any, config: ScreenConfig) {
    this.destroyVideos();

    const blockNumMapping: Map<number, string> = new Map();
    for (const name of Object.keys(data.variables)) {
      const value = data.variables[name];
      if (name.startsWith("BLK_")) {
        let tmp = name.substring(4);
        if (tmp === "TOOL") {
          tmp = "TOOLS";
        }
        blockNumMapping.set(value, tmp);
      }
    }

    const radioButtons: RadioButtonData[] = [];
    let selectableCount = 0;
    const gadgets = data.objects.GADGET.items;
    for (const num of Object.keys(gadgets)) {
      const gadget = gadgets[num];
      const id = gadget.Id;
      const blockNr: string = gadget.Blocknr;
      const gfx = gadget.Gfxnr;
      const kind: string = gadget.Kind;
      if (
        kind === "GAD_UNUSED" ||
        kind === "GAD_NIX" ||
        config.ignore.includes(id)
      ) {
        continue;
      }
      const position = new Point(gadget.Pos[0], gadget.Pos[1]);
      if (gadget.Posoffs) {
        position.set(
          position.x + gadget.Posoffs[0],
          position.y + gadget.Posoffs[1]
        );
      }
      const size =
        gadget.Size !== undefined
          ? new Point(gadget.Size.x, gadget.Size.y)
          : null;
      const selectable = gadget.Noselflg === undefined || gadget.Noselflg === 0;
      const isToggleButton = gadget.Flipflg === 1;
      const pressOff = gadget.Pressoff;
      const isRadioButton = gadget.Reiheflg === 1;
      if (isRadioButton) {
        assert(selectable);
      }
      assert(blockNr !== undefined);

      const isSlider = gadget.Slidverflg !== undefined;
      const sliderOffset = gadget.Slidoffs;
      const sliderSize = gadget.Slidsize;

      switch (kind) {
        case "GAD_GFX": {
          const textures = await this.spriteLoader.getTextures(
            `TOOLS/${blockNumMapping.get(parseInt(blockNr, 10))}`
          );

          const defaultTexture = textures.get(gfx)!;
          const activeTexture = textures.get(gfx + pressOff)!;

          const sprite = !isSlider
            ? new Sprite(defaultTexture)
            : new SliderSprite(defaultTexture);
          sprite.position.set(position.x, position.y);
          sprite.name = `menu-${id}`;

          if (isSlider) {
            (sprite as SliderSprite).setSliderData(
              size!.y,
              sliderOffset ? sliderOffset[1] : 0,
              sliderSize ? sliderSize[1] : 0
            );
          }

          if (selectable) {
            sprite.buttonMode = true;
            sprite.interactive = true;
            const callback = Array.isArray(config.buttons)
              ? config.buttons[selectableCount]
              : config.buttons[id];

            if (isRadioButton) {
              if (radioButtons.length === 0) {
                // The first radio button is active at the start.
                sprite.texture = activeTexture;
              }
              radioButtons.push({ sprite, activeTexture, defaultTexture });
            }

            sprite.on("mousedown", () => {
              if (isToggleButton) {
                sprite.texture =
                  sprite.texture === defaultTexture
                    ? activeTexture
                    : defaultTexture;
              } else {
                sprite.texture = activeTexture;
              }
              if (isRadioButton) {
                // If this IS a radio button, make all other radio buttons inactive.
                for (const button of radioButtons) {
                  if (button.sprite !== sprite) {
                    button.sprite.texture = button.defaultTexture;
                  }
                }
              }
              callback(
                container,
                isToggleButton ? sprite.texture === activeTexture : true
              );
            });

            if (!isRadioButton && !isToggleButton) {
              // If this is NOT a radio button or toggle button, go back to normal state on mouse up.
              sprite.on("mouseup", () => (sprite.texture = defaultTexture));
            }

            selectableCount++;
          }
          container.addChild(sprite);
          break;
        }
        case "GAD_TEXTL":
        case "GAD_TEXTZ":
        case "GAD_TEXTR": {
          // case "GAD_TEXTFL":
          const font = FontLoader.getFontByGadId(
            blockNr === undefined ? 0 : parseInt(blockNr, 10)
          );

          const text = new BitmapText(config.texts[id] || "???", {
            font: { name: font.name, size: font.size }
          });
          text.position.set(position.x, position.y);
          text.pivot.set(0, font.size);
          text.name = `menu-${id}`;
          if (size) {
            text.hitArea = new Rectangle(0, 0, size.x, size.y);
          }
          if (kind.endsWith("Z")) {
            // Center text
            text.anchor = new Point(0.5, 0);
          } else if (kind.endsWith("R")) {
            text.anchor = new Point(1, 0);
          }
          container.addChild(text);
          break;
        }
        // TODO: Shadows
        // case "GAD_GFXRAST":
        //   break;
        default:
          console.warn(`Unsupported kind: ${kind}`);
      }
    }

    config.onLoad(container);
  }

  public renderVideo(
    container: Container,
    videoSprite: Sprite,
    onEnd: () => void
  ) {
    const videoTexture = videoSprite.texture.baseTexture
      .resource as resources.VideoResource;
    videoTexture.source.addEventListener(
      "ended",
      () => {
        container.removeChild(videoSprite);
        onEnd();
      },
      { once: true }
    );
    container.addChild(videoSprite);
    this.videos.push(videoSprite);
  }

  public renderVideoFullscreen(
    container: Container,
    videoSprite: Sprite,
    onEnd: () => void
  ) {
    this.clear(container);

    const videoTexture = videoSprite.texture.baseTexture
      .resource as resources.VideoResource;
    videoTexture.source.addEventListener(
      "ended",
      () => {
        container.removeChild(videoSprite);
        onEnd();
      },
      { once: true }
    );

    videoSprite.scale.set(2, 2);

    // TODO: For some reason, this.stage.width/height are way to small.
    const x =
      /*this.stage.width*/ 1024 / 2 -
      (videoSprite.texture.width * videoSprite.scale.x) / 2;
    const y =
      /*this.stage.height*/ 768 / 2 -
      (videoSprite.texture.height * videoSprite.scale.y) / 2;
    videoSprite.position.set(x, y);

    container.addChild(videoSprite);
  }

  private destroyVideos() {
    this.videos.forEach(video =>
      video.destroy({ texture: true, baseTexture: true })
    );
    this.videos = [];
  }
}
