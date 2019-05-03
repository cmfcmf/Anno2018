import { Producer } from "../game/world/producer";

const path = require("path");
const fs = require("fs");

const args = process.argv;
if (args.length !== 3) {
  console.error(
    "Please provide the input path to a directory containing .gam.json files"
  );
  process.exit(1);
}

const inFilePath = args[2];

console.info(`Converting ${inFilePath}`);

// tslint:disable-next-line:no-floating-promises
const files = fs.readdirSync(inFilePath);
files.sort((a: string, b: string) => {
  const aa = parseInt(a.split("_")[1].split(".")[0], 10);
  const bb = parseInt(b.split("_")[1].split(".")[0], 10);
  return aa - bb;
});
files.forEach(async (fileName: string) => {
  if (!fileName.endsWith(".gam.json")) {
    return;
  }
  const p = path.join(inFilePath, fileName);
  const data = JSON.parse(fs.readFileSync(p));

  const producers = data.producers.map((producer: Producer) => producer);

  const f = data.producers.map((producer: Producer) => producer);
  // console.log(f);

  console.log(
    Math.round(data.timers.timeGame / 10),
    ":",
    producers[0].timer,
    producers[0].producedGood,
    producers[0].stock,
    data.timers.cntProduction
  ); // ...producers);
});
