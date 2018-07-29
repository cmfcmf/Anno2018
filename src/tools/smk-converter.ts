import SMKParser from "../parsers/SMK/smk-parser";

const fs = require("fs");

const args = process.argv;
if (args.length !== 4) {
    console.error("Please provide the input path to a .smk file as well as the output path to a .mp4 file.");
    process.exit(1);
}

const inFilePath = args[2];
const outFilePath = args[3];
if (!inFilePath.toLowerCase().endsWith(".smk")) {
    console.error("Input file extension must be .smk!");
    process.exit(1);
}
if (!outFilePath.toLowerCase().endsWith(".mp4")) {
    console.error("Output file extension must be .mp4!");
    process.exit(1);
}
if (!fs.existsSync(inFilePath)) {
    console.error(`${inFilePath} does not exist.`);
    process.exit(1);
}

console.info(`Converting ${inFilePath}`);

function fileSize(x: number) {
    return Math.round(x / 10_000) / 100;
}

// tslint:disable-next-line:no-floating-promises
(async () => {
    const smkParser = new SMKParser();
    const mp4Data: Uint8Array = await smkParser.parse(fs.readFileSync(inFilePath));

    fs.writeFileSync(outFilePath, mp4Data);

    console.log(`Original file size: ${fileSize(fs.statSync(inFilePath).size)} MB`);
    console.log(`New file size: ${fileSize(fs.statSync(outFilePath).size)} MB`);
})();
