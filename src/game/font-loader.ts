import { Loader } from "pixi.js";
import FileSystem from "../filesystem";
import { uInt8ToBase64 } from "../util/util";

export default class FontLoader {
  private static fonts = {
    0: {
      name: "ZEI20V",
      size: 24
    },
    1: {
      name: "ZEI14A",
      size: 18
    },
    2: {
      name: "ZEI28V",
      size: 32
    }
  };

  constructor(private readonly fs: FileSystem) {}

  public static getFontByGadId(id: number) {
    // @ts-ignore
    return this.fonts[id];
  }

  public async load() {
    for (const { name: fontName } of Object.values(FontLoader.fonts)) {
      console.log(`Loading font ${fontName}.`);
      const font = await this.fs.openAndGetContentAsUint8Array(
        `/fonts/${fontName}/font.xml`
      );
      await new Promise(resolve => {
        Loader.shared
          .add(fontName, `data:application/xml;base64,${uInt8ToBase64(font)}`)
          .load(resolve);
      });
      console.log(`Finished loading font ${fontName}.`);
    }
  }
}
