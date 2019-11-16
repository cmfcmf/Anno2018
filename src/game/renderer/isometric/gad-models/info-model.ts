import { ScreenConfig } from "../../../menu-structure";
import { Translator } from "../../../../translation/translator";
import { Container, BitmapText } from "pixi.js";
import { HUD } from "../hud";

const HIGHSCORE_BTN_ID = 57028;
const CITIES_BTN_ID = 57033;
const SHIPS_BTN_ID = 57032;
const DIPLOMACY_BTN_ID = 57031;

export class InfoModel implements ScreenConfig {
  private container: Container;

  constructor(
    private readonly hud: HUD,
    private readonly translator: Translator
  ) {}

  public onLoad = (container: PIXI.Container) => {
    this.container = container;
  };

  public buttons = {
    [HIGHSCORE_BTN_ID]: () => {
      // TODO: Display and calculate highscore
    },
    [CITIES_BTN_ID]: () => this.hud.setStatusAreaContent("city-list"),
    [SHIPS_BTN_ID]: () => this.hud.setStatusAreaContent("ship-list"),
    [DIPLOMACY_BTN_ID]: () => this.hud.setStatusAreaContent("diplomacy")
  };

  public texts = {
    57002: this.translator.translate("game.player_status"),
    57005: this.translator.translate("game.inhabitants"),
    57008: this.translator.translate("game.tax_revenue"),
    57011: this.translator.translate("game.operating_cost"),
    57014: this.translator.translate("game.military_budget"),
    57017: this.translator.translate("game.sales_revenue"),
    57020: this.translator.translate("game.purchase_cost"),
    57023: this.translator.translate("game.balance_sheet"),
    57026: this.translator.translate("game.score")
  };

  public ignore = [];

  public setOperatingCosts(costs: number) {
    const text = this.container.getChildByName("menu-57012") as BitmapText;
    if (!text) {
      // Do nothing if this gui is currently invisible.
      return;
    }
    text.text = costs.toString();
  }
}
