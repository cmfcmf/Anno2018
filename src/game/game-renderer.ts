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
import { fromEvent, merge } from "rxjs";
import {
  auditTime,
  startWith,
  map,
  distinctUntilChanged
} from "rxjs/operators";
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
import MenuStructure from "./menu-structure";
import { HUD } from "./renderer/isometric/hud";
import { Translator } from "../translation/translator";
import SpriteLoader from "../sprite-loader";
import FieldType from "./field-type";
import Field from "./world/field";
import { City } from "./world/city";
import { FieldContainer } from "./renderer/isometric/field-container";
import { KeyboardManager } from "./renderer/keyboard/keyboard-manager";
import { Key } from "./renderer/keyboard/key";

export const WIDTH = 500;

export const HEIGHT = 350;

console.assert(WIDTH % 2 === 0);
console.assert(HEIGHT % 2 === 0);

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
    const xx = worldPos.x;
    const yy = worldPos.y;
    const x = (xx / (TILE_WIDTH / 2) + yy / (TILE_HEIGHT / 2)) / 2;
    const y = (yy / (TILE_HEIGHT / 2) - xx / (TILE_WIDTH / 2)) / 2;

    return new Point(Math.round(x), Math.round(y) + 1);
  }

  public static worldPosToFieldPosLand(worldPos: Point) {
    const adjustedWorldPos = new Point();
    adjustedWorldPos.copyFrom(worldPos);
    adjustedWorldPos.y -= LAND_OFFSET;

    return this.worldPosToFieldPos(adjustedWorldPos);
  }

  private readonly WIDTH = WIDTH;
  private readonly HEIGHT = HEIGHT;
  private fields: Array<Array<Sprite | null>>;
  private readonly keyboardManager: KeyboardManager;
  private readonly hud: HUD;
  private readonly interactionManager: interaction.InteractionManager;
  private readonly fieldContainer = new FieldContainer("none");

  private active = false;

  constructor(
    private readonly game: Game,
    private readonly islandSpriteLoader: IslandSpriteLoader,
    private readonly app: Application,
    private readonly viewport: Viewport,
    private readonly configLoader: ConfigLoader,
    private readonly animationRenderer: AnimationRenderer,
    private readonly menuRenderer: MenuStructure,
    translator: Translator,
    private readonly spriteLoader: SpriteLoader,
    private readonly myPlayerId: number
  ) {
    this.keyboardManager = new KeyboardManager();
    this.setupHotKeys();

    const hudContainer = new Container();
    this.hud = new HUD(
      this,
      this.menuRenderer,
      translator,
      spriteLoader,
      hudContainer
    );
    app.stage.addChild(hudContainer);
    this.interactionManager = this.app.renderer.plugins.interaction;
  }

  public async begin() {
    if (this.active) {
      throw new Error("Cannot call .begin() twice!");
    }
    this.active = true;

    this.viewport.removeChildren();

    this.keyboardManager.enable();
    this.app.ticker.add(() => {
      // Necessary to update key down state used for moving around.
      this.keyboardManager.update();
    });

    await this.hud.begin(
      new Point(this.viewport.screenWidth, this.viewport.screenHeight)
    );
    this.sendHoveredPositionsToHUD();

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
          .forEach(sprite =>
            this.fieldContainer.addField(
              sprite!.sprite,
              sprite!.mapPosition.x,
              sprite!.mapPosition.y
            )
          )
      );
      spritesOfIsland.smokeSprites.forEach(smokeSprite => {
        this.fieldContainer.addEntity(smokeSprite.sprite, smokeSprite.y);
        smokeSprite.sprite.play();
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
          this.fieldContainer.addField(sprite, x, y);
        }
      })
    );
    this.fields = fields;
    this.viewport.addChild(this.fieldContainer);

    // Render ships
    await this.renderShips();

    // Render soldiers
    // ...

    this.moveCameraToStartPosition(this.myPlayerId);

    this.interactionManager.on("mouseup", async () => {
      const pos = GameRenderer.worldPosToFieldPosLand(
        this.viewport.toWorld(this.interactionManager.mouse.global)
      );
      const island = Object.values(this.game.state.islands).find(each =>
        each.positionRect.contains(pos.x, pos.y)
      );
      if (!island) {
        return;
      }
      const localPosition = new Point(
        pos.x - island.position.x,
        pos.y - island.position.y
      );

      const kontorResult = this.findBuilding(
        this.game.state.kontors,
        island,
        localPosition
      );
      if (kontorResult) {
        return await this.hud.showKontor(
          kontorResult.building,
          island,
          kontorResult.city,
          kontorResult.field,
          kontorResult.config
        );
      }

      const producerResult = this.findBuilding(
        this.game.state.producers,
        island,
        localPosition
      );
      if (producerResult) {
        return await this.hud.showProducer(
          producerResult.building,
          island,
          producerResult.city,
          producerResult.field,
          producerResult.config
        );
      }

      const houseResult = this.findBuilding(
        this.game.state.houses,
        island,
        localPosition
      );
      if (houseResult) {
        return await this.hud.showHouse(
          houseResult.building,
          island,
          houseResult.city,
          houseResult.field,
          houseResult.config
        );
      }
    });

    this.game.addListener("player/money", ({ playerId, money }) => {
      if (playerId === this.myPlayerId) {
        this.hud.setMoney(money);
      }
    });
    this.game.addListener(
      "producer/good-produced",
      ({ island, position, stock }) => {
        this.onProduced(island, position, stock);
      }
    );
    this.game.addListener("simulation-speed", speed =>
      this.hud.setSimulationSpeed(speed)
    );
    this.game.addListener("player/upkeep", ({ playerId, upkeep }) => {
      if (playerId === this.myPlayerId) {
        this.hud.setOperatingCosts(upkeep);
      }
    });
    this.game.addListener("field/changed", async (field: Field) => {
      // FIXME: This is super hacky!
      console.log("renderer: field changed", field);
      const config = this.configLoader.getFieldData().get(field.fieldId)!;
      const island = this.game.state.islands[field.islandId];
      const globalPosition = new Point(
        island.position.x + field.x,
        island.position.y + field.y
      );
      const { sprites: newSprites } = await config.getSprites(
        field.playerId,
        island.position,
        globalPosition,
        field.rotation,
        field.ani,
        await this.spriteLoader.getTextures("STADTFLD"),
        this.animationRenderer
      );

      const existingSprite = this.fields[globalPosition.x][globalPosition.y];
      if (!existingSprite) {
        throw new Error(`Sprite must exist`);
      }
      existingSprite.texture = newSprites[0].sprite.texture;
      // newSprites.forEach(sprite => this.fieldContainer.addChild(sprite.sprite));
    });

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
      // this.fieldContainer.addChild(tmp);
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

    // Karren Test
    /*
    const startFieldPos = new Point(239, 177);
    const path = [
      startFieldPos,
      new Point(startFieldPos.x + 1, startFieldPos.y),
      new Point(startFieldPos.x + 2, startFieldPos.y),
      new Point(startFieldPos.x + 3, startFieldPos.y),
      new Point(startFieldPos.x + 4, startFieldPos.y),
      new Point(startFieldPos.x + 5, startFieldPos.y),
      new Point(startFieldPos.x + 6, startFieldPos.y),
      new Point(startFieldPos.x + 7, startFieldPos.y)
    ];

    const karrenAnimation = await this.animationRenderer.getAnimation("KARREN");
    const start = GameRenderer.landFieldPosToWorldPos(startFieldPos);
    const karrenSprite = karrenAnimation.animations[1].rotations[2].main;
    karrenSprite.x = start.x;
    karrenSprite.y = start.y - karrenAnimation.config.Posoffs[1];
    this.fieldContainer.addChild(karrenSprite);
    karrenSprite.play();

    const currentPathIdx = 0;
    this.app.ticker.add(() => {
      const dx = path[currentPathIdx + 1].x - path[currentPathIdx].x;
      const dy = path[currentPathIdx + 1].y - path[currentPathIdx].y;

      const px = ((dx + dy) * TILE_WIDTH) / 2;
      const py = ((dx + dy) * TILE_HEIGHT) / 2;

      karrenSprite.x +=
        (((1 / this.app.ticker.FPS) * 1000) / karrenAnimation.config.Speed) *
        px;
      karrenSprite.y +=
        (((1 / this.app.ticker.FPS) * 1000) / karrenAnimation.config.Speed) *
        py;
    });
    */
  }

  private findBuilding<T extends { islandId: number; position: Point }>(
    buildings: T[],
    island: Island,
    localPosition: Point
  ): { building: T; field: Field; config: FieldType; city: City } | undefined {
    for (const building of buildings) {
      if (building.islandId !== island.id) {
        continue;
      }
      const field = this.game.getFieldAtIsland(island, building.position)!;
      const config = this.configLoader.getFieldData().get(field.fieldId)!;
      const localPositionRect = new Rectangle(
        building.position.x,
        building.position.y,
        field.rotation % 2 === 0 ? config.size.x : config.size.y,
        field.rotation % 2 === 0 ? config.size.y : config.size.x
      );
      if (localPositionRect.contains(localPosition.x, localPosition.y)) {
        const city = this.game.state.cities.find(
          city =>
            city.islandId === island.id &&
            city.cityIslandNum === field.islandCityNum
        );
        if (!city) {
          throw new Error("City must exist");
        }
        return { building, field, config, city };
      }
    }
  }

  private async renderShips() {
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
    this.keyboardManager.on("down", (key: number) => {
      console.log("key down", key);
      switch (key) {
        case Key.LEFT:
          this.viewport.moveCorner(
            this.viewport.corner.x - SCROLL_SPEED,
            this.viewport.corner.y
          );
          break;
        case Key.RIGHT:
          this.viewport.moveCorner(
            this.viewport.corner.x + SCROLL_SPEED,
            this.viewport.corner.y
          );
          break;
        case Key.UP:
          this.viewport.moveCorner(
            this.viewport.corner.x,
            this.viewport.corner.y - SCROLL_SPEED
          );
          break;
        case Key.DOWN:
          this.viewport.moveCorner(
            this.viewport.corner.x,
            this.viewport.corner.y + SCROLL_SPEED
          );
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

  private zoom(zoom: number) {
    const center = this.viewport.center;
    this.viewport.scale.set(1.0 / zoom);
    this.viewport.moveCenter(center.x, center.y);
  }

  public zoomIn() {
    const currentZoom = 1.0 / this.viewport.scale.x;
    this.zoom(Math.max(1, currentZoom - 1));
  }

  public zoomOut() {
    const currentZoom = 1.0 / this.viewport.scale.x;
    this.zoom(currentZoom + 1);
  }

  // public onMove(listener: (viewport: Viewport) => void) {
  //     new Observable<Viewport>((observer) => {
  //         this.viewport.on("moved", (viewport) => observer.next(viewport));
  //     }).pipe(
  //         debounceTime(1000),
  //     ).subscribe(listener);
  // }

  private onProduced(island: Island, position: Point, stock: number) {
    console.log(
      `Producer at island ${island.id} (${position.x}, ${position.y}) has now stock: ${stock}.`
    );
    // TODO: This uses the wrong color, position, font and timings.
    const text = new Text(`Stock: ${stock >> 5}`, {
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

  private sendHoveredPositionsToHUD() {
    merge(
      fromEvent(this.viewport, "moved"),
      fromEvent(this.viewport, "wheel-scroll"),
      fromEvent(this.interactionManager, "pointermove")
    )
      .pipe(
        auditTime(100),
        startWith(null),
        map(_ => this.viewport.toWorld(this.interactionManager.mouse.global)),
        map(screen => ({
          screen: screen,
          land: GameRenderer.worldPosToFieldPosLand(screen),
          sea: GameRenderer.worldPosToFieldPos(screen)
        })),
        distinctUntilChanged(
          (a, b) => a.land.equals(b.land) && a.sea.equals(b.sea)
        ),
        map(pos => ({
          pos,
          island: Object.values(this.game.state.islands).find(each => {
            return each.positionRect.contains(pos.sea.x, pos.sea.y);
          })
        }))
      )
      .subscribe(({ pos, island }) =>
        this.hud.setHoveredPosition(pos.land, pos.sea, island)
      );
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
