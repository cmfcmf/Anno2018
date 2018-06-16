import * as JSZip from "jszip";
import FileSystem from "./filesystem";
import BSHParser from './parsers/BSH/bsh-parser';
import CODParser from './parsers/COD/cod-parser';
import {JSZipObject} from 'jszip';

(async () => {
    const fs = new FileSystem();
    await fs.init(1024 * 1024 * 200);

    const uploadBtn = document.createElement('input');
    uploadBtn.type = 'file';
    uploadBtn.multiple = false;
    uploadBtn.pattern = '*\\.zip';

    /*
    const tmp = await fs.open('/animations.dat');
    const reader2 = new FileReader();
    reader2.onload = (event => {
        const text:string = event.target.result;
        console.log(text);
    });
    reader2.readAsText(tmp, 'CP1251');
    */
    uploadBtn.onchange = async () => {
        const files = uploadBtn.files;
        if (files.length !== 1) {
            alert('Please select the zipped Anno1602 folder to upload.');
            return;
        }
        const file = files[0];
        if (!file.name.endsWith('.zip')) {
            alert('You need to upload a .zip file!');
            return;
        }
        uploadBtn.disabled = true;

        fs.write('/original.zip', file);

        const zipFileEntry = await fs.open('/original.zip');

        const zip = await JSZip.loadAsync(zipFileEntry);
        const annoRoot = zip.folder('Anno 1602');
        await copyIslands(annoRoot);
        await copySaves(annoRoot);
        await decodeCODs(annoRoot);
        await parseBSHs(annoRoot);
    };

    document.body.appendChild(uploadBtn);

    console.table(await fs.ls(fs.root()));
    console.log(await fs.df());

    async function decodeCODs(annoRoot: JSZip) {
        const parser = new CODParser(annoRoot, fs);

        return Promise.all([
            ['haeuser.cod', 'fields.dat'],
            ['figuren.cod', 'animations.dat'],
        ].map(r => {
            return parser.parse(r[0], r[1]);
        }));
    }

    async function parseBSHs(annoRoot: JSZip) {
        const parser = new BSHParser(annoRoot, fs);

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
        ].map(r => {
            return parser.parse(r[0], r[1]);
        }));
    }

    async function copyIslands(annoRoot: JSZip) {
        return Promise.all([
            ["NOKLIMA", "/islands/noklima"],
            ["NORD",    "/islands/north"],
            ["NORDNAT", "/islands/northnat"],
            ["SUED",    "/islands/south"],
            ["SUEDNAT", "/islands/southnat"],
        ].map(r => {
            return copyFolderFromZip(annoRoot, r[0], r[1], ".scp");
        }));
    }

    async function copySaves(annoRoot: JSZip) {
        return copyFolderFromZip(annoRoot, 'SAVEGAME', '/saves', '.gam')
    }

    async function copyFolderFromZip(zip: JSZip, inPath: string, outPath: string, fileExtension: string) {
        inPath = `${inPath}/`;
        console.debug(`Copying '${fileExtension}' files from '${inPath}' to '${outPath}'.`);
        //await fs.rm(outPath);
        await fs.mkdir(outPath);

        const f: {path: string, file: JSZipObject}[] = [];
        zip.forEach((relativePath, file) => {
            if (relativePath.startsWith(inPath) && relativePath.endsWith(fileExtension)) {
                f.push({
                    path: relativePath,
                    file: file,
                });
            }
        });

        for (const obj of f) {
            const relativePath = obj.path;
            const file = obj.file;

            const targetPath = `${outPath}/${relativePath.substring(inPath.length)}`;
            console.debug(`Copying '${relativePath}' to '${targetPath}'.`);
            await fs.write(targetPath, await file.async('blob'));
        }

        //console.table(await fs.ls(outPath));
    }
})();
