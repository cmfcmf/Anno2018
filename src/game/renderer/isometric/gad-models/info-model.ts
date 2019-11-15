import { ScreenConfig } from "../../../menu-structure";
import t from "../../../../translation/translator";
import { Container, BitmapText } from "pixi.js";
import { HUD } from "../hud";

const HIGHSCORE_BTN_ID = 57028;
const CITIES_BTN_ID = 57033;
const SHIPS_BTN_ID = 57032;
const DIPLOMACY_BTN_ID = 57031;

export class InfoModel implements ScreenConfig {
  private container: Container;

  constructor(private readonly hud: HUD) {}

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
    57002: t("game.player_status"),
    57005: t("game.inhabitants"),
    57008: t("game.tax_revenue"),
    57011: t("game.operating_cost"),
    57014: t("game.military_budget"),
    57017: t("game.sales_revenue"),
    57020: t("game.purchase_cost"),
    57023: t("game.balance_sheet"),
    57026: t("game.score")
  };

  public setOperatingCosts(costs: number) {
    const text = this.container.getChildByName("menu-57012") as BitmapText;
    text.text = costs.toString();
  }
}
