import * as PIXI from "pixi.js";
import Field, {Rotation} from "./field";

export type WorldLayer = "land"|"building";

export interface SpriteWithPositionAndLayer {
    sprite: PIXI.Sprite;
    position: PIXI.Point;
    layer: WorldLayer;
}

/**
 * A WorldField represents a single instance of a building or field.
 * For example, a bakery is transformed into a WorldField just as a
 * water tile is.
 *
 * A WorldField is NOT a single 1x1 tile on the tilemap.
 */
export default class WorldField {
    public constructor(private fieldConfig: Field, public origin: PIXI.Point, private rotation: Rotation,
                       private animationStep: number, public layer: WorldLayer) {
    }

    public getSprites(world: PIXI.Container, textures: Map<number, PIXI.Texture>) {
        return this.fieldConfig.getSprites(this.origin, this.rotation, this.animationStep, textures, this.layer);
    }

    public tick() {
        // Grow trees, etc.
    }
}
