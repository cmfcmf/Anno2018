import WAVParser from "./parsers/WAV/wav-parser";

const escapeStringRegexp = require("escape-string-regexp");
import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import * as log from "loglevel";
import FileSystem from "./filesystem";
import BSHParser from "./parsers/BSH/bsh-parser";
import CODParser from "./parsers/COD/cod-parser";
import DATParser from "./parsers/DAT/dat-parser";
import Stream from "./parsers/stream";

export default class UploadHandler {
    constructor(private readonly fs: FileSystem) { }

    public async init() {
        console.table(await this.fs.ls("/"));
        // Doesn't work in Firefox
        // console.log(await this.fs.df());
    }

    public render(game: HTMLElement) {
        const uploadBtn = this.createUploadButton();
        const saveOrMissionUploadButton = this.createSaveOrMissionUploadButton();
        const resetBtn = this.createResetButton();

        game.appendChild(uploadBtn);
        game.appendChild(saveOrMissionUploadButton);
        game.appendChild(resetBtn);
    }

    public async isUploaded() {
        return await this.fs.exists("/fields.dat");
    }

    private createUploadButton() {
        const uploadBtn = document.createElement("input");
        uploadBtn.type = "file";
        uploadBtn.multiple = false;
        uploadBtn.accept = ".zip";
        uploadBtn.onchange = async () => {
            const files = uploadBtn.files;
            if (files === null || files.length !== 1) {
                alert("Please select the zipped Anno1602 folder to upload.");
                return;
            }
            const file = files[0];
            if (!file.name.endsWith(".zip")) {
                alert("You need to upload a .zip file!");
                return;
            }
            uploadBtn.disabled = true;
            await this.uploadAndParse(file);

            alert("Upload finished. The page will now refresh.");
            window.location.reload(true);
        };
        return uploadBtn;
    }

    private createSaveOrMissionUploadButton() {
        const uploadBtn = document.createElement("input");
        uploadBtn.type = "file";
        uploadBtn.multiple = true;
        uploadBtn.accept = ".szm,.szs,.gam";
        uploadBtn.onchange = async () => {
            const files = uploadBtn.files;
            if (files === null || files.length === 0) {
                return;
            }
            uploadBtn.disabled = true;
            await Promise.all(Array.from(files).map((file) => this.uploadSaveOrMission(file)));
            alert("Upload finished. The page will now refresh.");
            window.location.reload(true);
        };
        return uploadBtn;
    }

    private createResetButton() {
        const resetBtn = document.createElement("button");
        resetBtn.innerText = "Reset All Files";
        resetBtn.onclick = async () => {
            resetBtn.disabled = true;
            await this.fs.rmRoot();
            alert("All files deleted. The page will now refresh.");
            window.location.reload(true);
        };
        return resetBtn;
    }

    private async uploadAndParse(file: File): Promise<boolean> {
        await this.fs.write("/original.zip", file);
        const zipFileEntry = await this.fs.open("/original.zip");

        let zip;
        try {
            zip = await JSZip.loadAsync(zipFileEntry);
        } catch (e) {
            this.error("Could not open the uploaded ZIP file.", e);
            return false;
        }

        let annoRoot;
        try {
            annoRoot = this.findRootInZip(zip);
        } catch (e) {
            this.error("", e);
            return false;
        }
        await this.fs.rmRoot();

        await this.copyIslands(annoRoot);
        await this.copySaves(annoRoot);
        await this.copyMissions(annoRoot);
        await this.decryptCODs(annoRoot);
        await this.parseDATs(annoRoot);
        await this.parseBSHs(annoRoot);
        await this.parseMusic(annoRoot);

        return true;
    }

    private async uploadSaveOrMission(file: File) {
        if (file.name.endsWith(".gam")) {
            await this.fs.write(`/saves/${file.name}`, file);
        } else {
            await this.fs.write(`/missions-custom/${file.name}`, file);
        }
    }

    private findRootInZip(zip: JSZip, root: string = ""): JSZip {
        const topFolderNames = [...new Set(
            zip
                .filter((relativePath, entry) => entry.dir)
                .map((folder) => folder.name.substring(root.length).split("/")[0])),
        ];
        if (topFolderNames.length === 1) {
            const newRoot = topFolderNames[0] + "/";
            return this.findRootInZip(zip.folder(newRoot), newRoot);
        }
        if (topFolderNames.find((name) => name === "GFX") !== undefined) {
            return zip;
        }

        throw new Error("Your ZIP file does not have the expected structure.");
    }

    private error(msg: string, error: Error) {
        alert(msg + "\n" + error.message);
    }

    private async parseDATs(annoRoot: JSZip) {
        return Promise.all([
            ["/fields.dat", "/fields.json"],
            ["/animations.dat", "/animations.json"],
        ].map(async (r) => {
            const inName = r[0];
            const outName = r[1];
            log.info(`Started parsing "${inName}".`);

            const parser = new DATParser();
            const data = parser.parse(await this.fs.openAndGetContentAsText(inName));
            await this.fs.write(outName, JSON.stringify(data));

            log.info(`Finished parsing "${inName}".`);
        }));
    }

    private async decryptCODs(annoRoot: JSZip) {
        const parser = new CODParser();

        return Promise.all([
            ["haeuser.cod", "/fields.dat"],
            ["figuren.cod", "/animations.dat"],
        ].map(async (r) => {
            const inName = r[0];
            const outName = r[1];

            log.info(`Started parsing "${inName}".`);

            const codFile = annoRoot.file(inName);
            const codStream = await Stream.fromZipObject(codFile);
            await this.fs.write(outName, parser.decrypt(codStream));

            log.info(`Finished parsing "${inName}".`);
        }));
    }

    private async parseBSHs(annoRoot: JSZip) {
        const parser = new BSHParser(this.fs);

        const files = [
            ["GFX/NUMBERS",   "NUMBERS"],
            ["GFX/STADTFLD",  "STADTFLD"],
            ["GFX/EFFEKTE",   "EFFEKT"],
            ["GFX/FISCHE",    "WAL"],
            ["GFX/GAUKLER",   "GAUKLER"],
            ["GFX/MAEHER",    "MAEHER"],
            ["GFX/SCHATTEN",  "SCHATTEN"],
            ["GFX/SHIP",      "SHIP"],
            ["GFX/SOLDAT",    "SOLDAT"],
            ["GFX/TIERE",     "RIND"],
            ["GFX/TRAEGER",   "TRAEGER"],
            ["ToolGfx/BAUHAUS", "TOOLS/BAUHAUS"],
            ["ToolGfx/BAUSHIP", "TOOLS/BAUSHIP"],
            // ["ToolGfx/EDITOR",  "TOOLS/EDITOR"],
            ["ToolGfx/START",   "TOOLS/START"],
            ["ToolGfx/SYMBOL",  "TOOLS/SYMBOL"],
            ["ToolGfx/TOOLS",   "TOOLS/TOOLS"],
        ];
        for (const r of files) {
            const inName = r[0] + ".BSH";
            const outName = r[1];

            log.info(`Started parsing "${inName}".`);
            const caseInsensitiveFileInName = new RegExp(escapeStringRegexp(inName), "i");
            const bshFile = annoRoot.file(caseInsensitiveFileInName)[0];
            if (bshFile === undefined) {
                throw new Error(`Could not find file ${inName}.`);
            }
            const images = await parser.parse(await Stream.fromZipObject(bshFile));
            await parser.createSpriteSheets(images, outName);
            log.info(`Finished parsing "${inName}".`);
        }
    }

    private async parseMusic(annoRoot: JSZip) {
        if (!annoRoot.folder("MUSIC8")) {
            console.warn("No music files found.");
            return;
        }
        await this.copyFolderFromZip(annoRoot, "MUSIC8", "/music", ".wav");
        const songs = await this.fs.ls("/music");
        const wavParser = new WAVParser();
        for (const song of songs) {
            log.info(`Converting song ${song.name}`);
            const convertedSong = wavParser.parse(await this.fs.openAndGetContentAsUint8Array(song));
            await this.fs.write(song, convertedSong);
            log.info(`Finished converting song ${song.name}`);
        }
    }

    private async copyIslands(annoRoot: JSZip) {
        return Promise.all([
            ["NOKLIMA", "/islands/noklima"],
            ["NORD",    "/islands/north"],
            ["NORDNAT", "/islands/northnat"],
            ["SUED",    "/islands/south"],
            ["SUEDNAT", "/islands/southnat"],
        ].map((r) => {
            return this.copyFolderFromZip(annoRoot, r[0], r[1], ".scp");
        }));
    }

    private async copySaves(annoRoot: JSZip) {
        await this.copyFolderFromZip(annoRoot, "SAVEGAME", "/saves", ".gam");
    }

    private async copyMissions(annoRoot: JSZip) {
        await this.copyFolderFromZip(annoRoot, "Szenes", "/missions-original", ".szm|.szs|.hss");
        await this.copyFolderFromZip(annoRoot, "Eigene Szenarien", "/missions-custom", ".szm|.szs|.hss");
    }

    private async copyFolderFromZip(zip: JSZip, inPath: string, outPath: string, fileExtensions: string,
                                    makeLowerCase: boolean = true) {
        inPath = `${inPath}/`;
        console.debug(`Copying '${fileExtensions}' files from '${inPath}' to '${outPath}'.`);
        // await fs.rm(outPath);
        await this.fs.mkdir(outPath);

        const files: Array<{path: string, file: JSZipObject}> = [];
        zip.forEach((relativePath, file) => {
            if (relativePath.startsWith(inPath)) {
                for (const fileExtension of fileExtensions.split("|")) {
                    if (relativePath.toLowerCase().endsWith(fileExtension.toLowerCase())) {
                        relativePath = relativePath.substring(inPath.length);
                        relativePath = relativePath.substring(0, relativePath.length - fileExtension.length);
                        relativePath += fileExtension;
                        if (makeLowerCase) {
                            relativePath = relativePath.toLowerCase();
                        }
                        files.push({
                            path: relativePath,
                            file: file,
                        });
                        break;
                    }
                }
            }
        });

        const results = [];
        for (const fileAndPath of files) {
            const relativePath = fileAndPath.path;
            const file = fileAndPath.file;

            const targetPath = `${outPath}/${relativePath}`;
            console.debug(`Copying '${relativePath}' to '${targetPath}'.`);
            results.push(this.fs.write(targetPath, await file.async("blob")));
        }

        // console.table(await fs.ls(outPath));

        return Promise.all(results);
    }
}
