import assert from "../../util/assert";
import { RawSamples } from "./wav-parser";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const lamejs = require("lamejs");

export default class MP3Encoder {
  public encode(rawSamples: RawSamples): Uint8Array {
    assert(rawSamples.left.length === rawSamples.right.length);
    const sampleLength = rawSamples.left.length;

    const mp3encoder = new lamejs.Mp3Encoder(2, rawSamples.sampleRate, 128); // kbps, could be 192, 320 also
    const mp3Data = [];

    const sampleBlockSize = 1152;

    for (let i = 0; i < sampleLength; i += sampleBlockSize) {
      const leftChunk = rawSamples.left.subarray(i, i + sampleBlockSize);
      const rightChunk = rawSamples.right.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const lastMp3buf = mp3encoder.flush();
    if (lastMp3buf.length > 0) {
      mp3Data.push(lastMp3buf);
    }

    const mp3Length = mp3Data.reduce((cnt, buf) => cnt + buf.length, 0);
    const data = new Uint8Array(mp3Length);
    let c = 0;
    for (const buf of mp3Data) {
      data.set(buf, c);
      c += buf.length;
    }

    return data;
  }
}
