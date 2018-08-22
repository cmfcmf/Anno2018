import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";
import IslandSpriteLoader from "./island-sprite-loader";
import { SpriteWithPositionAndLayer } from "./island-sprite-loader";
import { Island } from "./world/island";

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 31;

export default class IslandRenderer {
  constructor(
    private world: PIXI.Container,
    private fs: FileSystem,
    private spriteLoader: IslandSpriteLoader
  ) {}

  public async render(islands: Island[]) {
    const sprites = await this.spriteLoader.getIslandSprites(islands);
    console.log("Map sprites loaded.");
    sprites.sort(
      (a: SpriteWithPositionAndLayer, b: SpriteWithPositionAndLayer) => {
        if (a.layer === b.layer) {
          const ra = a.position.x + a.position.y;
          const rb = b.position.x + b.position.y;
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
    console.log("Map sprites sorted.");

    sprites.forEach((sprite: SpriteWithPositionAndLayer) =>
      this.world.addChild(sprite.sprite)
    );
    console.log("Map sprites drawn.");
  }
}
