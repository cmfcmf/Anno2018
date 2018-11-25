import * as Viewport from "pixi-viewport";
import IslandRenderer, {
  LAND_OFFSET,
  TILE_HEIGHT,
  TILE_WIDTH
} from "./island-renderer";
import { Island } from "./world/island";
import World from "./world/world";

export default class GameRenderer {
  public static fieldPosToWorldPos(fieldPos: PIXI.PointLike) {
    const xx = fieldPos.x;
    const yy = fieldPos.y;
    const worldX = (xx - yy) * (TILE_WIDTH / 2);
    const worldY = (xx + yy) * (TILE_HEIGHT / 2);
    return new PIXI.Point(worldX, worldY);
  }

  /**
   * Converts PIXI world coordinates to isometric coordinates.
   * Please note that these are *sea-level* coordinates. Use
   * worldPosToFieldPosLand for *land-level* coordinates.
   */
  public static worldPosToFieldPos(worldPos: PIXI.PointLike) {
    const x =
      (worldPos.x / (TILE_WIDTH / 2) + worldPos.y / (TILE_HEIGHT / 2)) / 2;
    const y =
      (worldPos.y / (TILE_HEIGHT / 2) - worldPos.x / (TILE_WIDTH / 2)) / 2;

    return new PIXI.Point(Math.round(x), Math.round(y) + 1);
  }

  public static worldPosToFieldPosLand(worldPos: PIXI.PointLike) {
    const adjustedWorldPos = new PIXI.Point();
    adjustedWorldPos.copy(worldPos);
    adjustedWorldPos.y -= LAND_OFFSET;

    return this.worldPosToFieldPos(adjustedWorldPos);
  }

  private money: PIXI.Text;

  constructor(
    private readonly world: World,
    private readonly islandRenderer: IslandRenderer,
    private readonly app: PIXI.Application,
    private readonly viewport: Viewport
  ) {
    this.money = new PIXI.Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
  }

  public async begin(myPlayerId: number) {
    this.debugControls();

    this.viewport.removeChildren();

    // Render islands
    const spritesPerIsland = await this.islandRenderer.render(
      this.world.islands
    );

    // spritesPerIsland.forEach((sprites, idx) => {
    //   if (idx !== 4) {
    //     sprites.forEach(sprite => (sprite.sprite.visible = false));
    //   }
    // });
    /*
    let i = 0;
    setInterval(() => {
      spritesPerIsland[i].forEach(sprite => sprite.sprite.visible = false);
      i++;
      if (i === spritesPerIsland.length) {
        i = 0;
      }
      console.log(`Rendering island ${i}.`);
      spritesPerIsland[i].forEach(sprite => sprite.sprite.visible = true);
    }, 1000);
    */

    // Render ships
    // ...

    // Render soldiers
    // ...

    this.moveCameraToStartPosition(myPlayerId);
  }

  public zoom(zoom: 1 | 2 | 3) {
    const center = this.viewport.center;
    this.viewport.scale.set(1.0 / zoom);
    this.viewport.moveCenter(center.x, center.y);
  }

  // public onMove(listener: (viewport: Viewport) => void) {
  //     new Observable<Viewport>((observer) => {
  //         this.viewport.on("moved", (viewport) => observer.next(viewport));
  //     }).pipe(
  //         debounceTime(1000),
  //     ).subscribe(listener);
  // }

  public setMoney = (money: number) => {
    this.money.text = `Money: ${money}`;
  };

  public onProduced(island: Island, position: PIXI.Point, stock: number) {
    console.log(
      `Producer at island ${island.id} (${position.x}, ${
        position.y
      }) has now stock: ${stock}.`
    );
    const text = new PIXI.Text(`Lager: ${stock}`, {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });

    const pos = GameRenderer.fieldPosToWorldPos(
      new PIXI.Point(
        island.position.x + position.x,
        island.position.y + position.y
      )
    );
    text.position.set(pos.x, pos.y);
    this.viewport.addChild(text);
  }

  private debugControls() {
    const debugContainer = new PIXI.Container();

    debugContainer.addChild(this.money);
    const coordinates = new PIXI.Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
    coordinates.y = 30;

    const islandNumber = new PIXI.Text("", {
      fontFamily: "Arial",
      fontSize: 24,
      fill: 0xff1010
    });
    islandNumber.y = 2 * 30;

    const interactionManager: PIXI.interaction.InteractionManager = this.app
      .renderer.plugins.interaction;

    const updatePosition = () => {
      const pos = GameRenderer.worldPosToFieldPosLand(
        this.viewport.toWorld(interactionManager.mouse.global)
      );
      coordinates.text = `x: ${pos.x}, y: ${pos.y}`;

      const island = this.world.islands.find(each => {
        return each.positionRect.contains(pos.x, pos.y);
      });
      if (island) {
        islandNumber.text = `Island id: ${island.id}, x: ${pos.x -
          island.position.x} y: ${pos.y - island.position.y}`;
      } else {
        islandNumber.text = `Island id: ?`;
      }
    };
    updatePosition();
    this.viewport.on("moved", updatePosition);
    this.viewport.on("wheel-scroll", updatePosition);
    interactionManager.on("pointermove", updatePosition);

    debugContainer.addChild(coordinates);
    debugContainer.addChild(islandNumber);
    this.viewport.parent.addChild(debugContainer);
  }

  private moveCameraToStartPosition(myPlayerId: number) {
    const myKontor = this.world.kontors.find(
      kontor => kontor.playerId === myPlayerId
    );
    if (myKontor !== undefined) {
      const position = myKontor.position;
      const kontorIsland = this.world.islands.find(
        island => island.id === myKontor.islandId
      );
      this.moveTo(
        new PIXI.Point(
          kontorIsland.position.x + position.x,
          kontorIsland.position.y + position.y
        )
      );
      return;
    }
    const myShip = this.world.ships.find(ship => ship.playerId === myPlayerId);
    if (myShip !== undefined) {
      this.moveTo(myShip.position);
      return;
    }
    this.moveTo(new PIXI.Point(500 / 2, 300 / 2));
  }

  private moveTo(point: PIXI.Point) {
    this.viewport.moveCenter(GameRenderer.fieldPosToWorldPos(point));
  }
}
