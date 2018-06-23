import * as PIXI from "pixi.js";
import Field, {Rotation} from "./field";

export default class WorldField {
    public constructor(private fieldConfig: Field, private origin: PIXI.Point, private rotation: Rotation,
                       private animationStep: number) {
    }

    public getSprites(world: PIXI.Container, textures: Map<number, PIXI.Texture>) {
        return this.fieldConfig.getSprites(this.origin, this.rotation, this.animationStep, textures);
    }

    public tick() {
        // Grow trees, etc.
    }
}
