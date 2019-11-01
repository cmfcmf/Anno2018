import { Viewport } from "pixi-viewport";
import { AnimatedSprite, Graphics, Texture } from "pixi.js";
import SpriteLoader from "../sprite-loader";
import assert from "../util/assert";
import { Ship, SHIP_TYPES } from "./world/ship";

interface AnimationConfig {
  Kind: "RANDOM" | "ENDLESS" | "JUMPTO";
  AnimOffs: number;
  AnimAdd: number;
  AnimAnz: number;
  AnimSpeed: number;
  AnimNr?: number | number[];
  AnimRept?: number;
  AnimSmp?: string | [string, number, number];
  Rotate?: number;
}

interface AnimationData {
  nested_objects: {
    ANIM: {
      [k: string]: AnimationConfig;
    };
  };
  Id: number;
  Gfx: number;
  Kind: string;
  Stirbtime: number;
  Speedtyp: number;
  Bugfignr: string;
  Nowalkani: number;
  Rotate: number;
  Worktime: number;
  Posoffs: [number, number]; // TODO: What is this?!
  Fahnoffs: [number, number, number];
  GfxCategory: string;
  GfxCategoryMapped: string;
  // + more
}

export default class AnimationRenderer {
  constructor(private animationData: any, private spriteLoader: SpriteLoader) {}

  public async getAnimation(name: string) {
    const animationData: AnimationData = this.animationData.objects.FIGUR.items[
      name
    ];
    if (!animationData) {
      console.log(this.animationData.objects.FIGUR.items);
      throw new Error("Invalid animation name");
    }
    console.log(animationData);

    if (Object.values(animationData.nested_objects).length === 0) {
      throw new Error(
        `Animation "${name}" does not include sufficient animation data.`
      );
    }
    assert(animationData.nested_objects.ANIM);

    const baseGfx = animationData.Gfx;
    const baseFramesPerRotation = animationData.Rotate;
    const rotations = baseFramesPerRotation === 0 ? 1 : 8;

    assert(animationData.GfxCategoryMapped.startsWith("GFX"));
    const gfxFilename = animationData.GfxCategoryMapped.substr("GFX".length);

    const textures = await this.spriteLoader.getTextures(gfxFilename);

    const animatedSprites: {
      [k: string]: {
        sprites: Array<{
          main: AnimatedSprite;
          bug?: AnimatedSprite;
          flag?: AnimatedSprite;
        }>;
        config: AnimationConfig;
      };
    } = {};

    for (const animIdx of Object.keys(animationData.nested_objects.ANIM)) {
      const animatedSpritesForAnim: Array<{
        main: AnimatedSprite;
        bug?: AnimatedSprite;
        flag?: AnimatedSprite;
      }> = [];

      const animation = animationData.nested_objects.ANIM[animIdx];

      const numSteps = animationData.Nowalkani ? 1 : animation.AnimAnz;
      const speed = (1 / 60) * (1000.0 / animation.AnimSpeed);
      const gfxPerStep = animation.AnimAdd;
      const repeats = animation.AnimRept ? animation.AnimRept : 0;
      const framesPerRotation = animation.Rotate
        ? animation.Rotate
        : baseFramesPerRotation;

      for (let rotationIdx = 0; rotationIdx < rotations; rotationIdx++) {
        const spritesForRotation: AnimatedSprite[] = [];

        let gfx =
          baseGfx + animation.AnimOffs + rotationIdx * framesPerRotation;

        const frames: Texture[] = [];
        for (let step = 0; step < numSteps; step++) {
          frames.push(textures.get(gfx)!);
          gfx += gfxPerStep;
        }

        const animatedSprite = new AnimatedSprite(frames);
        animatedSprite.anchor.set(0, 1);
        animatedSprite.loop = animation.Kind === "ENDLESS";
        animatedSprite.animationSpeed = speed;
        spritesForRotation.push(animatedSprite);

        let bugAnimation: AnimatedSprite | undefined;
        if (animationData.Bugfignr) {
          const tmp = await this.getAnimation(animationData.Bugfignr);
          bugAnimation = tmp[0].sprites[rotationIdx].main;
        }

        let flagAnimation: AnimatedSprite | undefined;
        if (animationData.Fahnoffs && false) {
          const tmp = await this.getAnimation("FAHNE3");
          flagAnimation = tmp[0].sprites[rotationIdx].main;
        }

        animatedSpritesForAnim.push({
          main: animatedSprite,
          bug: bugAnimation,
          flag: flagAnimation
        });
      }

      animatedSprites[animIdx] = {
        sprites: animatedSpritesForAnim, // One per rotation
        config: animation
      };
    }

    return animatedSprites;
  }

  public async renderAnimation(name: string, viewport: Viewport) {
    const animations = await this.getAnimation(name);
    console.log(animations);

    let y = 200;

    for (const animIdx of Object.keys(animations)) {
      const animatedSpritesForAnim = animations[animIdx].sprites;

      let x = 0;
      animatedSpritesForAnim.forEach(sprites => {
        const { main, bug, flag } = sprites;

        if (bug) {
          this.debugDrawSprite(
            bug,
            viewport,
            x + (main.width - bug.width) / 2,
            y
          );
        }
        if (flag) {
          this.debugDrawSprite(flag, viewport, x, y);
        }
        this.debugDrawSprite(main, viewport, x, y);

        x += main.width;
      });
      y += 50;
    }
  }

  public async getShipAnimation(ship: Ship) {
    // @ts-ignore
    const animationName = SHIP_TYPES[ship.type];
    return this.getAnimation(animationName);
  }

  public debugDrawSprite(
    sprite: AnimatedSprite,
    viewport: Viewport,
    x: number,
    y: number
  ) {
    const rect = new Graphics();
    rect.position.set(x, y);
    rect.lineStyle(1, 0xff0000);
    rect.drawRect(0, 0, sprite.width, -sprite.height);

    sprite.position.set(x, y);
    viewport.addChild(sprite);
    viewport.addChild(rect);
    sprite.play();
  }
}
