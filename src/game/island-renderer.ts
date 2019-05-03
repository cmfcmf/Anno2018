import { Container } from "pixi.js";
import FileSystem from "../filesystem";
import IslandSpriteLoader from "./island-sprite-loader";
import { SpriteWithPositionAndLayer } from "./island-sprite-loader";
import { Island } from "./world/island";

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const LAND_OFFSET = -20;

export default class IslandRenderer {
  constructor(
    private world: Container,
    private fs: FileSystem,
    private spriteLoader: IslandSpriteLoader
  ) {}

  public render = async (islands: Island[]) => {
    await this.spriteLoader.init();
    const islandSprites = await Promise.all(
      islands.map(async island => {
        const sprites = await this.spriteLoader.getIslandSprites(island);
        console.log("Map sprites loaded.");
        sprites.sort(
          (a: SpriteWithPositionAndLayer, b: SpriteWithPositionAndLayer) => {
            if (a.layer === b.layer) {
              const ra = a.mapPosition.x + a.mapPosition.y;
              const rb = b.mapPosition.x + b.mapPosition.y;
              if (ra === rb) {
                return 0;
              } else if (ra < rb) {
                return -1;
              } else {
                return 1;
              }
            } else if (a.layer === "land") {
              return -1;
            } else {
              return 1;
            }
          }
        );
        return sprites;
      })
    );

    islandSprites.forEach((sprites: SpriteWithPositionAndLayer[]) =>
      sprites.forEach(sprite => this.world.addChild(sprite.sprite))
    );
    console.log("Map sprites drawn.");

    return islandSprites;
  };
}
