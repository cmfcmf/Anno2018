import { Point, Sprite, Texture } from "pixi.js";
import FileSystem from "../filesystem";
import SpriteLoader from "../sprite-loader";
import ConfigLoader from "./config-loader";
import { default as FieldX } from "./field-type";
import Field from "./world/field";
import { Island } from "./world/island";

export type WorldLayer = "land" | "building";

export interface SpriteWithPositionAndLayer {
  sprite: Sprite;
  pixelPosition: Point;
  mapPosition: Point;
  layer: WorldLayer;
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

    const sprites: SpriteWithPositionAndLayer[] = [];

    for (let x = 0; x < island.size.x; x++) {
      for (let y = 0; y < island.size.y; y++) {
        this.handleField(
          island.baseFields[x][y],
          island,
          x,
          y,
          sprites,
          "land"
        );
      }
    }
    for (let x = 0; x < island.size.x; x++) {
      for (let y = 0; y < island.size.y; y++) {
        this.handleField(
          island.topFields[x][y],
          island,
          x,
          y,
          sprites,
          "building"
        );
      }
    }

    return sprites;
  };

  private handleField = (
    field: Field | null,
    island: Island,
    x: number,
    y: number,
    sprites: SpriteWithPositionAndLayer[],
    layer: WorldLayer
  ) => {
    if (field === null) {
      return;
    }
    const fieldConfig = this.fields.get(field.fieldId);
    if (fieldConfig === undefined) {
      throw new Error(`Could not load config for ${field.fieldId}.`);
    }
    const origin = new Point(island.position.x + x, island.position.y + y);

    const newSprites = fieldConfig.getSprites(
      origin,
      field.rotation,
      field.ani,
      this.textures,
      layer
    );
    sprites.push(...newSprites);
  };
}
