import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import * as log from "loglevel";
import FileSystem from "./filesystem";
import BSHParser from "./parsers/BSH/bsh-parser";
import CODParser from "./parsers/COD/cod-parser";
import DATParser from "./parsers/DAT/dat-parser";
import Stream from "./parsers/stream";

export default class UploadHandler {
    constructor(private fs: FileSystem) { }

    public async init() {
        await this.fs.init(1024 * 1024 * 200);

        console.table(await this.fs.ls("/"));
        console.log(await this.fs.df());
    }

    public render() {
        const uploadBtn = document.createElement("input");
        uploadBtn.type = "file";
        uploadBtn.multiple = false;
        uploadBtn.accept = "zip";

        uploadBtn.onchange = async () => {
            const files = uploadBtn.files;
            if (files.length !== 1) {
                alert("Please select the zipped Anno1602 folder to upload.");
                return;
            }
            const file = files[0];
            if (!file.name.endsWith(".zip")) {
                alert("You need to upload a .zip file!");
                return;
            }
            uploadBtn.disabled = true;

            await this.fs.write("/original.zip", file);

            const zipFileEntry = await this.fs.open("/original.zip");

            const zip = await JSZip.loadAsync(zipFileEntry);
            const annoRoot = zip.folder("Anno 1602");

            await this.copyIslands(annoRoot);
            await this.copySaves(annoRoot);
            await this.decryptCODs(annoRoot);
            await this.parseDATs(annoRoot);
            await this.parseBSHs(annoRoot);

            console.info("Upload finished.");
        };
        document.body.appendChild(uploadBtn);

        const resetBtn = document.createElement("button");
        resetBtn.innerText = "Reset All Files";
        resetBtn.onclick = async () => {
            const entries = await this.fs.ls("/");
            for (const entry of entries) {
                await this.fs.rm(entry);
            }
            alert("All files deleted");
            window.location.reload(true);
        };
        document.body.appendChild(resetBtn);
    }

    private async parseDATs(annoRoot: JSZip) {
        return Promise.all([
            ["fields.dat", "fields.json"],
            ["animations.dat", "animations.json"],
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
            ["haeuser.cod", "fields.dat"],
            ["figuren.cod", "animations.dat"],
        ].map(async (r) => {
            const inName = r[0];
            const outName = r[1];

            log.info(`Started parsing "${inName}".`);

            const codFile = annoRoot.file(inName);
            const codStream = await Stream.fromZipObject(codFile);
            await this.fs.write(outName, parser.parse(codStream));

            log.info(`Finished parsing "${inName}".`);
        }));
    }

    private async parseBSHs(annoRoot: JSZip) {
        const parser = new BSHParser(annoRoot, this.fs);

        return Promise.all([
            ["NUMBERS",  "NUMBERS"],
            ["STADTFLD", "STADTFLD"],
            ["EFFEKTE",  "EFFEKT"],
            ["FISCHE",   "WAL"],
            ["GAUKLER",  "GAUKLER"],
            ["MAEHER",   "MAEHER"],
            ["SCHATTEN", "SCHATTEN"],
            ["SHIP",     "SHIP"],
            ["SOLDAT",   "SOLDAT"],
            ["TIERE",    "RIND"],
            ["TRAEGER",  "TRAEGER"],
            ["TOOLS",    "TOOLS"],
        ].map((r) => {
            return parser.parse(r[0], r[1]);
        }));
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
        return this.copyFolderFromZip(annoRoot, "SAVEGAME", "/saves", ".gam");
    }

    private async copyFolderFromZip(zip: JSZip, inPath: string, outPath: string, fileExtension: string,
                                    makeLowerCase: boolean = true) {
        inPath = `${inPath}/`;
        console.debug(`Copying '${fileExtension}' files from '${inPath}' to '${outPath}'.`);
        // await fs.rm(outPath);
        await this.fs.mkdir(outPath);

        const files: Array<{path: string, file: JSZipObject}> = [];
        zip.forEach((relativePath, file) => {
            if (relativePath.startsWith(inPath) && relativePath.toLowerCase().endsWith(fileExtension.toLowerCase())) {
                relativePath = relativePath.substring(inPath.length);
                relativePath = relativePath.substring(0, relativePath.length - fileExtension.length) + fileExtension;
                if (makeLowerCase) {
                    relativePath = relativePath.toLowerCase();
                }
                files.push({
                    path: relativePath,
                    file: file,
                });
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
