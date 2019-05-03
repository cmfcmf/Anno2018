import { Texture } from "pixi.js";
import { uInt8ToBase64 } from "./util";

export function textureFromUint8ArrayPNG(data: Uint8Array) {
  return Texture.from(`data:image/png;base64,${uInt8ToBase64(data)}`);
}

export async function textureFromUint8ArrayMP4(
  data: Uint8Array
): Promise<Texture> {
  const tmpVideo = document.createElement("video");
  tmpVideo.src = `data:video/mp4;base64,${uInt8ToBase64(data)}`;
  const texture = Texture.from(tmpVideo);
  await new Promise((resolve, reject) => {
    texture.baseTexture.addListener("loaded", resolve);
    texture.baseTexture.addListener("error", reject);
  });
  return texture;
}
