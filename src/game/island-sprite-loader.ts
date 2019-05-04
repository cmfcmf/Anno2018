import { Point, Sprite, Texture } from "pixi.js";
import FileSystem from "../filesystem";
import SpriteLoader from "../sprite-loader";
import { make2DArray } from "../util/util";
import ConfigLoader from "./config-loader";
import { default as FieldX } from "./field-type";
import { Island } from "./world/island";

export interface SpriteWithPosition {
  sprite: Sprite;
  pixelPosition: Point;
  mapPosition: Point;
  mapPositionOnIsland: Point;
}

export default class IslandSpriteLoader {
  private inited = false;

  private fields: ReadonlyMap<number, FieldX> = new Map();

  private textures: Map<number, Texture> = new Map();

  constructor(
    private readonly fs: FileSystem,
    private readonly configLoader: ConfigLoader,
    private readonly spriteLoader: SpriteLoader
  ) {}

  public init = async () => {
    if (!this.inited) {
      this.textures = await this.spriteLoader.getTextures("STADTFLD");
      this.fields = this.configLoader.getFieldData();
      this.inited = true;
    }
  };

  public getIslandSprites = async (island: Island) => {
    await this.init();

    const sprites = make2DArray<SpriteWithPosition, null>(
      island.size.x,
      island.size.y,
      null
    );

    for (let x = 0; x < island.size.x; x++) {
      for (let y = 0; y < island.size.y; y++) {
        this.handleField(island, x, y, sprites);
      }
    }

    return sprites;
  };

  private handleField = (
    island: Island,
    x: number,
    y: number,
    sprites: Array<Array<SpriteWithPosition | null>>
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

    const newSprites = fieldConfig.getSprites(
      island.position,
      origin,
      field.rotation,
      field.ani,
      this.textures
    );
    newSprites.forEach(newSprite => {
      const { x: xx, y: yy } = newSprite.mapPositionOnIsland;
      if (sprites[xx][yy] === null) {
        sprites[xx][yy] = newSprite;
      }
    });
  };
}
