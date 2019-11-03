import { Viewport } from "pixi-viewport";
import { Graphics } from "pixi.js";
import assert from "../../../util/assert";
import { assertNever } from "../../../util/util";
import AnimationRenderer, { MyAnimation } from "../../animation-renderer";
import GameRenderer from "../../game-renderer";
import { TILE_HEIGHT, TILE_WIDTH } from "../../island-renderer";
import { Ship } from "../../world/ship";

export class RenderedShip {
  private animation: MyAnimation;
  private bugAnimation: MyAnimation;
  private whiteFlag: MyAnimation;
  private flag: MyAnimation;
  private hp: Graphics;

  private readonly HP_WIDTH = 38;
  private readonly HP_HEIGHT = 7;

  constructor(public readonly id: number, private readonly isTrader: boolean) {}

  public async begin(ship: Ship, animationRenderer: AnimationRenderer) {
    this.animation = await animationRenderer.getShipAnimation(ship);

    assert(this.animation.config.Bugfignr);
    this.bugAnimation = await animationRenderer.getAnimation(
      this.animation.config.Bugfignr
    );

    this.whiteFlag = await animationRenderer.getAnimation("FAHNEWEISS");
    if (!this.isTrader) {
      const flagAnimationName = `FAHNE${
        ship.playerId === 5 ? "PIRAT" : ship.playerId + 1
      }`;
      this.flag = await animationRenderer.getAnimation(flagAnimationName);
      this.hp = new Graphics();

      this.hp.beginFill(0x00ff00);
      this.hp.drawRect(0, 0, this.HP_WIDTH, this.HP_HEIGHT);
    }
  }

  // TODO: Animations are added to the viewport multiple times if this is called multiple times.
  public render(ship: Ship, viewport: Viewport) {
    const { rotation } = ship;
    const { x, y } = GameRenderer.fieldPosToWorldPos(ship.position);
    const { main } = this.animation.animations[0].rotations[rotation];

    const offsetX = -Math.floor(main.width / 2) + TILE_WIDTH / 2;
    const offsetY = this.animation.config.Posoffs[0] + 18; // TODO: Where does the 18 come from?

    const mainX = x + offsetX;
    const mainY = y + offsetY;

    // We can't simply use Math.floor, since Math.floor(-1.5) === -2.
    // However, what we want is -1.
    const floor = (n: number) => {
      return Math.sign(n) * Math.floor(Math.abs(n));
    };

    // TODO: We should also use Fahnoffs[0]. However, this is not that big
    // of an issue, since all ships have Fahnoffs[0] = 0.
    const Fahnoffs = this.animation.config.Fahnoffs;

    let flagOffsetX = x + TILE_WIDTH / 2;
    switch (rotation) {
      case 0:
      case 2:
        flagOffsetX += floor((Fahnoffs[1] * TILE_WIDTH) / 2);
        break;
      case 4:
      case 6:
        flagOffsetX += -floor((Fahnoffs[1] * TILE_WIDTH) / 2);
        break;
      case 1:
        flagOffsetX += floor((Fahnoffs[1] * TILE_WIDTH * Math.sqrt(2)) / 2);
        break;
      case 5:
        flagOffsetX += -floor((Fahnoffs[1] * TILE_WIDTH * Math.sqrt(2)) / 2);
        break;
      case 3:
      case 7:
        flagOffsetX += 0;
        break;
      default:
        assertNever(rotation);
    }

    let flagOffsetY = y + 48;
    switch (rotation) {
      case 2:
      case 4:
        flagOffsetY += floor((Fahnoffs[1] * TILE_HEIGHT) / 2);
        break;
      case 0:
      case 6:
        flagOffsetY += -floor((Fahnoffs[1] * TILE_HEIGHT) / 2);
        break;
      case 3:
        flagOffsetY += floor((Fahnoffs[1] * TILE_HEIGHT * Math.sqrt(2)) / 2);
        break;
      case 7:
        flagOffsetY += -floor((Fahnoffs[1] * TILE_HEIGHT * Math.sqrt(2)) / 2);
        break;
      case 1:
      case 5:
        flagOffsetY += 0;
        break;
      default:
        assertNever(rotation);
    }

    if (this.animation.config.Bugfignr) {
      const waveSprite = this.bugAnimation.animations[0].rotations[rotation]
        .main;
      waveSprite.x = flagOffsetX - Math.floor(waveSprite.width / 2);
      waveSprite.y = flagOffsetY - 30;
      viewport.addChild(waveSprite);
      waveSprite.play();
    }

    main.x = mainX;
    main.y = mainY;
    viewport.addChild(main);
    main.play();

    if (this.isTrader) {
      // No flag or hp for the trader
      return;
    }

    // TODO: Support for white flag
    const flagAnimation = this.flag.animations[0].rotations[0].main;

    const flagX = flagOffsetX - Math.floor(flagAnimation.width / 2);
    const flagY = flagOffsetY - Math.floor(Fahnoffs[2] * TILE_HEIGHT);

    flagAnimation.x = flagX;
    flagAnimation.y = flagY;
    viewport.addChild(flagAnimation);
    flagAnimation.play();

    // TODO: Check color and make it red if you lose hp

    const hpX = x + TILE_WIDTH / 2 - this.HP_WIDTH / 2;
    const hpY = flagY - flagAnimation.height - this.HP_HEIGHT;
    this.hp.position.set(hpX, hpY);
    viewport.addChild(this.hp);
  }
}
