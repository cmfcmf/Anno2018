import JSZip from "jszip";
import FileSystem from "./filesystem";
import BSHParser from './parsers/bsh-parser';

(async () => {
    const fs = new FileSystem();
    await fs.init(1024 * 1024 * 200);

    const uploadBtn = document.createElement('input');
    uploadBtn.type = 'file';
    uploadBtn.multiple = false;
    uploadBtn.pattern = /\*\.zip/;

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

        const zip = await new JSZip().loadAsync(zipFileEntry);
        const annoRoot = zip.folder('Anno 1602');
        //copyIslands(annoRoot);
        //copySaves(annoRoot);
        await parseBSHs(annoRoot);
    };

    document.body.appendChild(uploadBtn);

    console.table(await fs.ls(fs.root()));
    console.log(await fs.df());

    async function parseBSHs(annoRoot) {
        const parser = new BSHParser(annoRoot, fs);

        const results = [
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
        });

        await Promise.all(results);
    }

    function copyIslands(annoRoot) {
        copyFolderFromZip(annoRoot, "NOKLIMA", "/islands/noklima", ".scp");
        copyFolderFromZip(annoRoot, "NORD",    "/islands/north", ".scp");
        copyFolderFromZip(annoRoot, "NORDNAT", "/islands/northnat", ".scp");
        copyFolderFromZip(annoRoot, "SUED",    "/islands/south", ".scp");
        copyFolderFromZip(annoRoot, "SUEDNAT", "/islands/southnat", ".scp");
    }

    function copySaves(annoRoot) {
        copyFolderFromZip(annoRoot, 'SAVEGAME', '/saves', '.gam')
    }

    async function copyFolderFromZip(zip, inPath, outPath, fileExtension) {
        inPath = `${inPath}/`;
        console.debug(`Copying '${fileExtension}' files from '${inPath}' to '${outPath}'.`);
        //await fs.rm(outPath);
        await fs.mkdir(outPath);

        const f = [];
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
            fs.write(targetPath, await file.async('blob'));
        }

        //console.table(await fs.ls(outPath));
    }
})();
