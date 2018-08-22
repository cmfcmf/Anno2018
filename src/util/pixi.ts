import * as PIXI from "pixi.js";
import { uInt8ToBase64 } from "./util";

export function textureFromUint8ArrayPNG(data: Uint8Array) {
  return PIXI.Texture.fromImage(`data:image/png;base64,${uInt8ToBase64(data)}`);
}

export function textureFromUint8ArrayMP4(data: Uint8Array): PIXI.Texture {
  return PIXI.Texture.fromVideoUrl(
    `data:video/mp4;base64,${uInt8ToBase64(data)}`
  );
}
