import * as PIXI from "pixi.js";
import {TILE_HEIGHT, TILE_WIDTH} from "./game-renderer";
import {SpriteWithPositionAndLayer, WorldLayer} from "./world-field";

export type LandFieldType =
    "BODEN"
    | "FLUSS"
    | "FLUSSECK"
    | "HANG"
    | "HANGQUELL"
    | "HANGECK"
    | "STRAND"
    | "STRANDMUND"
    | "STRANDRUINE"
    | "STRANDECKI"
    | "STRANDECKA"
    | "STRANDVARI"
    | "BRANDUNG"
    | "BRANDECK"
    | "PIER"
    | "MEER"
    | "WALD"
    | "RUINE"
    | "STRANDHAUS"
    | "HAFEN"
    | "FELS"
    | "MUENDUNG";

export type BuildingFieldType =
    "GEBAEUDE"
    | "HQ"
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

export type FieldType = LandFieldType | BuildingFieldType;
export type Rotation = 0 | 1 | 2 | 3;

export default class Field {
    private readonly id: number;
    private readonly gfxId: number;
    private readonly kind: FieldType;
    private readonly size: PIXI.Point;
    private readonly rotate: number;
    private readonly animAdd: number;
    private readonly yOffset: number;
    private readonly animTime: number;
    private readonly animAnz: number;

    constructor(config: any) {
        this.id = config.Id;
        this.gfxId = config.Gfx;
        this.kind = config.Kind;
        this.size = new PIXI.Point(config.Size.x, config.Size.y);
        this.rotate = config.Rotate;
        this.animAdd = config.AnimAdd;
        this.animAnz = config.AnimAnz;
        this.animTime = config.AnimTime === 'TIMENEVER' ? -1 : config.AnimTime;
        this.yOffset = -config.Posoffs;
    }

    public getSprites(worldPos: PIXI.Point, rotation: Rotation, animationStep: number,
                      textures: Map<number, PIXI.Texture>, layer: WorldLayer) {
        const sprites: SpriteWithPositionAndLayer[] = [];
        const sx = rotation % 2 === 0 ? this.size.x : this.size.y;
        const sy = rotation % 2 === 0 ? this.size.y : this.size.x;
        for (let y = 0; y < sy; y++) {
            for (let x = 0; x < sx; x++) {
                const xx = worldPos.x + x;
                const yy = worldPos.y + y;
                const worldX = (xx - yy) * (TILE_WIDTH / 2);
                const worldY = (xx + yy) * Math.floor(TILE_HEIGHT / 2);

                let sprite;
                if (this.animAdd === 0 || this.animTime === -1) {
                    const texture = this.getTexture(x, y, rotation, animationStep, textures);
                    sprite = new PIXI.Sprite(texture);
                } else {
                    const animatedTextures = [];
                    for (let i = 0; i < this.animAnz; i++) {
                        animatedTextures.push(this.getTexture(x, y, rotation, i, textures));
                    }
                    sprite = new PIXI.extras.AnimatedSprite(animatedTextures);
                    sprite.animationSpeed = (1.0 / 60.0) * (1000.0 / this.animTime);
                    sprite.play();
                }
                sprite.x = worldX;
                sprite.y = worldY + this.yOffset - sprite.height;
                sprites.push({sprite: sprite, position: new PIXI.Point(xx, yy), layer: layer});
            }
        }

        return sprites;
    }

    private getTexture(x: number, y: number, rotation: Rotation, animationStep: number,
                       textures: Map<number, PIXI.Texture>) {
        let tileId = this.gfxId;
        if (this.rotate > 0) {
            tileId += rotation * this.size.x * this.size.y;
        }
        tileId += animationStep * this.animAdd;

        if (rotation === 0) {
            tileId += y * this.size.x + x;
        } else if (rotation === 1) {
            tileId += this.size.x * this.size.y - 1 - (x * this.size.x + (this.size.x - 1 - y));
        } else if (rotation === 2) {
            tileId += (this.size.y - 1 - y) * this.size.x + (this.size.x - 1 - x);
        } else if (rotation === 3) {
            tileId += x * this.size.x + (this.size.x - 1 - y);
        } else {
            throw new Error(`Invalid building rotation: ${rotation}.`);
        }

        return textures.get(tileId);
    }
}
