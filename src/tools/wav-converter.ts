import MP3Encoder from "../parsers/WAV/mp3-encoder";
import WAVParser from "../parsers/WAV/wav-parser";

const fs = require("fs");

const args = process.argv;
if (args.length !== 4) {
  console.error(
    "Please provide the input path to a .wav file as well as the output path to a .mp3 or .wav file."
  );
  process.exit(1);
}

const inFilePath = args[2];
const outFilePath = args[3];
if (!inFilePath.toLowerCase().endsWith(".wav")) {
  console.error("Input file extension must be .wav!");
  process.exit(1);
}
if (
  !outFilePath.toLowerCase().endsWith(".mp3") &&
  !outFilePath.toLowerCase().endsWith(".wav")
) {
  console.error("Output file extension must be .wav or .mp3!");
  process.exit(1);
}
if (!fs.existsSync(inFilePath)) {
  console.error(`${inFilePath} does not exist.`);
  process.exit(1);
}

console.info(`Converting ${inFilePath}`);

const wavParser = new WAVParser();
const mp3Encoder = new MP3Encoder();
const rawData = wavParser.decode(fs.readFileSync(inFilePath));
if (outFilePath.toLowerCase().endsWith(".mp3")) {
  const data = mp3Encoder.encode(rawData);
  fs.writeFileSync(outFilePath, data);
} else {
  const data = wavParser.encode(rawData);
  fs.writeFileSync(outFilePath, data);
}
