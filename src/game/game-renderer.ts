import { Key, KeyboardManager, Keys } from "pixi-keyboard";
import { Viewport } from "pixi-viewport";
import {
  Application,
  Container,
  Graphics,
  interaction,
  Point,
  Sprite,
  Text,
  Texture,
  Rectangle
} from "pixi.js";
import { from, fromEvent, merge } from "rxjs";
import { auditTime } from "rxjs/operators";
import { make2DArray } from "../util/util";
import AnimationRenderer from "./animation-renderer";
import ConfigLoader from "./config-loader";
import Game from "./game";
import { LAND_OFFSET, TILE_HEIGHT, TILE_WIDTH } from "./island-renderer";
import IslandSpriteLoader from "./island-sprite-loader";
import { RenderedShip } from "./renderer/isometric/renderered-ship";
import { Island } from "./world/island";
import { SHIP_TYPES } from "./world/ship";
import { SimulationSpeed } from "./world/world";
import { isWithinRadius } from "./radius";

export default class GameRenderer {
  public static fieldPosToWorldPos(fieldPos: Point) {
    const xx = fieldPos.x;
    const yy = fieldPos.y;
    const worldX = (xx - yy) * (TILE_WIDTH / 2);
    const worldY = (xx + yy) * (TILE_HEIGHT / 2);
    return new Point(worldX, worldY);
  }

  public static landFieldPosToWorldPos(fieldPos: Point) {
    const result = this.fieldPosToWorldPos(fieldPos);
    result.y += LAND_OFFSET;
    return result;
  }

  /**
   * Converts PIXI world coordinates to isometric coordinates.
   * Please note that these are *sea-level* coordinates. Use
   * worldPosToFieldPosLand for *land-level* coordinates.
   */
  public static worldPosToFieldPos(worldPos: Point) {
    const x =
      (worldPos.x / (TILE_WIDTH / 2) + worldPos.y / (TILE_HEIGHT / 2)) / 2;
    const y =
      (worldPos.y / (TILE_HEIGHT / 2) - worldPos.x / (TILE_WIDTH / 2)) / 2;

    return new Point(Math.round(x), Math.round(y) + 1);
  }

  public static worldPosToFieldPosLand(worldPos: Point) {
    const adjustedWorldPos = new Point();
    adjustedWorldPos.copyFrom(worldPos);
    adjustedWorldPos.y -= LAND_OFFSET;

    return this.worldPosToFieldPos(adjustedWorldPos);
  }

  private money: Text;
  private simulationSpeedDisplay: Text;
  private readonly WIDTH = 500;
  private readonly HEIGHT = 350;
  private fields: Array<Array<Sprite | null>>;
  private readonly keyboardManager: KeyboardManager;

  constructor(
    private readonly game: Game,
    private readonly islandSpriteLoader: IslandSpriteLoader,
    private readonly app: Application,
    private readonly viewport: Viewport,
    private readonly configLoader: ConfigLoader,
    private readonly animationRenderer: AnimationRenderer,
    private readonly myPlayerId: number
  ) {
    this.keyboardManager = new KeyboardManager();
    this.setupHotKeys();

    this.money = new Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
    this.money.y = 0 * 30;
    this.simulationSpeedDisplay = new Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
    this.simulationSpeedDisplay.y = 5 * 30;
  }

  public async begin() {
    this.keyboardManager.enable();
    this.app.ticker.add(() => {
      // Necessary to update key down state used for moving around.
      this.keyboardManager.update();
    });

    this.viewport.removeChildren();
    this.debugControls();

    const dbg = (xx: number, yy: number, w: number = 5, h: number = 5) => {
      const rect = new Graphics();
      rect.position.set(xx, yy);
      rect.beginFill(0x00ff00);
      rect.drawRect(0, 0, w, h);
      this.viewport.addChild(rect);
    };

    // Render islands
    const spritesPerIsland = await Promise.all(
      Object.values(this.game.state.islands).map(island =>
        this.islandSpriteLoader.getIslandSprites(island)
      )
    );
    console.log("Map sprites loaded.");

    spritesPerIsland.forEach(spritesOfIsland => {
      spritesOfIsland.sprites.forEach(row =>
        row
          .filter(sprite => sprite !== null)
          .forEach(sprite => this.viewport.addChild(sprite!.sprite))
      );
      spritesOfIsland.smokeSprites.forEach(smokeSprite => {
        this.viewport.addChild(smokeSprite);
        smokeSprite.play();
        dbg(smokeSprite.x, smokeSprite.y, 3, 3);
      });
    });
    console.log("Map sprites drawn.");

    const fields = make2DArray<Sprite>(this.WIDTH, this.HEIGHT);
    spritesPerIsland.forEach(spritesOfIsland =>
      spritesOfIsland.sprites.forEach(row =>
        row
          .filter(sprite => sprite !== null)
          .forEach(
            sprite =>
              (fields[sprite!.mapPosition.x][
                sprite!.mapPosition.y
              ] = sprite!.sprite)
          )
      )
    );

    // TODO: Hack to find the water texture.
    let waterTexture: Texture | null = null;
    for (let x = 0; x < this.WIDTH && !waterTexture; x++) {
      for (let y = 0; y < this.HEIGHT; y++) {
        if (fields[x][y]) {
          waterTexture = fields[x][y]!.texture;
          break;
        }
      }
    }

    // Fill in water between islands
    fields.forEach((row, x) =>
      row.forEach((field, y) => {
        if (field === null) {
          // TODO: This should be an animated sprite.
          const sprite = new Sprite(waterTexture!);

          const { x: worldX, y: worldY } = GameRenderer.fieldPosToWorldPos(
            new Point(x, y)
          );
          // Set bottom left corner of sprite as origin.
          sprite.anchor.set(0, 1);
          sprite.x = worldX;
          sprite.y = worldY;

          fields[x][y] = sprite;
          this.viewport.addChild(sprite);
        }
      })
    );
    this.fields = fields;

    // Render ships
    // ...

    // Render soldiers
    // ...

    this.moveCameraToStartPosition(this.myPlayerId);

    const renderedShips = this.game.state.ships
      // TODO: We ignore the land trader for now
      .filter(ship => SHIP_TYPES[ship.type] !== "TRADER1")
      .map(ship => new RenderedShip(ship.id, ship.playerId === 4));

    await Promise.all(
      this.game.state.ships
        .filter(ship => SHIP_TYPES[ship.type] !== "TRADER1")
        .map(ship =>
          renderedShips
            .find(each => each.id === ship.id)!
            .begin(ship, this.animationRenderer)
        )
    );
    this.game.state.ships
      .filter(ship => SHIP_TYPES[ship.type] !== "TRADER1")
      .forEach(ship => {
        renderedShips
          .find(each => each.id === ship.id)!
          .render(ship, this.viewport);
      });

    merge(
      from(["initial"]),
      fromEvent(this.viewport, "zoomed"),
      fromEvent(this.viewport, "moved")
    )
      .pipe(auditTime(200))
      .subscribe(this.cull);

    this.game.addListener("player/money", ({ playerId, money }) => {
      if (playerId === this.myPlayerId) {
        this.setMoney(money);
      }
    });
    this.game.addListener(
      "producer/good-produced",
      ({ island, position, stock }) => {
        this.onProduced(island, position, stock);
      }
    );
    this.game.addListener(
      "simulation-speed",
      speed => (this.simulationSpeedDisplay.text = `Simulation speed: ${speed}`)
    );

    const highlightField = (
      annoX: number,
      annoY: number,
      color: number = 0xff0000
    ) => {
      let { x, y } = GameRenderer.landFieldPosToWorldPos(
        new Point(annoX, annoY)
      );
      x += TILE_WIDTH / 2;
      y -= TILE_HEIGHT;
      const tmp = new Graphics();
      tmp.beginFill(color);
      tmp.alpha = 0.2;
      tmp.visible = this.showRadiusOfAllBuildings;
      tmp.drawPolygon([
        new Point(x, y),
        new Point(x + TILE_WIDTH / 2, y + TILE_HEIGHT / 2),
        new Point(x, y + TILE_HEIGHT),
        new Point(x - TILE_WIDTH / 2, y + TILE_HEIGHT / 2)
      ]);
      this.radiusSprites.push(tmp);
      this.viewport.addChild(tmp);
    };

    this.game.state.producers.forEach(producer => {
      const island = this.game.state.islands[producer.islandId];

      const base = new Point(
        island.position.x + producer.position.x,
        island.position.y + producer.position.y
      );
      const fieldData = this.game.getFieldAtIsland(island, producer.position)!;
      const fieldConfig = this.configLoader
        .getFieldData()
        .get(fieldData.fieldId)!;
      const size = fieldConfig.size;
      const actualSizeX = fieldData.rotation % 2 === 0 ? size.x : size.y;
      const actualSizeY = fieldData.rotation % 2 === 0 ? size.y : size.x;
      const radius = fieldConfig.production.radius;

      for (let x = 0; x < actualSizeX; x++) {
        for (let y = 0; y < actualSizeY; y++) {
          highlightField(base.x + x, base.y + y);
        }
      }

      const buildingRectangle = new Rectangle(
        base.x,
        base.y,
        actualSizeX,
        actualSizeY
      );
      for (let x = -20; x < 20; x++) {
        for (let y = -20; y < 20; y++) {
          if (
            isWithinRadius(
              buildingRectangle,
              radius,
              new Point(base.x + x, base.y + y)
            )
          ) {
            highlightField(base.x + x, base.y + y, 0xffff00);
          }
        }
      }
    });
  }

  private setupHotKeys() {
    const showTaskKey = Key.F1;
    this.keyboardManager.onKeyPressedWithPreventDefault(showTaskKey, () => {
      const player = this.game.state.players[this.myPlayerId];
      const assignedTask = this.game.state.tasks[player.assignedTaskId];
      if (assignedTask !== undefined) {
        console.info(assignedTask.text);
      } else {
        console.info("It appears like you have no task :/");
      }
    });

    const zoomKeys: Array<{ key: number; zoom: 1 | 2 | 3 }> = [
      { key: Key.F2, zoom: 1 },
      { key: Key.F3, zoom: 2 },
      { key: Key.F4, zoom: 3 }
    ];
    for (const zoomKey of zoomKeys) {
      this.keyboardManager.onKeyPressedWithPreventDefault(zoomKey.key, () =>
        this.zoom(zoomKey.zoom)
      );
    }

    const speedKeys = [
      { keys: [Key.PAUSE], speed: SimulationSpeed.Paused },
      { keys: [Key.F5], speed: SimulationSpeed.Slow },
      { keys: [Key.F6], speed: SimulationSpeed.Medium },
      { keys: [Key.F7], speed: SimulationSpeed.Fast },
      { keys: [Key.SHIFT, Key.F8], speed: SimulationSpeed.SuperFast }
    ];
    for (const speedKey of speedKeys) {
      this.keyboardManager.onKeysPressedWithPreventDefault(speedKey.keys, () =>
        this.game.setSimulationSpeed(speedKey.speed)
      );
    }

    const SCROLL_SPEED = 50;
    [Key.LEFT, Key.RIGHT, Key.UP, Key.DOWN].forEach(key =>
      this.keyboardManager.setPreventDefault(key)
    );
    this.keyboardManager.on("down", (key: Keys) => {
      console.log("key down", key);
      switch (key) {
        case Key.LEFT:
          this.viewport.moveCorner(
            this.viewport.corner.x - SCROLL_SPEED,
            this.viewport.corner.y
          );
          this.cull();
          break;
        case Key.RIGHT:
          this.viewport.moveCorner(
            this.viewport.corner.x + SCROLL_SPEED,
            this.viewport.corner.y
          );
          this.cull();
          break;
        case Key.UP:
          this.viewport.moveCorner(
            this.viewport.corner.x,
            this.viewport.corner.y - SCROLL_SPEED
          );
          this.cull();
          break;
        case Key.DOWN:
          this.viewport.moveCorner(
            this.viewport.corner.x,
            this.viewport.corner.y + SCROLL_SPEED
          );
          this.cull();
          break;
        default:
          break;
      }
    });

    // TODO: Temporary and for debugging only
    this.keyboardManager.onKeyPressedWithPreventDefault(Key.R, () => {
      this.toggleShowRadiusOfAllBuildings();
    });
  }

  private showRadiusOfAllBuildings = false;
  private radiusSprites: Container[] = [];
  private toggleShowRadiusOfAllBuildings() {
    this.showRadiusOfAllBuildings = !this.showRadiusOfAllBuildings;
    this.radiusSprites.forEach(
      each => (each.visible = this.showRadiusOfAllBuildings)
    );
  }

  private zoom(zoom: 1 | 2 | 3) {
    const center = this.viewport.center;
    this.viewport.scale.set(1.0 / zoom);
    this.viewport.moveCenter(center.x, center.y);
    this.cull();
  }

  // public onMove(listener: (viewport: Viewport) => void) {
  //     new Observable<Viewport>((observer) => {
  //         this.viewport.on("moved", (viewport) => observer.next(viewport));
  //     }).pipe(
  //         debounceTime(1000),
  //     ).subscribe(listener);
  // }

  private setMoney = (money: number) => {
    this.money.text = `Money: ${money}`;
  };

  private onProduced(island: Island, position: Point, stock: number) {
    console.log(
      `Producer at island ${island.id} (${position.x}, ${position.y}) has now stock: ${stock}.`
    );
    // TODO: This uses the wrong color, position, font and timings.
    const text = new Text(`Stock: ${stock}`, {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });

    const pos = GameRenderer.fieldPosToWorldPos(
      new Point(island.position.x + position.x, island.position.y + position.y)
    );
    text.position.set(pos.x, pos.y);
    this.viewport.addChild(text);

    const duration = 2000;
    const startTime = this.app.ticker.lastTime;
    const fn = () => {
      text.position.y =
        text.position.y - (this.app.ticker.deltaMS * 100) / duration;
      if (this.app.ticker.lastTime - startTime > duration) {
        this.app.ticker.remove(fn);
        this.viewport.removeChild(text);
      }
    };
    this.app.ticker.add(fn);
  }

  private cull = () => {
    const viewportBounds = this.viewport.getVisibleBounds();

    const topLeft = GameRenderer.worldPosToFieldPos(
      new Point(viewportBounds.x - TILE_WIDTH, viewportBounds.y - TILE_HEIGHT)
    );
    const bottomRight = GameRenderer.worldPosToFieldPos(
      new Point(
        viewportBounds.x + viewportBounds.width + TILE_WIDTH,
        // we need to add the height of the highest sprite in the game, so
        // that it is still drawn even if it is below the viewport.
        // TODO: Verify that 200 fits.
        viewportBounds.y + viewportBounds.height + TILE_HEIGHT + 200
      )
    );

    for (let x = 0; x < this.WIDTH; x++) {
      for (let y = 0; y < this.HEIGHT; y++) {
        const field = this.fields[x][y];
        if (!field) {
          continue;
        }
        field.visible =
          x + y >= topLeft.x + topLeft.y &&
          x - y >= topLeft.x - topLeft.y &&
          x + y <= bottomRight.x + bottomRight.y &&
          x - y <= bottomRight.x - bottomRight.y;
      }
    }
  };

  private debugControls() {
    const debugContainer = new Container();

    debugContainer.addChild(this.money);
    const coordinates = new Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
    coordinates.y = 1 * 30;
    debugContainer.addChild(coordinates);

    const islandNumber = new Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
    islandNumber.y = 2 * 30;
    debugContainer.addChild(islandNumber);

    const producerInfo = new Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
    producerInfo.y = 3 * 30;
    debugContainer.addChild(producerInfo);

    debugContainer.addChild(this.simulationSpeedDisplay);

    const interactionManager: interaction.InteractionManager = this.app.renderer
      .plugins.interaction;

    const updatePosition = () => {
      const pos = GameRenderer.worldPosToFieldPosLand(
        this.viewport.toWorld(interactionManager.mouse.global)
      );
      coordinates.text = `x: ${pos.x}, y: ${pos.y}`;

      const island = Object.values(this.game.state.islands).find(each => {
        return each.positionRect.contains(pos.x, pos.y);
      });

      if (island) {
        const localPosition = new Point(
          pos.x - island.position.x,
          pos.y - island.position.y
        );

        islandNumber.text = `Island id: ${island.id}, x: ${localPosition.x} y: ${localPosition.y}`;

        const producer = this.game.state.producers.find(
          each =>
            each.islandId === island.id &&
            each.position.x === localPosition.x &&
            each.position.y === localPosition.y
        );
        if (producer) {
          const fieldData = this.game.getFieldAtIsland(
            island,
            producer.position
          )!;
          const fieldConfig = this.configLoader
            .getFieldData()
            .get(fieldData.fieldId)!;

          producerInfo.text = `Producer: Stock: ${producer.stock} (max: ${fieldConfig.production.maxStock}, good: ${fieldConfig.production.good}), Good A: ${producer.firstGoodStock} (required: ${fieldConfig.production.amount1}, good: ${fieldConfig.production.good1}), Good B: ${producer.secondGoodStock} (required: ${fieldConfig.production.amount2}, good: ${fieldConfig.production.good2}),\n Active: ${producer.active}, Timer: ${producer.timer}, Rotation: ${fieldData.rotation}`;
        } else {
          producerInfo.text = "No Producer";
        }
      } else {
        islandNumber.text = `Island id: ?`;
      }
    };
    updatePosition();
    this.viewport.on("moved", updatePosition);
    this.viewport.on("wheel-scroll", updatePosition);
    interactionManager.on("pointermove", updatePosition);

    this.viewport.parent.addChild(debugContainer);
  }

  private moveCameraToStartPosition(myPlayerId: number) {
    const myKontor = this.game.state.kontors.find(
      kontor => kontor.playerId === myPlayerId
    );
    if (myKontor !== undefined) {
      const position = myKontor.position;
      const kontorIsland = Object.values(this.game.state.islands).find(
        island => island.id === myKontor.islandId
      )!;
      this.moveTo(
        new Point(
          kontorIsland.position.x + position.x,
          kontorIsland.position.y + position.y
        )
      );
      return;
    }
    const myShip = this.game.state.ships.find(
      ship => ship.playerId === myPlayerId
    );
    if (myShip !== undefined) {
      this.moveTo(myShip.position);
      return;
    }
    this.moveTo(new Point(500 / 2, 300 / 2));
  }

  private moveTo(point: Point) {
    this.viewport.moveCenter(GameRenderer.fieldPosToWorldPos(point));
  }
}
