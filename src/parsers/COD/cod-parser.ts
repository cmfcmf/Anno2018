import { decode as iconv_decode, encode as iconv_encode } from "iconv-lite";
import Stream from "../stream";

export default class CODParser {
  private encoding = "win1252";

  public decrypt(data: Stream): string {
    const decryptedBytes = Buffer.allocUnsafe(data.length);
    for (let i = 0; i < data.length; i++) {
      decryptedBytes[i] = 256 - data.read8();
    }

    // Decode the bytes using Windows 1252 "Western" encoding.
    // The resulting string will then be written in UTF-8 format.
    return iconv_decode(decryptedBytes, this.encoding);
  }

  public encrypt(content: string): Uint8Array {
    const file = new Stream(iconv_encode(content, this.encoding));
    const encryptedBytes = Buffer.allocUnsafe(file.length);
    for (let i = 0; i < file.length; i++) {
      encryptedBytes[i] = 256 - file.read8();
    }

    return encryptedBytes;
  }
}
