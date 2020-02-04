import { Point, Rectangle } from "pixi.js";

export const isWithinRadius = (
  building: Rectangle,
  radius: number,
  point: Point
) => {
  const center = new Point(
    building.x + building.width / 2,
    building.y + building.height / 2
  );

  return (
    (Math.abs(point.x + 0.5 - center.x) +
      (building.width % 2 === 0 ? 0 : 0.5)) **
      2 +
      (Math.abs(point.y + 0.5 - center.y) +
        (building.height % 2 === 0 ? 0 : 0.5)) **
        2 <
    Math.ceil((radius + Math.PI / 3) ** 2)
  );
};
