import * as Viewport from "pixi-viewport";
import SpriteLoader from "../sprite-loader";
import assert from "../util/assert";

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
  Nowalkani: number;
  Rotate: number;
  Worktime: number;
  Posoffs: [number, number];
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
        sprites: PIXI.extras.AnimatedSprite[];
        config: AnimationConfig;
      };
    } = {};

    for (const animIdx of Object.keys(animationData.nested_objects.ANIM)) {
      const animatedSpritesForAnim: PIXI.extras.AnimatedSprite[] = [];

      const animation = animationData.nested_objects.ANIM[animIdx];

      const numSteps = animation.AnimAnz;
      const speed = (1 / 60) * (1000.0 / animation.AnimSpeed);
      const gfxPerStep = animation.AnimAdd;
      const repeats = animation.AnimRept ? animation.AnimRept : 0;
      const framesPerRotation = animation.Rotate
        ? animation.Rotate
        : baseFramesPerRotation;

      for (let rotationIdx = 0; rotationIdx < rotations; rotationIdx++) {
        let gfx =
          baseGfx + animation.AnimOffs + rotationIdx * framesPerRotation;

        const frames: PIXI.Texture[] = [];

        for (let step = 0; step < numSteps; step++) {
          frames.push(textures.get(gfx));
          gfx += gfxPerStep;
        }

        const animatedSprite = new PIXI.extras.AnimatedSprite(frames);
        animatedSprite.loop = animation.Kind === "ENDLESS";
        animatedSprite.animationSpeed = speed;

        animatedSpritesForAnim.push(animatedSprite);
      }

      animatedSprites[animIdx] = {
        sprites: animatedSpritesForAnim,
        config: animation
      };
    }

    return animatedSprites;
  }

  public async renderAnimation(name: string, game: Viewport) {
    const animations = await this.getAnimation(name);

    let y = 0;

    for (const animIdx of Object.keys(animations)) {
      const animatedSpritesForAnim = animations[animIdx].sprites;

      let x = 0;
      animatedSpritesForAnim.forEach(sprite => {
        sprite.position.set(x, y);
        x += sprite.width;
        game.addChild(sprite);
        sprite.play();
      });
      y += 50;
    }
  }
}
