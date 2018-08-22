import * as Viewport from "pixi-viewport";
import IslandRenderer, { TILE_HEIGHT, TILE_WIDTH } from "./island-renderer";
import World from "./world/world";

export default class GameRenderer {
  public static fieldPosToWorldPos(fieldPos: PIXI.PointLike) {
    const xx = fieldPos.x;
    const yy = fieldPos.y;
    const worldX = (xx - yy) * (TILE_WIDTH / 2);
    const worldY = (xx + yy) * Math.floor(TILE_HEIGHT / 2);
    return new PIXI.Point(worldX, worldY);
  }

  constructor(
    private world: World,
    private islandRenderer: IslandRenderer,
    private viewport: Viewport
  ) {}

  public async begin(myPlayerId: number) {
    this.viewport.removeChildren();

    // Render islands
    await this.islandRenderer.render(this.world.islands);

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
