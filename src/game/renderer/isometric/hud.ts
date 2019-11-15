import { Container, Point, Text } from "pixi.js";
import MenuStructure from "../../menu-structure";
import { SimulationSpeed } from "../../world/world";
import { Island } from "../../world/island";
import { InfoModel } from "./gad-models/info-model";
import { CtrlModel } from "./gad-models/ctrl-model";
import GameRenderer from "../../game-renderer";
import { assertNever } from "../../../util/util";
import t from "../../../translation/translator";

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

  constructor(
    gameRenderer: GameRenderer,
    private readonly menuRenderer: MenuStructure,
    container: Container
  ) {
    this.infoModel = new InfoModel(this);
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
              47002: t("game.settings"),
              47031: "640x480",
              47032: "800x600",
              47033: "1024x768"
            }
          }
        );
        break;
      default:
        assertNever(tab);
    }
  };

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
