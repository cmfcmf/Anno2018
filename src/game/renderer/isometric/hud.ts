import { Container, Point, Text, Sprite, Texture } from "pixi.js";
import MenuStructure from "../../menu-structure";
import { SimulationSpeed } from "../../world/world";
import { Island } from "../../world/island";
import { InfoModel } from "./gad-models/info-model";
import { CtrlModel } from "./gad-models/ctrl-model";
import GameRenderer from "../../game-renderer";
import { assertNever } from "../../../util/util";
import { Producer } from "../../world/producer";
import { City } from "../../world/city";
import Field from "../../world/field";
import FieldType, { ProductionKind } from "../../field-type";
import { Translator } from "../../../translation/translator";
import SpriteLoader from "../../../sprite-loader";
import { getIconId } from "../../../translation/translations";
import { House } from "../../world/house";
import assert from "../../../util/assert";
import { Kontor } from "../../world/kontor";
import { GoodAction } from "../../world/good";
import { Bar } from "../../ui/bar";

const SIDEBAR_WIDTH = 271;
const BOTTOMBAR_HEIGHT = 35;

function makeDebugText() {
  return new Text("", {
    fontFamily: "Arial",
    fontSize: 24,
    fill: 0xff1010
  });
}

export type StatusAreaContent =
  | "status"
  | "city-list"
  | "ship-list"
  | "diplomacy";

export type SidebarTab = "build" | "battle" | "status" | "options";

export class HUD {
  private sidebar = new Container();
  private sidebarDetails = new Container();
  private topBar = new Container();
  private bottomBar = new Container();
  private debugArea = new Container();

  private money = makeDebugText();
  private coordinates = makeDebugText();
  private islandNumber = makeDebugText();
  private producerInfo = makeDebugText();
  private simulationSpeedDisplay = makeDebugText();
  private infoModel: InfoModel;
  private ctrlModel: CtrlModel;

  private toolsTextures: Map<number, Texture>;

  private readonly WARE_ICON_OFFSET = 192;

  constructor(
    gameRenderer: GameRenderer,
    private readonly menuRenderer: MenuStructure,
    private readonly translator: Translator,
    private readonly spriteLoader: SpriteLoader,
    container: Container
  ) {
    this.infoModel = new InfoModel(this, translator);
    this.ctrlModel = new CtrlModel(gameRenderer, this);

    // Debug area
    this.money.y = 0 * 30;
    this.coordinates.y = 1 * 30;
    this.islandNumber.y = 2 * 30;
    this.producerInfo.y = 3 * 30;
    this.simulationSpeedDisplay.y = 5 * 30;
    this.debugArea.addChild(this.money);
    this.debugArea.addChild(this.coordinates);
    this.debugArea.addChild(this.islandNumber);
    this.debugArea.addChild(this.producerInfo);
    this.debugArea.addChild(this.simulationSpeedDisplay);

    container.addChild(this.sidebar);
    container.addChild(this.sidebarDetails);
    container.addChild(this.topBar);
    container.addChild(this.bottomBar);
    container.addChild(this.debugArea);
  }

  public async begin(size: Point) {
    this.toolsTextures = await this.spriteLoader.getTextures("TOOLS/TOOLS");
    await this.menuRenderer.renderScreen(
      this.sidebar,
      "CTRL.GAD",
      this.ctrlModel
    );
    await this.menuRenderer.renderScreen(this.bottomBar, "LEIST.GAD");
    await this.setSidebarActiveTab("status");
    this.setSize(size);
  }

  public setSize(size: Point) {
    this.sidebar.position.x = size.x - SIDEBAR_WIDTH;
    this.sidebarDetails.position.copyFrom(this.sidebar.position);
    this.bottomBar.position.y = size.y - BOTTOMBAR_HEIGHT;
  }

  public setSimulationSpeed(speed: SimulationSpeed) {
    this.simulationSpeedDisplay.text = `Simulation speed: ${speed}.`;
  }

  public setMoney = (money: number) => {
    this.money.text = `Money: ${money}`;
  };

  public setOperatingCosts = (costs: number) => {
    this.infoModel.setOperatingCosts(costs);
  };

  public setStatusAreaContent = async (content: StatusAreaContent) => {
    switch (content) {
      case "status":
        await this.menuRenderer.renderScreen(
          this.sidebarDetails,
          "INFO.GAD",
          this.infoModel
        );
        break;
      case "city-list":
        await this.menuRenderer.renderScreen(
          this.sidebarDetails,
          "STADTLST.GAD"
        );

        break;
      case "ship-list":
        await this.menuRenderer.renderScreen(
          this.sidebarDetails,
          "SHIPLIST.GAD"
        );
        break;
      case "diplomacy":
        await this.menuRenderer.renderScreen(
          this.sidebarDetails,
          "VERTRAG.GAD"
        );
        break;
      default:
        assertNever(content);
    }
  };

  public setSidebarActiveTab = async (tab: SidebarTab) => {
    switch (tab) {
      case "build":
        await this.menuRenderer.renderScreen(this.sidebarDetails, "BAU.GAD");
        break;
      case "battle":
        this.sidebarDetails.removeChildren();
        break;
      case "status":
        await this.menuRenderer.renderScreen(
          this.sidebarDetails,
          "INFO.GAD",
          this.infoModel
        );
        break;
      case "options":
        await this.menuRenderer.renderScreen(
          this.sidebarDetails,
          "OPTION.GAD",
          {
            onLoad: () => {},
            buttons: {},
            texts: {
              47002: this.translator.translate("game.settings"),
              47031: "640x480",
              47032: "800x600",
              47033: "1024x768"
            },
            ignore: []
          }
        );
        break;
      default:
        assertNever(tab);
    }
  };

  public async showProducer(
    producer: Producer,
    island: Island,
    city: City,
    field: Field,
    fieldType: FieldType
  ) {
    if (
      fieldType.production.kind === ProductionKind.FISCHEREI ||
      fieldType.production.kind === ProductionKind.JAGDHAUS ||
      fieldType.production.kind === ProductionKind.PLANTAGE ||
      fieldType.production.kind === ProductionKind.WEIDETIER
    ) {
      await this.showProducerFarm(producer, city, field, fieldType);
    } else if (fieldType.production.kind === ProductionKind.HANDWERK) {
      await this.showProducerHandwerk(producer, city, field, fieldType);
    } else if (fieldType.production.kind === ProductionKind.BERGWERK) {
      await this.showProducerMine(producer, city, field, fieldType);
    } else if (
      fieldType.production.kind === ProductionKind.KIRCHE ||
      fieldType.production.kind === ProductionKind.KAPELLE ||
      fieldType.production.kind === ProductionKind.WIRT ||
      fieldType.production.kind === ProductionKind.THEATER ||
      fieldType.production.kind === ProductionKind.BADEHAUS ||
      fieldType.production.kind === ProductionKind.KLINIK ||
      fieldType.production.kind === ProductionKind.HOCHSCHULE ||
      fieldType.production.kind === ProductionKind.SCHULE ||
      fieldType.production.kind === ProductionKind.BRUNNEN ||
      fieldType.production.kind === ProductionKind.SCHLOSS ||
      fieldType.production.kind === ProductionKind.GALGEN
    ) {
      await this.showProducerPublicBuilding(producer, city, field, fieldType);
    }
  }

  public async showHouse(
    house: House,
    island: Island,
    city: City,
    field: Field,
    config: FieldType
  ) {
    assert(config.production.kind === ProductionKind.WOHNUNG);

    await this.menuRenderer.renderScreen(this.sidebarDetails, "SIEDLER.GAD", {
      texts: {
        36002: city.name,
        36012: "???",
        36011: this.translator
          .translate("game.tax")
          .replace("%d", (city.taxes[house.inhabitantLevel] >> 2).toString())
          .replace("%%", "%"),
        36014: this.translator.populationLevelName(house.inhabitantLevel),
        36013: city.inhabitants[house.inhabitantLevel].toString(),

        36019: this.translator.translate("game.food")
      },
      buttons: {},
      ignore: [],
      onLoad: () => {}
    });
  }

  public async showKontor(
    kontor: Kontor,
    island: Island,
    city: City,
    field: Field,
    config: FieldType
  ) {
    assert(config.production.kind === ProductionKind.KONTOR);

    // FIXME: Add maxLager of all markets in that city.
    const maxStockInCity = config.production.maxStock + 0;

    await this.menuRenderer.renderScreen(this.sidebarDetails, "STADT.GAD", {
      buttons: {
        43003: container =>
          this.menuRenderer.renderScreen(container, "KONTOR.GAD", {
            buttons: {},
            texts: {},
            ignore: [],
            onLoad: () => {}
          }),
        43004: container =>
          this.menuRenderer.renderScreen(container, "KONTOR.GAD", {
            buttons: {},
            texts: {},
            ignore: [],
            onLoad: () => {}
          }),
        43006: async container => {
          const ID_GOOD_SPRITES = 44021;
          const ID_GOOD_AMOUNT = 44051;
          const ID_GOOD_SHADOWS = 44081;
          const ID_TRADE_AMOUNT = 44111;
          const ID_GOOD_ACTIONS = 44141;
          const NUM_GOODS = 23;
          await this.menuRenderer.renderScreen(container, "LAGER.GAD", {
            buttons: {},
            texts: {
              44002: city.name
            },
            ignore: [
              44171, // Good amount slider
              // Hide 24th good
              ID_GOOD_SPRITES + NUM_GOODS,
              ID_GOOD_AMOUNT + NUM_GOODS,
              ID_TRADE_AMOUNT + NUM_GOODS,
              ID_GOOD_ACTIONS + NUM_GOODS,
              ID_GOOD_SHADOWS + NUM_GOODS
            ],
            onLoad: async container => {
              await Promise.all(
                kontor.goods.map(async (good, idx) => {
                  const goodSprite = container.getChildByName(
                    `menu-${ID_GOOD_SPRITES + idx}`
                  ) as Sprite;

                  goodSprite.texture = this.toolsTextures.get(
                    this.WARE_ICON_OFFSET + good.goodId
                  )!;

                  const actionSprite = container.getChildByName(
                    `menu-${ID_GOOD_ACTIONS + idx}`
                  );
                  const tradeAmountSprite = container.getChildByName(
                    `menu-${ID_TRADE_AMOUNT + idx}`
                  );
                  if (good.action === GoodAction.None) {
                    actionSprite.visible = false;
                    tradeAmountSprite.visible = false;
                  } else {
                    // TODO: Set color depending on price
                    // TODO: Set orientation depending on good action
                    // actionSprite
                    // TODO: Set position depending on trade amount
                    // tradeAmountSprite
                  }

                  const bar = container.getChildByName(
                    `menu-${ID_GOOD_AMOUNT + idx}`
                  ) as Bar;
                  bar.setValue(
                    Math.min(1.0, (good.currentAmount >> 5) / maxStockInCity)
                  );
                })
              );
            }
          });
        }
      },
      ignore: [
        43005 // unused market symbol
      ],
      texts: {
        43002: city.name,
        43007: this.translator.translate("game.inhabitants"),
        // FIXME: We need to add the people living in production buildings here
        43008: city.inhabitants.reduce((acc, x) => acc + x).toString(),
        43010: this.translator.translate("game.tax_revenue"),
        43013: this.translator.translate("game.operating_cost"),
        43016: this.translator.translate("game.sales_revenue"),
        43019: this.translator.translate("game.purchase_cost"),
        43022: this.translator.translate("game.balance_sheet")
      },
      onLoad: () => {}
    });
  }

  private async showProducerFarm(
    producer: Producer,
    city: City,
    field: Field,
    fieldType: FieldType
  ) {
    await this.menuRenderer.renderScreen(this.sidebarDetails, "PLANTAGE.GAD", {
      buttons: {
        41009: (_, pauseProduction) => producer.setActive(!pauseProduction),
        41010: (_, dontTakeGoods) =>
          producer.setGoodsAllowedForPickup(!dontTakeGoods)
      },
      texts: {
        41002: city.name,
        41003: this.translator.translate("game.workload"),
        41004: this.translator
          .translate("game.n_percent")
          .replace("%d", "???")
          .replace("%%", "%"),
        41005: this.translator.translate("game.operating_cost"),
        41006: producer.isActive()
          ? fieldType.production.upkeep.active.toString()
          : fieldType.production.upkeep.inactive.toString(),
        41008: this.translator.getFieldName(field.fieldId),
        41022: this.translator
          .translate("game.n_tons")
          .replace("%d", (producer.stock >> 5).toString())
      },
      ignore: [],
      onLoad: async container => {
        const goodSprite = container.getChildByName("menu-41021") as Sprite;
        goodSprite.texture = this.toolsTextures.get(
          this.WARE_ICON_OFFSET + fieldType.production.good
        )!;
      }
    });
  }

  private async showProducerPublicBuilding(
    producer: Producer,
    city: City,
    field: Field,
    fieldType: FieldType
  ) {
    const texts: Record<number, string> = {
      62002: city.name,
      62003: this.translator.translate("game.operating_cost"),
      62004: producer.isActive()
        ? fieldType.production.upkeep.active.toString()
        : fieldType.production.upkeep.inactive.toString(),
      62006: this.translator.getFieldName(field.fieldId)
    };

    await this.menuRenderer.renderScreen(this.sidebarDetails, "INFRA.GAD", {
      buttons: {},
      texts,
      ignore: [],
      onLoad: async container => {
        const sprite = container.getChildByName("menu-62021") as Sprite;
        sprite.texture = this.toolsTextures.get(getIconId(field.fieldId))!;
      }
    });
  }

  private async showProducerMine(
    producer: Producer,
    city: City,
    field: Field,
    fieldType: FieldType
  ) {
    const texts: Record<number, string> = {
      46002: city.name,
      46003: this.translator.translate("game.operating_cost"),
      46004: producer.isActive()
        ? fieldType.production.upkeep.active.toString()
        : fieldType.production.upkeep.inactive.toString(),
      46006: this.translator.getFieldName(field.fieldId),
      46022: this.translator
        .translate("game.n_tons")
        .replace("%d", (producer.stock >> 5).toString())
    };

    await this.menuRenderer.renderScreen(this.sidebarDetails, "BERGWERK.GAD", {
      buttons: {
        46009: (_, pauseProduction) => producer.setActive(!pauseProduction),
        46010: (_, dontTakeGoods) =>
          producer.setGoodsAllowedForPickup(!dontTakeGoods)
      },
      texts,
      ignore: [],
      onLoad: async container => {
        const goodSprite = container.getChildByName("menu-46021") as Sprite;
        goodSprite.texture = this.toolsTextures.get(
          this.WARE_ICON_OFFSET + fieldType.production.good
        )!;
      }
    });
  }

  private async showProducerShipyard(
    producer: Producer,
    city: City,
    field: Field,
    fieldType: FieldType
  ) {
    const texts: Record<number, string> = {
      41002: city.name,
      41003: this.translator.translate("game.workload"),
      41004: this.translator
        .translate("game.n_percent")
        .replace("%d", "???")
        .replace("%%", "%"),
      41005: this.translator.translate("game.operating_cost"),
      41006: producer.isActive()
        ? fieldType.production.upkeep.active.toString()
        : fieldType.production.upkeep.inactive.toString(),
      41008: this.translator.getFieldName(field.fieldId),
      41022: this.translator
        .translate("game.n_tons")
        .replace("%d", (producer.stock >> 5).toString())
    };

    await this.menuRenderer.renderScreen(this.sidebarDetails, "WERFT.GAD", {
      buttons: {
        41009: (_, pauseProduction) => producer.setActive(!pauseProduction),
        41010: (_, dontTakeGoods) =>
          producer.setGoodsAllowedForPickup(!dontTakeGoods)
      },
      texts,
      ignore: [],
      onLoad: async container => {
        const goodSprite = container.getChildByName("menu-41021") as Sprite;
        goodSprite.texture = this.toolsTextures.get(
          this.WARE_ICON_OFFSET + fieldType.production.good
        )!;
      }
    });
  }

  private async showProducerHandwerk(
    producer: Producer,
    city: City,
    field: Field,
    fieldType: FieldType
  ) {
    const usesTwoInputGoods = fieldType.production.good2;

    const texts: Record<number, string> = {
      37002: city.name,
      37003: this.translator.translate("game.workload"),
      37004: this.translator
        .translate("game.n_percent")
        .replace("%d", "???")
        .replace("%%", "%"),
      37005: this.translator.translate("game.operating_cost"),
      37006: producer.isActive()
        ? fieldType.production.upkeep.active.toString()
        : fieldType.production.upkeep.inactive.toString(),
      37008: this.translator.getFieldName(field.fieldId)
    };
    const ignore: number[] = [];
    if (usesTwoInputGoods) {
      texts[37032] = this.translator
        .translate("game.n_tons")
        .replace("%d", (producer.secondGoodStock >> 5).toString());
      texts[37036] = this.translator
        .translate("game.n_tons")
        .replace("%d", (producer.firstGoodStock >> 5).toString());
      texts[37040] = this.translator
        .translate("game.n_tons")
        .replace("%d", (producer.stock >> 5).toString());
      ignore.push(...[37021, 37022, 37023, 37024, 37025, 37026, 37027]);
    } else {
      texts[37022] = this.translator
        .translate("game.n_tons")
        .replace("%d", (producer.firstGoodStock >> 5).toString());
      texts[37026] = this.translator
        .translate("game.n_tons")
        .replace("%d", (producer.stock >> 5).toString());
      ignore.push(
        ...[
          37031,
          37032,
          37033,
          37034,
          37035,
          37036,
          37037,
          37038,
          37039,
          37040,
          37041
        ]
      );
    }

    await this.menuRenderer.renderScreen(this.sidebarDetails, "PROD.GAD", {
      buttons: {
        37009: (_, pauseProduction) => producer.setActive(!pauseProduction),
        37010: (_, dontTakeGoods) =>
          producer.setGoodsAllowedForPickup(!dontTakeGoods)
      },
      texts,
      ignore,
      onLoad: async container => {
        if (usesTwoInputGoods) {
          const good1Sprite = container.getChildByName("menu-37035") as Sprite;
          good1Sprite.texture = this.toolsTextures.get(
            this.WARE_ICON_OFFSET + fieldType.production.good1
          )!;

          const good2Sprite = container.getChildByName("menu-37031") as Sprite;
          good2Sprite.texture = this.toolsTextures.get(
            this.WARE_ICON_OFFSET + fieldType.production.good2
          )!;

          const goodSprite = container.getChildByName("menu-37039") as Sprite;
          goodSprite.texture = this.toolsTextures.get(
            this.WARE_ICON_OFFSET + fieldType.production.good
          )!;
        } else {
          const good1Sprite = container.getChildByName("menu-37021") as Sprite;
          good1Sprite.texture = this.toolsTextures.get(
            this.WARE_ICON_OFFSET + fieldType.production.good1
          )!;

          const goodSprite = container.getChildByName("menu-37025") as Sprite;
          goodSprite.texture = this.toolsTextures.get(
            this.WARE_ICON_OFFSET + fieldType.production.good
          )!;
        }
      }
    });
  }

  public setHoveredPosition(pos: Point, island?: Island) {
    this.coordinates.text = `x: ${pos.x}, y: ${pos.y}`;

    if (island) {
      const localPosition = new Point(
        pos.x - island.position.x,
        pos.y - island.position.y
      );

      this.islandNumber.text = `Island id: ${island.id}, x: ${localPosition.x} y: ${localPosition.y}`;

      /*
      const producer = this.game.state.producers.find(
        each =>
          each.islandId === island.id &&
          each.position.x === localPosition.x &&
          each.position.y === localPosition.y
      );
      if (producer) {
        const fieldData = this.game.getFieldAtIsland(
          island,
          producer.position
        )!;
        const fieldConfig = this.configLoader
          .getFieldData()
          .get(fieldData.fieldId)!;

        producerInfo.text = `Producer: Stock: ${producer.stock / 32} (max: ${
          fieldConfig.production.maxStock
        }, good: ${
          fieldConfig.production.good
        }), Good A: ${producer.firstGoodStock / 32} (required: ${
          fieldConfig.production.amount1
        }, good: ${
          fieldConfig.production.good1
        }), Good B: ${producer.secondGoodStock / 32} (required: ${
          fieldConfig.production.amount2
        }, good: ${
          fieldConfig.production.good2
        }),\n Active: ${producer.isActive()}, Timer: ${
          producer.timer
        }, Rotation: ${fieldData.rotation}`;
      } else {
        producerInfo.text = "No Producer";
      }
      */
    } else {
      this.islandNumber.text = `Island id: ?`;
    }
  }
}
