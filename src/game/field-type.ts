import { AnimatedSprite, Point, Sprite, Texture } from "pixi.js";
import AnimationRenderer from "./animation-renderer";
import GameRenderer from "./game-renderer";
import { TILE_HEIGHT, TILE_WIDTH } from "./island-renderer";
import { SpriteWithPosition } from "./island-sprite-loader";
import { Rotation4 } from "./world/world";

export type GroundFieldType =
  | "BODEN"
  | "FLUSS"
  | "FLUSSECK"
  | "HANG"
  | "HANGQUELL"
  | "HANGECK"
  | "STRAND"
  | "STRANDMUND"
  | "STRANDECKI"
  | "STRANDECKA"
  | "STRANDVARI"
  | "BRANDUNG"
  | "BRANDECK"
  | "MEER"
  | "FELS"
  | "MUENDUNG";

export type LandFieldType =
  | GroundFieldType
  | "STRANDRUINE"
  | "PIER"
  | "WALD"
  | "RUINE"
  | "STRANDHAUS"
  | "HAFEN";

export type BuildingFieldType =
  | "GEBAEUDE"
  | "HQ" // Kontor
  | "STRASSE"
  | "BRUECKE"
  | "PLATZ"
  | "WMUEHLE"
  | "MINE"
  | "MAUER"
  | "MAUERSTRAND"
  | "TOR"
  | "TURM"
  | "TURMSTRAND";

export type FieldKind = LandFieldType | BuildingFieldType;

export enum GoodIds {
  NOWARE,
  ALLWARE,
  EISENERZ,
  GOLD,
  WOLLE,
  ZUCKER,
  TABAK,
  FLEISCH,
  KORN,
  MEHL,
  EISEN,
  SCHWERTER,
  MUSKETEN,
  KANONEN,
  NAHRUNG,
  TABAKWAREN,
  GEWUERZE,
  KAKAO,
  ALKOHOL,
  STOFFE,
  KLEIDUNG,
  SCHMUCK,
  WERKZEUG,
  HOLZ,
  ZIEGEL,
  wSOLDAT1,
  wSOLDAT2,
  wSOLDAT3,
  wSOLDAT4,
  wKAVALERIE1,
  wKAVALERIE2,
  wKAVALERIE3,
  wKAVALERIE4,
  wMUSKETIER1,
  wMUSKETIER2,
  wMUSKETIER3,
  wMUSKETIER4,
  wKANONIER1,
  wKANONIER2,
  wKANONIER3,
  wKANONIER4,
  // No icons for these
  wPIONIER1,
  wPIONIER2,
  wPIONIER3,
  wPIONIER4,
  GETREIDE,
  TABAKBAUM,
  GEWUERZBAUM,
  ZUCKERROHR,
  BAUMWOLLE,
  WEINTRAUBEN,
  KAKAOBAUM,
  GRAS,
  BAUM,
  STEINE,
  ERZE,
  WILD,
  FISCHE,
  SCHATZ
}

export default class FieldType {
  public readonly id: number;
  public readonly gfxId: number;
  public readonly kind: FieldKind;
  public readonly size: Point;
  public readonly rotate: number;
  public readonly animAdd: number;
  public readonly yOffset: number;
  public readonly animTime: number;
  public readonly animAnz: number;
  public readonly production: {
    good: number;
    upkeep: {
      active: number;
      inactive: number;
    };
    good1: number;
    good2: number;
    amount: number;
    amount1: number;
    amount2: number;
    radius: number;
    interval: number;
    maxStock: number;
    smokeAnimationNames: string[];
  };

  constructor(config: any) {
    this.id = config.Id;
    this.gfxId = config.Gfx;
    this.kind = config.Kind;
    this.size = new Point(config.Size.x, config.Size.y);
    this.rotate = config.Rotate;
    this.animAdd = config.AnimAdd;
    this.animAnz = config.AnimAnz;
    this.animTime = config.AnimTime === "TIMENEVER" ? -1 : config.AnimTime;
    this.yOffset = -config.Posoffs;

    const productionConfig = config.nested_objects.HAUS_PRODTYP[0];
    const upkeep = {
      active: 0,
      inactive: 0
    };
    if (Array.isArray(productionConfig.Kosten)) {
      upkeep.active = productionConfig.Kosten[0];
      upkeep.inactive = productionConfig.Kosten[1];
    } else {
      upkeep.active = upkeep.inactive =
        productionConfig.Kosten !== undefined ? productionConfig.Kosten : 0;
    }
    this.production = {
      good: this.goodNameToId(productionConfig.Ware),
      upkeep,
      good1: this.goodNameToId(productionConfig.Rohstoff),
      good2: this.goodNameToId(productionConfig.Workstoff),
      amount: productionConfig.Prodmenge,
      amount1: productionConfig.Rohmenge,
      amount2:
        productionConfig.Workmenge !== undefined
          ? productionConfig.Workmenge
          : 0,
      radius:
        productionConfig.Radius === "RADIUS_MARKT" ||
        productionConfig.Radius === "RADIUS_HQ"
          ? 16
          : productionConfig.Radius,
      interval: productionConfig.Interval,
      maxStock: productionConfig.Maxlager,
      smokeAnimationNames: Array.isArray(productionConfig.Rauchfignr)
        ? productionConfig.Rauchfignr
        : productionConfig.Rauchfignr
        ? [productionConfig.Rauchfignr]
        : []
    };
  }

  private goodNameToId(name: string | undefined): GoodIds {
    if (name === undefined) {
      return GoodIds.NOWARE;
    }
    // @ts-ignore
    const id = GoodIds[name];
    if (id === undefined) {
      throw new Error(`Invalid good name ${name}.`);
    }
    return id;
  }

  public async getSprites(
    playerId: number,
    islandPosition: Point,
    fieldPos: Point,
    rotation: Rotation4,
    animationStep: number,
    textures: Map<number, Texture>,
    animationRenderer: AnimationRenderer
  ) {
    const smokeAnimations: AnimatedSprite[] = [];
    const sprites: SpriteWithPosition[] = [];
    const sx = rotation % 2 === 0 ? this.size.x : this.size.y;
    const sy = rotation % 2 === 0 ? this.size.y : this.size.x;
    for (let y = 0; y < sy; y++) {
      for (let x = 0; x < sx; x++) {
        const xx = fieldPos.x + x;
        const yy = fieldPos.y + y;
        const { x: worldX, y: worldY } = GameRenderer.fieldPosToWorldPos(
          new Point(xx, yy)
        );

        let sprite: Sprite | AnimatedSprite;
        if (this.animAdd === 0 || this.animTime === -1) {
          const texture = this.getTexture(
            x,
            y,
            rotation,
            animationStep,
            textures
          );
          sprite = new Sprite(texture);
        } else {
          const animatedTextures = [];
          for (let i = 0; i < this.animAnz; i++) {
            animatedTextures.push(this.getTexture(x, y, rotation, i, textures));
          }
          const animatedSprite = new AnimatedSprite(animatedTextures);
          animatedSprite.animationSpeed =
            (1.0 / 60.0) * (1000.0 / this.animTime);
          animatedSprite.play();
          sprite = animatedSprite;
        }
        // Set bottom left corner of sprite as origin.
        sprite.anchor.set(0, 1);
        sprite.x = worldX;
        sprite.y = worldY + this.yOffset;
        sprites.push({
          sprite: sprite,
          pixelPosition: new Point(sprite.x, sprite.y),
          mapPosition: new Point(xx, yy),
          mapPositionOnIsland: new Point(
            xx - islandPosition.x,
            yy - islandPosition.y
          )
        });
      }
    }

    if (this.production.smokeAnimationNames) {
      const { x: worldX, y: worldY } = GameRenderer.fieldPosToWorldPos(
        new Point(fieldPos.x, fieldPos.y)
      );
      await Promise.all(
        this.production.smokeAnimationNames.map(async smokeAnimationName => {
          if (smokeAnimationName === "FAHNEKONTOR") {
            // The pirate kontor actually uses an invalid animation name. That appears to be a bug in Anno1602 itself.
            return;
          }

          const smokeAnimation = await animationRenderer.getAnimation(
            smokeAnimationName
          );
          const animation =
            Object.keys(smokeAnimation.animations).length > 1
              ? smokeAnimation.animations[playerId]
              : smokeAnimation.animations[0];
          const smokeSprite = animation.rotations[0].main;

          smokeSprite.x =
            worldX -
            Math.floor(smokeSprite.width / 2) + // calculate smoke center position
            TILE_WIDTH * 0.75 -
            (sy - sx + 1) * (TILE_WIDTH * 0.25) + // move to building center
            Math.floor(
              ((smokeAnimation.config.Fahnoffs[0] *
                (rotation === 0 || rotation === 3 ? 1 : -1) -
                smokeAnimation.config.Fahnoffs[1] *
                  (rotation === 0 || rotation === 1 ? 1 : -1)) *
                TILE_WIDTH) /
                2
            );

          smokeSprite.y =
            worldY -
            TILE_HEIGHT / 2 +
            (sx + sy - 2) * TILE_HEIGHT * 0.25 + // move bottom of smoke to building center
            Math.floor(
              ((smokeAnimation.config.Fahnoffs[0] *
                (rotation === 0 || rotation === 1 ? 1 : -1) +
                smokeAnimation.config.Fahnoffs[1] *
                  (rotation === 0 || rotation === 3 ? 1 : -1)) *
                TILE_HEIGHT) /
                2
            ) -
            Math.floor(TILE_HEIGHT * smokeAnimation.config.Fahnoffs[2]);
          smokeSprite.anchor = new Point(0, 1);
          smokeAnimations.push(smokeSprite);

          if (smokeAnimationName.startsWith("RAUCH")) {
            // TODO: This doesn't quite look like the original, but works for now.
            smokeSprite.alpha = 0.7;
          }
        })
      );
    }

    return { sprites, smokeAnimations };
  }

  private getTexture(
    x: number,
    y: number,
    rotation: Rotation4,
    animationStep: number,
    textures: Map<number, Texture>
  ): Texture {
    let tileId = this.gfxId;
    if (this.rotate > 0) {
      tileId += rotation * this.size.x * this.size.y;
    }
    tileId += animationStep * this.animAdd;

    if (rotation === 0) {
      tileId += y * this.size.x + x;
    } else if (rotation === 1) {
      tileId +=
        this.size.x * this.size.y -
        1 -
        (x * this.size.x + (this.size.x - 1 - y));
    } else if (rotation === 2) {
      tileId += (this.size.y - 1 - y) * this.size.x + (this.size.x - 1 - x);
    } else if (rotation === 3) {
      tileId += x * this.size.x + (this.size.x - 1 - y);
    } else {
      throw new Error(`Invalid building rotation: ${rotation}.`);
    }

    const texture = textures.get(tileId);
    if (texture === undefined) {
      throw new Error(`Could not load texture ${tileId}.`);
    }

    return texture;
  }
}
