import DATParser from "../parsers/DAT/dat-parser";

const fs = require("fs");

const args = process.argv;
if (args.length !== 4) {
    console.error("Please provide the input path to a .cod or .gam file as well as the output path");
    process.exit(1);
}

const inFilePath = args[2];
const outFilePath = args[3];
if (!(inFilePath.toLowerCase().endsWith(".dat") || inFilePath.toLowerCase().endsWith(".gad"))) {
    console.error("Input file extension must be .dat or .gad!");
    process.exit(1);
}
if (!outFilePath.toLowerCase().endsWith(".json")) {
    console.error("Output file extension must be .json!");
    process.exit(1);
}

console.info(`Converting ${inFilePath}`);

const datParser = new DATParser();
const data = fs.readFileSync(inFilePath, {encoding: "utf8"});
const content = datParser.parse(data);
fs.writeFileSync(outFilePath, JSON.stringify(content));
