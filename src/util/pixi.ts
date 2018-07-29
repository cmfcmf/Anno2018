import * as PIXI from "pixi.js";
import {uInt8ToBase64} from "./util";

export function textureFromUint8ArrayPNG(data: Uint8Array) {
    const tmpImage = document.createElement("img");
    tmpImage.src = `data:image/png;base64,${uInt8ToBase64(data)}`;
    return PIXI.Texture.from(tmpImage);
}

export async function textureFromUint8ArrayMP4(data: Uint8Array): Promise<PIXI.VideoBaseTexture> {
    const tmpVideo = document.createElement("video");
    tmpVideo.src = `data:video/mp4;base64,${uInt8ToBase64(data)}`;
    const texture = PIXI.VideoBaseTexture.fromVideo(tmpVideo);

    return new Promise<PIXI.VideoBaseTexture>((resolve, reject) => {
        texture.on("loaded", () => resolve(texture));
        texture.on("error", reject);
    });
}
