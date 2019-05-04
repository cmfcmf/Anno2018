import { Container } from "pixi.js";
import IslandSpriteLoader from "./island-sprite-loader";
import { SpriteWithPosition } from "./island-sprite-loader";
import { Island } from "./world/island";

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const LAND_OFFSET = -20;

export default class IslandRenderer {
  constructor(
    private world: Container,
    private spriteLoader: IslandSpriteLoader
  ) {}

  public render = async (islands: Island[]) => {
    await this.spriteLoader.init();
    const islandSprites = await Promise.all(
      islands.map(async island => this.spriteLoader.getIslandSprites(island))
    );
    console.log("Map sprites loaded.");

    islandSprites.forEach(spritesOfIsland =>
      spritesOfIsland.forEach(row =>
        row
          .filter(sprite => sprite !== null)
          .forEach(sprite => this.world.addChild(sprite!.sprite))
      )
    );
    console.log("Map sprites drawn.");

    return islandSprites;
  };
}
