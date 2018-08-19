import BSHParser from "../parsers/BSH/bsh-parser";
import Stream from "../parsers/stream";

const fs = require("fs");

const args = process.argv;
if (args.length !== 4) {
    console.error("Please provide the input path to a .bsh file as well as the output directory");
    process.exit(1);
}

const inFilePath = args[2];
const outDirPath = args[3];
if (!inFilePath.toLowerCase().endsWith(".bsh")) {
    console.error("File extension must be .bsh!");
    process.exit(1);
}
if (!fs.existsSync(inFilePath)) {
    console.error(`${inFilePath} does not exist.`);
    process.exit(1);
}
if (!fs.existsSync(outDirPath)) {
    console.error(`${outDirPath} does not exist.`);
    process.exit(1);
}

console.info(`Converting ${inFilePath}`);

// tslint:disable-next-line:no-floating-promises
(async () => {
    const data = new Stream(fs.readFileSync(inFilePath));
    const bshParser = new BSHParser();
    const images = await bshParser.decodeBSH(data);
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        fs.writeFileSync(`${outDirPath}/${i}.png`, new Buffer(image.toPNG()));
    }
})();
