import { ScreenConfig } from "../../../menu-structure";
import { Container } from "pixi.js";
import GameRenderer from "../../../game-renderer";
import { HUD } from "../hud";

const STATUS_BTN_ID = 30013;

export class CtrlModel implements ScreenConfig {
  private container: Container;

  constructor(
    private readonly gameRenderer: GameRenderer,
    private readonly hud: HUD
  ) {}

  public onLoad = (container: PIXI.Container) => {
    this.container = container;
    container.getChildByName(`menu-${STATUS_BTN_ID}`).emit("mousedown");
  };

  public buttons = {
    30001: () => alert("Rotation is not supported yet :("),
    30002: () => alert("Rotation is not supported yet :("),
    30003: () => this.gameRenderer.zoomIn(),
    30004: () => this.gameRenderer.zoomOut(),
    30011: () => this.hud.setSidebarActiveTab("build"),
    // 30012 is the same as 30015. This is a copy-paste error of Anno :)
    30015: () => this.hud.setSidebarActiveTab("battle"),
    [STATUS_BTN_ID]: () => this.hud.setSidebarActiveTab("status"),
    30014: () => this.hud.setSidebarActiveTab("options")
  };

  public texts = {};
}
