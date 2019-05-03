// @ts-ignore
global.window = {};
// @ts-ignore
global.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      fillStyle: "",
      // tslint:disable-next-line:no-empty
      fillRect: () => {},
      // tslint:disable-next-line:no-empty
      drawImage: () => {},
      // tslint:disable-next-line:no-empty
      getImageData: () => {}
    })
  })
};
// @ts-ignore
global.navigator = {
  userAgent: ""
};

import GAMParser from "../parsers/GAM/gam-parser";
import Stream from "../parsers/stream";

const path = require("path");
const fs = require("fs");

const args = process.argv;
if (args.length !== 3) {
  console.error(
    "Please provide the input path to a directory containing .gam files"
  );
  process.exit(1);
}

const inFilePath = args[2];

console.info(`Converting ${inFilePath}`);

const gamParser = new GAMParser(null);

// tslint:disable-next-line:no-floating-promises
fs.readdirSync(inFilePath).forEach(async (fileName: string) => {
  if (!fileName.endsWith(".gam")) {
    return;
  }
  const p = path.join(inFilePath, fileName);
  const data = fs.readFileSync(p);
  const blocks = gamParser.parse(new Stream(data));
  const { world, worldGenerationSettings } = await gamParser.doParse(blocks);
  fs.writeFileSync(`${p}.json`, JSON.stringify(world, null, "  "));
});
