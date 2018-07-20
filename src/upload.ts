import * as JSZip from "jszip";
import {JSZipObject} from "jszip";
import * as log from "loglevel";
import FileSystem from "./filesystem";
import BSHParser from "./parsers/BSH/bsh-parser";
import CODParser from "./parsers/COD/cod-parser";
import DATParser from "./parsers/DAT/dat-parser";
import Stream from "./parsers/stream";

export default class UploadHandler {
    private readonly FS_SIZE_MB = 200;

    constructor(private fs: FileSystem) { }

    public async init() {
        await this.fs.init(1024 * 1024 * this.FS_SIZE_MB);

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
            await this.uploadAndParse(file);

            alert("Upload finished. The page will now refresh.");
            window.location.reload(true);
        };

        const resetBtn = document.createElement("button");
        resetBtn.innerText = "Reset All Files";
        resetBtn.onclick = async () => {
            resetBtn.disabled = true;
            await this.fs.rmRoot();
            alert("All files deleted. The page will now refresh.");
            window.location.reload(true);
        };

        document.body.appendChild(uploadBtn);
        document.body.appendChild(resetBtn);
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
        await this.decryptCODs(annoRoot);
        await this.parseDATs(annoRoot);
        await this.parseBSHs(annoRoot);

        return true;
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
