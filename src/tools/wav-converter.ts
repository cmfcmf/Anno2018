import WAVParser from "../parsers/WAV/wav-parser";

const fs = require("fs");

const args = process.argv;
if (args.length !== 4) {
    console.error("Please provide the input path to a .wav file as well as the output path");
    process.exit(1);
}

const inFilePath = args[2];
const outFilePath = args[3];
if (!inFilePath.toLowerCase().endsWith(".wav") || !outFilePath.toLowerCase().endsWith(".wav")) {
    console.error("File extensions must be .wav!");
    process.exit(1);
}
if (!fs.existsSync(inFilePath)) {
    console.error(`${inFilePath} does not exist.`);
    process.exit(1);
}

console.info(`Converting ${inFilePath}`);

const parser = new WAVParser();
fs.writeFileSync(outFilePath, parser.parse(fs.readFileSync(inFilePath)));
