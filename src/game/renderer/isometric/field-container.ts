import {
  Container,
  DisplayObject,
  Point,
  Graphics,
  Renderer,
  Text
} from "pixi.js";
import GameRenderer, { WIDTH, HEIGHT } from "../../game-renderer";
import { TILE_HEIGHT, TILE_WIDTH } from "../../island-renderer";
import { Viewport } from "pixi-viewport";

export class FieldContainer extends Container {
  private lastParentWorldID = -1;

  private readonly GRID_WIDTH = (WIDTH + HEIGHT) / 2;
  private readonly GRID_HEIGHT = WIDTH + HEIGHT - 1;
  private grid: DisplayObject[] = new Array(this.GRID_WIDTH * this.GRID_HEIGHT);
  private debugGrid: DisplayObject[] = new Array(
    this.GRID_WIDTH * this.GRID_HEIGHT
  );
  private topLeft: Point = new Point(0, 0);
  private bottomRight: Point = new Point(0, 0);

  constructor(debug: "grid-border" | "grid-complete" | "none" = "none") {
    super();
    // @ts-ignore
    window["grid"] = this.grid;

    const outlineRed = new Graphics();
    outlineRed
      .lineStyle(0.5, 0xff0000, 0.5)
      .moveTo(0, -TILE_HEIGHT / 2)
      .lineTo(TILE_WIDTH / 2, -TILE_HEIGHT)
      .lineTo(TILE_WIDTH, -TILE_HEIGHT / 2)
      .lineTo(TILE_WIDTH / 2, 0)
      .lineTo(0, -TILE_HEIGHT / 2);

    const outlineGreen = new Graphics();
    outlineGreen
      .lineStyle(0.5, 0x00ff00, 0.5)
      .moveTo(0, -TILE_HEIGHT / 2)
      .lineTo(TILE_WIDTH / 2, -TILE_HEIGHT)
      .lineTo(TILE_WIDTH, -TILE_HEIGHT / 2)
      .lineTo(TILE_WIDTH / 2, 0)
      .lineTo(0, -TILE_HEIGHT / 2);

    if (debug !== "none") {
      const BORDER_SIZE = 4;
      for (let y = 0; y < this.GRID_HEIGHT; ++y) {
        const { from, to } = FieldContainer.fieldRangeInGridRow(y);
        {
          const markerfrom = outlineGreen.clone();
          const { screenX, screenY } = FieldContainer.gridToScreen(from, y);
          markerfrom.position.set(screenX, screenY);
          this.addChild(markerfrom);
        }
        {
          const markerTo = outlineGreen.clone();
          const { screenX, screenY } = FieldContainer.gridToScreen(to, y);
          markerTo.position.set(screenX, screenY);
          this.addChild(markerTo);
        }

        for (let x = 0; x < this.GRID_WIDTH; ++x) {
          if (
            debug === "grid-border" &&
            y >= BORDER_SIZE &&
            x >= BORDER_SIZE &&
            y < this.GRID_HEIGHT - BORDER_SIZE &&
            x < this.GRID_WIDTH - BORDER_SIZE
          ) {
            continue;
          }
          const idx = x + y * this.GRID_WIDTH;
          const { screenX, screenY } = FieldContainer.gridToScreen(x, y);
          const { isoX, isoY } = FieldContainer.gridToIso(x, y);
          const cell = new Container();

          const outline = outlineRed.clone();
          cell.addChild(outline);

          const gridCoordinates = new Text(`${x} | ${y}\n${isoX} | ${isoY}`, {
            fontFamily: "Arial",
            fontSize: 10,
            fill: 0xffff00,
            align: "center"
          });
          gridCoordinates.position.set(TILE_WIDTH / 2, -TILE_HEIGHT / 2);
          gridCoordinates.anchor.set(0.5, 0.5);
          cell.addChild(gridCoordinates);

          cell.position.set(screenX, screenY);

          // @ts-ignore
          cell.parent = this;
          // @ts-ignore
          cell.transform._parentID = -1;
          this.debugGrid[idx] = cell;
        }
      }

      const xAxis = new Graphics();
      xAxis
        .lineStyle(0.5, 0xff0000, 0.5)
        .moveTo(0, 0)
        .lineTo(20000, 0);
      this.addChild(xAxis);
      const yAxis = new Graphics();
      yAxis
        .lineStyle(0.5, 0xff0000, 0.5)
        .moveTo(0, 0)
        .lineTo(0, 20000);
      this.addChild(yAxis);
    }
  }

  // public screenToGrid(x: number, y: number) {
  //   return new Point(
  //     Math.floor(x / TILE_WIDTH) + (HEIGHT / 2) * TILE_WIDTH,
  //     Math.floor(y / TILE_HEIGHT) / 2
  //   );
  // }

  public sortChildren() {
    throw new Error("Sorting children not supported.");
  }

  public updateTransform() {
    // Make sure that the local transform of this container never changes. We
    // only change the viewport's transform, which ís the parent of this
    // container, but never change the transform of this container directly.
    console.assert(this.transform._localID === this.transform._currentLocalID);

    // Always execute default behavior to update transforms of ->children
    Container.prototype.updateTransform.call(this);

    const parentWorldID = this.parent.transform._worldID;
    if (parentWorldID !== this.lastParentWorldID) {
      // The viewport has changed. We need to do two steps:
      // 1. Determine which fields are now visible.
      // 2. Update transform of all visible fields.

      // Step 1: Determine which fields are now visible.
      const viewportBounds = (this.parent as Viewport).getVisibleBounds();
      const topLeftIso = GameRenderer.worldPosToFieldPos(
        new Point(viewportBounds.x - TILE_WIDTH, viewportBounds.y - TILE_HEIGHT)
      );
      const bottomRightIso = GameRenderer.worldPosToFieldPos(
        new Point(
          viewportBounds.x + viewportBounds.width + TILE_WIDTH,
          // We need to add the height of the highest sprite in the game, so
          // that it is still drawn even if it is below the viewport.
          // TODO: Verify that 200 fits.
          viewportBounds.y + viewportBounds.height + TILE_HEIGHT + 200
        )
      );

      const topLeftGrid = FieldContainer.isoToGrid(topLeftIso.x, topLeftIso.y);
      const bottomRightGrid = FieldContainer.isoToGrid(
        bottomRightIso.x,
        bottomRightIso.y
      );

      this.topLeft.x = topLeftGrid.x;
      this.topLeft.y = topLeftGrid.y;
      this.bottomRight.x = bottomRightGrid.x;
      this.bottomRight.y = bottomRightGrid.y;

      // Step 2: Update transform of visible fields.
      for (let y = this.topLeft.y; y <= this.bottomRight.y; ++y) {
        for (let x = this.topLeft.x; x <= this.bottomRight.x; ++x) {
          const idx = x + y * this.GRID_WIDTH;
          const field = this.grid[idx];
          if (field) {
            field.updateTransform();
          }
        }
      }

      for (let y = this.topLeft.y; y <= this.bottomRight.y; ++y) {
        for (let x = this.topLeft.x; x <= this.bottomRight.x; ++x) {
          const idx = x + y * this.GRID_WIDTH;
          const debug = this.debugGrid[idx];
          if (debug) {
            debug.updateTransform();
          }
        }
      }

      this.lastParentWorldID = parentWorldID;
    }
  }

  private static isoToGrid(isoX: number, isoY: number) {
    const y = isoX + isoY;
    const x =
      Math.floor((isoX - isoY) / 2) + HEIGHT / 2 + (y % 2 === 0 ? -1 : 0);
    console.assert(x >= 0);
    console.assert(y >= 0);
    return { x, y };
  }

  private static gridToScreen(x: number, y: number) {
    const screenX =
      TILE_WIDTH * x -
      ((y % 2) * TILE_WIDTH) / 2 -
      (HEIGHT / 2 - 1) * TILE_WIDTH;
    const screenY = (y * TILE_HEIGHT) / 2;

    return { screenX, screenY };
  }

  private static gridToIso(x: number, y: number) {
    const { screenX, screenY } = FieldContainer.gridToScreen(x, y);

    const point = GameRenderer.worldPosToFieldPos(new Point(screenX, screenY));

    return { isoX: point.x, isoY: point.y - 1 };
  }

  private static fieldRangeInGridRow(y: number) {
    const from = Math.abs(
      HEIGHT / 2 - 1 - Math.floor((y + (y >= HEIGHT ? -1 : 0)) / 2)
    );
    const to =
      y < HEIGHT
        ? from + y
        : y < WIDTH
        ? from + HEIGHT - 1
        : from + HEIGHT - 1 - (y - WIDTH + 1);
    return { from, to };
  }

  public addField(child: DisplayObject, isoX: number, isoY: number) {
    const { x, y } = FieldContainer.isoToGrid(isoX, isoY);

    const fieldIdx = x + y * this.GRID_WIDTH;
    console.assert(this.grid[fieldIdx] === undefined);
    this.grid[fieldIdx] = child;

    if (child.parent) {
      child.parent.removeChild(child);
    }

    // @ts-ignore
    child.parent = this;
    this.sortDirty = true;

    // ensure child transform will be recalculated
    child.transform._parentID = -1;

    // ensure bounds will be recalculated
    // @ts-ignore
    this._boundsID++;
  }

  public render(renderer: Renderer) {
    for (let y = this.topLeft.y; y <= this.bottomRight.y; ++y) {
      // Performance improvement: Calculate minX and minY to avoid rendering as
      // much blackness.
      const { from, to } = FieldContainer.fieldRangeInGridRow(y);
      const minX = Math.max(this.topLeft.x, from);
      const maxX = Math.min(this.bottomRight.x, to);
      for (let x = minX; x <= maxX; ++x) {
        const field = this.grid[x + y * this.GRID_WIDTH];
        if (field) {
          // TODO: Lot's of room for improvement here: Do not update transforms
          // (above), but instead write custom render code that uses the fact
          // that all transforms only differ by a constant offset.
          field.render(renderer);
        }
      }
    }

    for (let y = this.topLeft.y; y <= this.bottomRight.y; ++y) {
      for (let x = this.topLeft.x; x <= this.bottomRight.x; ++x) {
        const idx = x + y * this.GRID_WIDTH;
        const debug = this.debugGrid[idx];
        if (debug) {
          debug.render(renderer);
        }
      }
    }

    for (let i = 0, j = this.children.length; i < j; ++i) {
      this.children[i].render(renderer);
    }
  }
}
