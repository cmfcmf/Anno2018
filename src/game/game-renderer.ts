import { Key, KeyboardManager } from "pixi-keyboard";
import { Viewport } from "pixi-viewport";
import {
  Application,
  Container,
  interaction,
  Point,
  Sprite,
  Text,
  Texture
} from "pixi.js";
import { from, fromEvent, merge } from "rxjs";
import { auditTime } from "rxjs/operators";
import { make2DArray } from "../util/util";
import AnimationRenderer from "./animation-renderer";
import ConfigLoader from "./config-loader";
import Game from "./game";
import IslandRenderer, {
  LAND_OFFSET,
  TILE_HEIGHT,
  TILE_WIDTH
} from "./island-renderer";
import { Island } from "./world/island";
import { SimulationSpeed } from "./world/world";

export default class GameRenderer {
  public static fieldPosToWorldPos(fieldPos: Point) {
    const xx = fieldPos.x;
    const yy = fieldPos.y;
    const worldX = (xx - yy) * (TILE_WIDTH / 2);
    const worldY = (xx + yy) * (TILE_HEIGHT / 2);
    return new Point(worldX, worldY);
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
    private readonly islandRenderer: IslandRenderer,
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
    this.simulationSpeedDisplay.y = 4 * 30;
  }

  public async begin() {
    this.keyboardManager.enable();
    this.debugControls();

    this.viewport.removeChildren();

    // Render islands
    const spritesPerIsland = await this.islandRenderer.render(
      Object.values(this.game.state.islands)
    );

    const fields = make2DArray<Sprite>(this.WIDTH, this.HEIGHT);
    spritesPerIsland.forEach(spritesOfIsland =>
      spritesOfIsland.forEach(row =>
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

    await Promise.all(
      this.game.state.ships.map(async ship => {
        const animation = await this.animationRenderer.getShipAnimation(ship);

        const { rotation, playerId } = ship;
        const { x, y } = GameRenderer.fieldPosToWorldPos(ship.position);
        const { main, bug } = animation[0].sprites[rotation];
        if (bug) {
          this.animationRenderer.debugDrawSprite(bug, this.viewport, x, y);
        }
        this.animationRenderer.debugDrawSprite(main, this.viewport, x, y);
        // TODO: Fahne for playerId
      })
    );

    merge(
      from(["initial"]),
      fromEvent(this.viewport as any, "zoomed"),
      fromEvent(this.viewport as any, "moved")
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

          producerInfo.text = `Producer: Stock: ${producer.stock} (max: ${fieldConfig.production.maxStock}, good: ${fieldConfig.production.good}), Good A: ${producer.firstGoodStock} (required: ${fieldConfig.production.amount1}, good: ${fieldConfig.production.good1}), Good B: ${producer.secondGoodStock} (required: ${fieldConfig.production.amount2}, good: ${fieldConfig.production.good2}), Active: ${producer.active}, Timer: ${producer.timer}`;
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
