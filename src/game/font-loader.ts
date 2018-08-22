import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";
import { uInt8ToBase64 } from "../util/util";

export default class FontLoader {
  constructor(private readonly fs: FileSystem) {}

  public async load() {
    const fonts: { [name: string]: { size: number } } = {
      ZEI20V: { size: 24 }
    };
    for (const fontName of Object.keys(fonts)) {
      // const size = fonts[fontName].size;
      console.log(`Loading font ${fontName}.`);
      const font = await this.fs.openAndGetContentAsUint8Array(
        `/fonts/${fontName}/font.xml`
      );
      await new Promise(resolve => {
        PIXI.loader
          .add(fontName, `data:application/xml;base64,${uInt8ToBase64(font)}`)
          .load(resolve);
      });
      console.log(`Finished loading font ${fontName}.`);
    }
  }
}
