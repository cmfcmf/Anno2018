import * as PIXI from "pixi.js";
import GameRenderer from "./game-renderer";
import { SpriteWithPositionAndLayer } from "./island-sprite-loader";
import { WorldLayer } from "./island-sprite-loader";
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

export default class FieldType {
  public readonly id: number;
  public readonly gfxId: number;
  public readonly kind: FieldKind;
  public readonly size: PIXI.Point;
  public readonly rotate: number;
  public readonly animAdd: number;
  public readonly yOffset: number;
  public readonly animTime: number;
  public readonly animAnz: number;
  public readonly production: {
    good: string;
    upkeep: {
      active: number;
      inactive: number;
    };
    good1: string;
    good2: string;
    amount1: number;
    amount2: number;
    radius: number;
    interval: number;
    maxStock: number;
  };

  constructor(config: any) {
    this.id = config.Id;
    this.gfxId = config.Gfx;
    this.kind = config.Kind;
    this.size = new PIXI.Point(config.Size.x, config.Size.y);
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
      good: productionConfig.Ware,
      upkeep,
      good1: productionConfig.Rohstoff,
      good2: productionConfig.Workstoff,
      amount1: productionConfig.Rohmenge,
      amount2:
        productionConfig.Workmenge !== undefined
          ? productionConfig.Workmenge
          : 0,
      radius: productionConfig.Radius,
      interval: productionConfig.Interval,
      maxStock: productionConfig.Maxlager
    };
  }

  public getSprites(
    fieldPos: PIXI.Point,
    rotation: Rotation4,
    animationStep: number,
    textures: Map<number, PIXI.Texture>,
    layer: WorldLayer
  ) {
    const sprites: SpriteWithPositionAndLayer[] = [];
    const sx = rotation % 2 === 0 ? this.size.x : this.size.y;
    const sy = rotation % 2 === 0 ? this.size.y : this.size.x;
    for (let y = 0; y < sy; y++) {
      for (let x = 0; x < sx; x++) {
        const xx = fieldPos.x + x;
        const yy = fieldPos.y + y;
        const { x: worldX, y: worldY } = GameRenderer.fieldPosToWorldPos(
          new PIXI.Point(xx, yy)
        );

        let sprite: PIXI.Sprite | PIXI.extras.AnimatedSprite;
        if (this.animAdd === 0 || this.animTime === -1) {
          const texture = this.getTexture(
            x,
            y,
            rotation,
            animationStep,
            textures
          );
          sprite = new PIXI.Sprite(texture);
        } else {
          const animatedTextures = [];
          for (let i = 0; i < this.animAnz; i++) {
            animatedTextures.push(this.getTexture(x, y, rotation, i, textures));
          }
          const animatedSprite = new PIXI.extras.AnimatedSprite(
            animatedTextures
          );
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
          pixelPosition: new PIXI.Point(xx, yy),
          mapPosition: new PIXI.Point(x, y),
          layer: layer
        });
      }
    }

    return sprites;
  }

  private getTexture(
    x: number,
    y: number,
    rotation: Rotation4,
    animationStep: number,
    textures: Map<number, PIXI.Texture>
  ): PIXI.Texture {
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
