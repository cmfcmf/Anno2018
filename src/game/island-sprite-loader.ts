import AsyncLock from "async-lock";
import { AnimatedSprite, Point, Sprite, Texture } from "pixi.js";
import SpriteLoader from "../sprite-loader";
import { make2DArray } from "../util/util";
import AnimationRenderer from "./animation-renderer";
import ConfigLoader from "./config-loader";
import { default as FieldX } from "./field-type";
import { Island } from "./world/island";

export interface SpriteWithPosition {
  sprite: Sprite;
  pixelPosition: Point;
  mapPosition: Point;
  mapPositionOnIsland: Point;
  fieldOriginPosition: Point;
}

export default class IslandSpriteLoader {
  private inited = false;
  private fields: ReadonlyMap<number, FieldX> = new Map();
  private textures: Map<number, Texture> = new Map();
  private lock: AsyncLock = new AsyncLock();

  constructor(
    private readonly configLoader: ConfigLoader,
    private readonly spriteLoader: SpriteLoader,
    private readonly animationRenderer: AnimationRenderer
  ) {}

  public init = async () => {
    await this.lock.acquire("init", async () => {
      if (!this.inited) {
        this.textures = await this.spriteLoader.getTextures("STADTFLD");
        this.fields = this.configLoader.getFieldData();
        this.inited = true;
      }
    });
  };

  public getIslandSprites = async (island: Island) => {
    await this.init();

    const smokeSprites: AnimatedSprite[] = [];

    const sprites = make2DArray<SpriteWithPosition>(
      island.size.x,
      island.size.y
    );

    for (let x = 0; x < island.size.x; x++) {
      for (let y = 0; y < island.size.y; y++) {
        await this.loadSpritesOfField(island, x, y, sprites, smokeSprites);
      }
    }

    return { sprites, smokeSprites };
  };

  private loadSpritesOfField = async (
    island: Island,
    x: number,
    y: number,
    sprites: Array<Array<SpriteWithPosition | null>>,
    smokeSprites: AnimatedSprite[]
  ) => {
    const field = island.fields[x][y];
    if (field === null) {
      return;
    }
    const fieldConfig = this.fields.get(field.fieldId);
    if (fieldConfig === undefined) {
      throw new Error(`Could not load config for ${field.fieldId}.`);
    }
    const origin = new Point(island.position.x + x, island.position.y + y);

    const {
      sprites: newSprites,
      smokeAnimations
    } = await fieldConfig.getSprites(
      field.playerId,
      island.position,
      origin,
      field.rotation,
      field.ani,
      this.textures,
      this.animationRenderer
    );
    newSprites.forEach(newSprite => {
      const { x: xx, y: yy } = newSprite.mapPositionOnIsland;
      if (sprites[xx][yy] === null) {
        sprites[xx][yy] = newSprite;
      }
    });
    smokeSprites.push(...smokeAnimations);
  };
}
