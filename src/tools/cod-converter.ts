import Stream from "../parsers/stream";
import CODParser from "./../parsers/COD/cod-parser";

const fs = require("fs");

const args = process.argv;
if (args.length !== 4) {
    console.error("Please provide the input path to a .cod or .gam file as well as the output path");
    process.exit(1);
}

const inFilePath = args[2];
const outFilePath = args[3];
if (!(inFilePath.endsWith(".dat") || inFilePath.endsWith(".cod"))) {
    console.error("File extension must be .dat or .cod!");
    process.exit(1);
}

console.info(`Converting ${inFilePath}`);

const codParser = new CODParser();
if (inFilePath.endsWith(".cod")) {
    const data = fs.readFileSync(inFilePath);
    const content = codParser.decrypt(new Stream(data));
    fs.writeFileSync(outFilePath, content);
} else {
    const data = fs.readFileSync(inFilePath, {encoding: "utf8"});
    fs.writeFileSync(outFilePath, codParser.encrypt(data));
}
