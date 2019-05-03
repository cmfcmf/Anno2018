import { interaction, Sprite } from "pixi.js";

type InteractionEvent = interaction.InteractionEvent;

export default class SliderSprite extends Sprite {
  private dragging = false;
  private topY: number;

  public setSliderData(sizeY: number, offsetY: number, sliderSizeY: number) {
    this.position.set(
      this.position.x,
      this.position.y + (sizeY - sliderSizeY) / 2
    );
    this.topY = this.position.y;
    // sprite.position.set(sprite.position.x + sliderOffset[0], sprite.position.y + sliderOffset[1]);
    this.on("mousedown", (event: InteractionEvent) => {
      this.dragging = true;
    });
    this.on("mouseup", (event: InteractionEvent) => {
      this.dragging = false;
    });
    this.on("mousemove", (event: InteractionEvent) => {
      if (this.dragging) {
        const originalEvent = event.data.originalEvent as
          | MouseEvent
          | PointerEvent;
        const eventY = originalEvent.offsetY - this.texture.height / 2;
        this.position.y = this.clamp(
          eventY,
          this.topY,
          this.topY + sliderSizeY - this.texture.height / 2
        );
      }
    });
  }

  /*
    public moveDown() {

    }

    public moveUp() {

    }
    */

  private clamp(val: number, min: number, max: number) {
    return Math.min(Math.max(min, val), max);
  }
}
