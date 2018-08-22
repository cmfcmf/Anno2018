import * as JSZip from "jszip";
import { JSZipObject } from "jszip";
import * as log from "loglevel";
import * as React from "react";
import { ChangeEvent } from "react";
import * as ReactDOM from "react-dom";
import FileSystem from "./filesystem";
import BSHParser from "./parsers/BSH/bsh-parser";
import CODParser from "./parsers/COD/cod-parser";
import DATParser from "./parsers/DAT/dat-parser";
import SMKParser from "./parsers/SMK/smk-parser";
import Stream from "./parsers/stream";
// import MP3Encoder from "./parsers/WAV/mp3-encoder";
import WAVParser from "./parsers/WAV/wav-parser";
import BitmapFontGenerator from "./parsers/ZEI/bitmap-font-generator";
import parseTranslations from "./translation/translation-parser";
import UploadInfo from "./uploadInfo";
import { findRootInZip } from "./util/util";

const escapeStringRegexp = require("escape-string-regexp");

export interface UploadLogger {
  readonly info: (msg: string) => void;
  readonly warn: (msg: string) => void;
  readonly error: (msg: string) => void;
}

export default class UploadHandler {
  private logger: UploadLogger;

  constructor(private readonly fs: FileSystem) {
    this.logger = log;
  }

  public async init() {
    console.table(await this.fs.ls("/"));
  }

  public render(game: HTMLElement) {
    const notes = document.createElement("div");
    ReactDOM.render(
      React.createElement(UploadInfo, {
        onUploaded: this.uploadAndParse.bind(this),
        onReset: this.reset.bind(this),
        onSaveOrMissionUploaded: async (evt: ChangeEvent<HTMLInputElement>) => {
          const files = evt.target.files;
          if (files === null || files.length === 0) {
            return;
          }
          await Promise.all(
            Array.from(files).map(file => this.uploadSaveOrMission(file))
          );
          alert("Upload finished. The page will now refresh.");
          window.location.reload(true);
        },
        setLogger: this.setLogger.bind(this)
      }),
      game
    );

    game.appendChild(notes);
  }

  public async isUploaded() {
    return this.fs.exists("/fields.dat");
  }

  public setLogger(logger: UploadLogger) {
    this.logger = logger;
  }

  private async reset() {
    await this.fs.rmRoot();
  }

  private async uploadAndParse(file: File): Promise<boolean> {
    let zip;
    try {
      await this.fs.write("/original.zip", file);
      const zipFileEntry = await this.fs.open("/original.zip");
      zip = await JSZip.loadAsync(zipFileEntry);
    } catch (e) {
      this.logger.error(`Could not upload the ZIP file: ${e.message}`);
      return false;
    }

    try {
      const annoRoot = findRootInZip(zip);
      await this.fs.rmRoot();

      await this.copyIslands(annoRoot);
      await this.copySaves(annoRoot);
      const customMissionPath = await this.parseTranslations(annoRoot);
      await this.copyMissions(annoRoot, customMissionPath);
      await this.decryptCODs(annoRoot);
      await this.parseDATs();
      await this.parseGADs(annoRoot);
      await this.parseBSHs(annoRoot);
      await this.parseZEIs(annoRoot);
      await this.parseMusic(annoRoot);
      await this.parseVideos(annoRoot);
    } catch (e) {
      this.logger.error(e.message);
      return false;
    }

    return true;
  }

  private async uploadSaveOrMission(file: File) {
    if (file.name.endsWith(".gam")) {
      await this.fs.write(`/saves/${file.name}`, file);
    } else {
      await this.fs.write(`/missions-custom/${file.name}`, file);
    }
  }

  private async parseDATs() {
    return Promise.all(
      [
        ["/fields.dat", "/fields.json"],
        ["/animations.dat", "/animations.json"]
      ].map(async r => {
        const inName = r[0];
        const outName = r[1];
        this.logger.info(`Started parsing "${inName}".`);

        const parser = new DATParser();
        const data = parser.parse(
          await this.fs.openAndGetContentAsText(inName)
        );
        await this.fs.write(outName, JSON.stringify(data));

        this.logger.info(`Finished parsing "${inName}".`);
      })
    );
  }

  private async parseGADs(annoRoot: JSZip) {
    await this.fs.mkdir("/screens");

    const files = [
      ["Anno.gad", ""],
      ["BASE.GAD", "menu_main"],
      ["BAU.GAD", ""],
      ["BAUKONT.GAD", ""],
      ["BAUSHIP.GAD", ""],
      ["BERGWERK.GAD", ""],
      ["BUBBLE01.GAD", ""],
      ["BUBBLE.GAD", ""],
      ["CHAT.GAD", ""],
      ["CLIENT.GAD", ""],
      ["CTRL.GAD", ""],
      ["DISK.GAD", ""],
      // ["ENDE_DEM.GAD", ""],
      ["ENDE.GAD", "menu_points"],
      ["FARBWAHL.GAD", "menu_player_selection"],
      ["HANDEL.GAD", ""],
      ["HOST.GAD", "menu_missions"],
      ["INFO.GAD", ""],
      ["INFRA.GAD", ""],
      ["KONTOR.GAD", ""],
      ["LAGER.GAD", ""],
      ["LEIST.GAD", ""],
      ["MARKT.GAD", ""],
      ["MILITAR.GAD", ""],
      ["MISSION.GAD", "menu_mission_details"],
      ["MISSZIEL.GAD", ""],
      ["MKSHIP.GAD", ""],
      ["MKSOLDAT.GAD", ""],
      ["MUSIK.GAD", ""],
      ["OPTION.GAD", ""],
      ["PIRAT.GAD", ""],
      ["PIRATORD.GAD", ""],
      ["PLANTAGE.GAD", ""],
      ["PROD.GAD", ""],
      ["ROUTE.GAD", ""],
      ["SCAPE.GAD", ""],
      ["SHIP.GAD", ""],
      ["SHIPLIST.GAD", ""],
      ["SIEDLER.GAD", ""],
      ["SKSHIP.GAD", ""],
      ["SKSOLDAT.GAD", ""],
      ["STADT.GAD", ""],
      ["STADTLST.GAD", ""],
      ["TOOLS.INC", ""],
      ["TRADE.GAD", ""],
      ["TRADER.GAD", ""],
      ["TRANSFER.GAD", ""],
      ["TRIBUT.GAD", ""],
      ["TUTOR.GAD", ""],
      ["VERTRAG.GAD", ""],
      ["WAITLOAD.GAD", "menu_loading"],
      ["WERFT.GAD", ""]
    ];

    for (const r of files) {
      if (r[1] === "") {
        r[1] = r[0];
      }
      const inName = `GADDATA/${r[0]}`;
      const outName = `/screens/${r[1]}.json`;
      this.logger.info(`Started parsing "${inName}".`);

      const parser = new DATParser();

      const gadFile = this.findFileCaseInsensitive(annoRoot, inName);
      const data = parser.parse(await gadFile.async("text"));
      await this.fs.write(outName, JSON.stringify(data));

      this.logger.info(`Finished parsing "${inName}".`);
    }
  }

  private async decryptCODs(annoRoot: JSZip) {
    const parser = new CODParser();

    return Promise.all(
      [["haeuser.cod", "/fields.dat"], ["figuren.cod", "/animations.dat"]].map(
        async r => {
          const inName = r[0];
          const outName = r[1];

          this.logger.info(`Started parsing "${inName}".`);

          const codFile = this.findFileCaseInsensitive(annoRoot, inName);
          const codStream = await Stream.fromZipObject(codFile);
          await this.fs.write(outName, parser.decrypt(codStream));

          this.logger.info(`Finished parsing "${inName}".`);
        }
      )
    );
  }

  private async parseBSHs(annoRoot: JSZip) {
    const parser = new BSHParser();

    const files = [
      ["GFX/NUMBERS", "NUMBERS"],
      ["GFX/STADTFLD", "STADTFLD"],
      ["GFX/EFFEKTE", "EFFEKT"],
      ["GFX/FISCHE", "WAL"],
      ["GFX/GAUKLER", "GAUKLER"],
      ["GFX/MAEHER", "MAEHER"],
      ["GFX/SCHATTEN", "SCHATTEN"],
      ["GFX/SHIP", "SHIP"],
      ["GFX/SOLDAT", "SOLDAT"],
      ["GFX/TIERE", "RIND"],
      ["GFX/TRAEGER", "TRAEGER"],
      ["ToolGfx/BAUHAUS", "TOOLS/BAUHAUS"],
      ["ToolGfx/BAUSHIP", "TOOLS/BAUSHIP"],
      // ["ToolGfx/EDITOR",  "TOOLS/EDITOR"],
      ["ToolGfx/START", "TOOLS/START"],
      ["ToolGfx/SYMBOL", "TOOLS/SYMBOL"],
      ["ToolGfx/TOOLS", "TOOLS/TOOLS"]
    ];
    for (const r of files) {
      const inName = r[0] + ".BSH";
      const outName = r[1];

      this.logger.info(`Started parsing "${inName}".`);
      const bshFile = this.findFileCaseInsensitive(annoRoot, inName);
      const images = await parser.decodeBSH(
        await Stream.fromZipObject(bshFile)
      );
      const sheets = parser.createSpriteSheets(images);
      await parser.saveSpriteSheets(this.fs, sheets, `/gfx/${outName}`);
      this.logger.info(`Finished parsing "${inName}".`);
    }
  }

  private async parseTranslations(annoRoot: JSZip) {
    this.logger.info("Started parsing translations.");
    const translationFile = this.findFileCaseInsensitive(annoRoot, "text.cod");
    const codParser = new CODParser();
    const translations = parseTranslations(
      codParser.decrypt(await Stream.fromZipObject(translationFile))
    );
    await this.fs.write("/translations.json", JSON.stringify(translations));
    this.logger.info("Finished parsing translations.");

    return translations.PATH[0];
  }

  private async parseZEIs(annoRoot: JSZip) {
    await this.fs.mkdir("/fonts");

    const parser = new BSHParser();
    const bitmapFontGenerator = new BitmapFontGenerator();

    const files = [
      "ZEI11A",
      "ZEI14A",
      "ZEI14V",
      "ZEI16G",
      "ZEI16H",
      "ZEI16V",
      "ZEI20H",
      "ZEI20V",
      "ZEI24V",
      "ZEI28V",
      "ZEI2",
      "ZEI9A"
    ];
    for (const fontName of files) {
      const inName = `TOOLGFX/${fontName}.ZEI`;
      this.logger.info(`Started parsing "${inName}".`);

      const zeiFile = this.findFileCaseInsensitive(annoRoot, inName);
      const images = await parser.decodeZEI(
        await Stream.fromZipObject(zeiFile)
      );
      const sheets = parser.createSpriteSheets(images);
      await parser.saveSpriteSheets(this.fs, sheets, `/fonts/${fontName}`);
      const font = await bitmapFontGenerator.createBitmapFont(sheets, fontName);

      await this.fs.write(`/fonts/${fontName}/font.xml`, font);

      this.logger.info(`Finished parsing "${inName}".`);
    }
  }

  private async parseMusic(annoRoot: JSZip) {
    await this.fs.mkdir("/music");

    if (!this.hasFolderCaseInsensitive(annoRoot, "MUSIC8")) {
      this.logger.warn("No music files found.");
      return;
    }

    const wavParser = new WAVParser();
    // const mp3Encoder = new MP3Encoder();

    const songs = await this.findFilesInZip(annoRoot, "MUSIC8", ".wav");
    for (const song of songs) {
      const name = song.path.substr(1);
      this.logger.info(`Converting song ${name}`);
      const rawData = wavParser.decode(await song.file.async("uint8array"));
      const wavData = wavParser.encode(rawData);

      await this.fs.write(`/music/${name}`, wavData);

      // Alternatively, we could convert the .wav files into .mp3 format.
      // This takes about 10 seconds per .wav file.
      //
      // const mp3Data = mp3Encoder.encode(rawData);
      // await this.fs.write(
      //     `/music/${name.replace(".wav", ".mp3")}`,
      //     mp3Data,
      // );

      this.logger.info(`Finished converting song ${name}`);
    }
  }

  private async parseVideos(annoRoot: JSZip) {
    await this.fs.mkdir("/videos");

    if (!this.hasFolderCaseInsensitive(annoRoot, "VIDEOSMK")) {
      this.logger.warn("No video files found.");
      return;
    }

    const smkParser = new SMKParser();

    const videos = await this.findFilesInZip(annoRoot, "VIDEOSMK", ".smk");
    for (const video of videos) {
      const name = video.path.substr(1);
      this.logger.info(`Converting video ${name}`);

      const videoData = await video.file.async("uint8array");
      const result = await smkParser.parse(videoData);

      await this.fs.write(`/videos/${name.replace(".smk", ".mp4")}`, result);
      this.logger.info(`Finished converting video ${name}`);
    }
  }

  private async copyIslands(annoRoot: JSZip) {
    return Promise.all(
      [
        ["NOKLIMA", "/islands/noklima"],
        ["NORD", "/islands/north"],
        ["NORDNAT", "/islands/northnat"],
        ["SUED", "/islands/south"],
        ["SUEDNAT", "/islands/southnat"]
      ].map(r => {
        return this.copyFolderFromZip(annoRoot, r[0], r[1], ".scp");
      })
    );
  }

  private async copySaves(annoRoot: JSZip) {
    await this.copyFolderFromZip(annoRoot, "SAVEGAME", "/saves", ".gam");
  }

  private async copyMissions(annoRoot: JSZip, customMissionPath: string) {
    await this.copyFolderFromZip(
      annoRoot,
      "Szenes",
      "/missions-original",
      ".szm|.szs|.hss"
    );
    await this.copyFolderFromZip(
      annoRoot,
      customMissionPath,
      "/missions-custom",
      ".szm|.szs|.hss"
    );
  }

  private async copyFolderFromZip(
    zip: JSZip,
    inPath: string,
    outPath: string,
    fileExtensions: string,
    makeLowerCase: boolean = true
  ) {
    inPath = `${inPath}/`;
    this.logger.info(
      `Copying '${fileExtensions}' files from '${inPath}' to '${outPath}'.`
    );

    const files = this.findFilesInZip(zip, inPath, fileExtensions);

    await this.fs.mkdir(outPath);

    for (const fileAndPath of files) {
      const relativePath = makeLowerCase
        ? fileAndPath.path.toLowerCase()
        : fileAndPath.path;
      const file = fileAndPath.file;

      const targetPath = `${outPath}/${relativePath}`;
      this.logger.info(`Copying '${relativePath}' to '${targetPath}'.`);
      await this.fs.write(targetPath, await file.async("blob"));
    }
  }

  private findFilesInZip(zip: JSZip, inPath: string, fileExtensions: string) {
    const files: Array<{ path: string; file: JSZipObject }> = [];
    zip.forEach((relativePath, file) => {
      if (relativePath.startsWith(inPath)) {
        for (const fileExtension of fileExtensions.split("|")) {
          if (
            relativePath.toLowerCase().endsWith(fileExtension.toLowerCase())
          ) {
            relativePath = relativePath.substring(inPath.length);
            relativePath = relativePath.substring(
              0,
              relativePath.length - fileExtension.length
            );
            relativePath += fileExtension;
            files.push({
              path: relativePath,
              file: file
            });
            break;
          }
        }
      }
    });
    return files;
  }

  private findFileCaseInsensitive(zip: JSZip, path: string): JSZip.JSZipObject {
    const caseInsensitiveFileName = new RegExp(escapeStringRegexp(path), "i");
    const file = zip.file(caseInsensitiveFileName)[0];
    if (file === undefined) {
      throw new Error(`Could not find file ${path}.`);
    }

    return file;
  }

  private hasFolderCaseInsensitive(zip: JSZip, path: string): boolean {
    const caseInsensitiveFolderName = new RegExp(escapeStringRegexp(path), "i");
    return zip.folder(caseInsensitiveFolderName)[0] !== undefined;
  }
}
