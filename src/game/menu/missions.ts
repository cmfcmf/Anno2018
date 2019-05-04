import { BitmapText, Container, Sprite } from "pixi.js";
import FileSystem from "../../filesystem";
import GAMParser from "../../parsers/GAM/gam-parser";
import t from "../../translation/translator";
import assert from "../../util/assert";
import MenuStructure, { ScreenConfig } from "../menu-structure";

export default class Missions implements ScreenConfig {
  public buttons = [
    this.renderNewGame.bind(this),
    this.renderLoadGame.bind(this),
    async () => {
      await this.menuStructure.renderScreen("menu_loading");
      this.menuStructure.emit("load-game", "/saves/lastgame.gam");
    },
    async () => this.menuStructure.renderScreen("menu_main"),
    async (stage: Container) => {
      this.currentPage = Math.max(0, this.currentPage - 1);
      await this.renderNewGame(stage);
    },
    async (stage: Container) => {
      this.currentPage = Math.min(
        Math.ceil(this.newGameLines.length / this.ROWS) - 1,
        this.currentPage + 1
      );
      await this.renderNewGame(stage);
    }
  ];

  private readonly ROWS = 14;

  private readonly SCROLL_UP = "menu-31011";
  private readonly SCROLL_DOWN = "menu-31012";

  private newGameLines: Array<{
    name: string;
    difficulty?: number;
    file?: WebKitFileEntry;
  }> = [];

  private currentPage = 0;
  private gamParser: GAMParser;

  constructor(
    private readonly fs: FileSystem,
    private readonly menuStructure: MenuStructure
  ) {
    this.gamParser = new GAMParser(null);
  }

  public async onLoad(stage: Container) {
    await this.getNewGameLines();

    await this.renderNewGame(stage);
    await this.menuStructure._playMainMenuMusic();
  }

  public async renderNewGame(stage: Container) {
    const currentTopItem = this.currentPage * this.ROWS;

    for (let i = 0; i < this.ROWS; i++) {
      const bitmapText = stage.getChildByName(
        `menu-${31021 + i}`
      ) as BitmapText;

      bitmapText.off("click");
      bitmapText.visible = false;
      bitmapText.interactive = false;
      bitmapText.buttonMode = false;

      if (i + currentTopItem < this.newGameLines.length) {
        const line = this.newGameLines[i + currentTopItem];
        bitmapText.text = line.name;
        bitmapText.visible = true;
        if (line.file) {
          bitmapText.interactive = true;
          bitmapText.buttonMode = true;
          bitmapText.once("click", async () => {
            await this.menuStructure.renderScreen("menu_loading");
            this.menuStructure.emit("load-game", line.file!.fullPath);
          });
        }
      }
    }
    for (let i = 0; i < this.ROWS; i++) {
      const sprite = stage.getChildByName(`menu-${31041 + i}`) as Sprite;
      sprite.visible =
        i + currentTopItem < this.newGameLines.length &&
        !!this.newGameLines[i + currentTopItem].file;
    }
    for (let i = 0; i < this.ROWS; i++) {
      const sprite = stage.getChildByName(`menu-${31061 + i}`) as Sprite;
      sprite.visible = false;
    }

    stage.getChildByName(this.SCROLL_UP).visible = true;
    stage.getChildByName(this.SCROLL_DOWN).visible = true;
  }

  public async renderLoadGame(stage: Container) {
    const saves = (await this.fs.ls("/saves", ".gam")).filter(
      save => save.name !== "lastgame.gam"
    );

    const maxSaveGames = 12;
    for (let i = 0; i < this.ROWS; i++) {
      const bitmapText = stage.getChildByName(
        `menu-${31021 + i}`
      ) as BitmapText;
      bitmapText.visible = i < maxSaveGames;
      if (i < saves.length) {
        // TODO: Read name from Game.dat
        bitmapText.text = `Game${i.toString().padStart(2, "0")}`;
        bitmapText.interactive = true;
        bitmapText.buttonMode = true;
        bitmapText.once("click", async () => {
          await this.menuStructure.renderScreen("menu_loading");
          this.menuStructure.emit("load-game", saves[i].fullPath);
        });
      } else {
        bitmapText.text = `Empty${i.toString().padStart(2, "0")}`;
      }
    }
    for (let i = 0; i < this.ROWS; i++) {
      const sprite = stage.getChildByName(`menu-${31041 + i}`) as Sprite;
      sprite.visible = false;
    }
    for (let i = 0; i < this.ROWS; i++) {
      // TODO: Read players (from Game.dat ?)
      const sprite = stage.getChildByName(`menu-${31061 + i}`) as Sprite;
      sprite.visible = i < maxSaveGames;
    }

    stage.getChildByName(this.SCROLL_UP).visible = false;
    stage.getChildByName(this.SCROLL_DOWN).visible = false;
  }

  private async getNewGameLines() {
    const missions = await this.loadMissions();

    this.newGameLines.push({ name: t("menu.divider.orginal_missions") });

    missions
      .filter(mission => mission.missionNum !== -1)
      .forEach(mission => {
        this.newGameLines.push({
          name: mission.name,
          file: mission.file as WebKitFileEntry
        });
      });

    this.newGameLines.push({ name: t("menu.divider.missions") });

    this.newGameLines.push({ name: t("menu.divider.new_missions") });

    missions
      .filter(mission => mission.missionNum === -1)
      .forEach(mission => {
        this.newGameLines.push({
          name: mission.name,
          file: mission.file as WebKitFileEntry
        });
      });

    this.newGameLines.push({ name: t("menu.divider.custom_missions") });
    const customMissions = await this.fs.ls("/missions-custom", ".szs");
    customMissions.forEach(mission => {
      this.newGameLines.push({
        name: mission.name.replace(".szs", ""),
        file: mission as WebKitFileEntry
      });
    });
  }

  private async loadMissions() {
    const missions = await Promise.all(
      (await this.fs.ls("/missions-original", ".szs")).map(async mission => {
        const data = await this.fs.openAndGetContentAsStream(mission);
        const blocks = this.gamParser.parse(data);
        let ranking = -1; // NOT the number of stars
        if (blocks.has("SZENE_RANKING")) {
          assert(blocks.get("SZENE_RANKING")!.length === 1);
          ranking = blocks.get("SZENE_RANKING")![0].data.read32();
        }
        let campaignNum = -1;
        if (blocks.has("SZENE_KAMPAGNE")) {
          assert(blocks.get("SZENE_KAMPAGNE")!.length === 1);
          campaignNum = blocks.get("SZENE_KAMPAGNE")![0].data.read32();
        }
        // The missionNum denotes which
        let missionNum = -1;
        if (blocks.has("SZENE_MISSNR")) {
          assert(blocks.get("SZENE_MISSNR")!.length === 1);
          missionNum = blocks.get("SZENE_MISSNR")![0].data.read32();
        }

        return {
          blocks,
          ranking,
          campaignNum,
          missionNum,
          name: mission.name,
          file: mission
        };
      })
    );
    missions.sort((a, b) => {
      if (a.missionNum !== -1 && b.missionNum === -1) {
        return -1;
      } else if (a.missionNum === -1 && b.missionNum !== -1) {
        return 1;
      } else if (a.missionNum !== -1 && b.missionNum !== -1) {
        if (a.missionNum < b.missionNum) {
          return -1;
        } else if (a.missionNum > b.missionNum) {
          return 1;
        } else {
          // TODO: Sort missions within mission
          return 0;
        }
      } else {
        // TODO: Sort otherwise
        return 0;
      }
    });

    console.table(missions);

    return missions;
  }
}
