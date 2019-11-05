// @ts-ignore
global.window = {};
// @ts-ignore
global.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      fillStyle: "",
      fillRect: () => {
        // Do nothing
      },
      drawImage: () => {
        // Do nothing
      },
      getImageData: () => {
        // Do nothing
      }
    })
  })
};
// @ts-ignore
global.navigator = {
  userAgent: ""
};

import GAMParser from "../parsers/GAM/gam-parser";
import Stream from "../parsers/stream";
import * as path from "path";
import * as fs from "fs";

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

// eslint-disable-next-line @typescript-eslint/no-floating-promises
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
