import { Graphics, Point } from "pixi.js";
import assert from "../../util/assert";

export class Bar extends Graphics {
  constructor(
    position: Point,
    private readonly size: Point,
    private readonly isVertical: boolean,
    private readonly color: number
  ) {
    super();
    this.position = position;
    this.setValue(Math.random());
  }

  public setValue(percentage: number) {
    assert(percentage >= 0 && percentage <= 1);
    this.clear();
    this.beginFill(this.color);
    if (this.isVertical) {
      const height = Math.floor(this.size.y * percentage);
      this.drawRect(0, this.size.y - height, this.size.x, height);
    } else {
      const width = Math.floor(this.size.x * percentage);
      this.drawRect(0, 0, width, this.size.y);
    }
  }
}
