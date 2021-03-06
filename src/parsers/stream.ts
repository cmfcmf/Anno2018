import { JSZipObject } from "jszip";
import assert from "../util/assert";

export default class Stream {
  public static async fromZipObject(zip: JSZipObject) {
    const data = await zip.async("uint8array");

    return new Stream(data);
  }

  private pos: number;
  private readonly data: Uint8Array;

  public constructor(data: Uint8Array) {
    this.pos = 0;
    this.data = data;
  }

  get length(): number {
    return this.data.length;
  }

  public position(): number {
    return this.pos;
  }

  public seek(pos: number) {
    this.pos = pos;
  }

  public readString(length: number) {
    let result = "";
    let done = false;
    while (length--) {
      const character = this.read8();
      if (done || character === 0) {
        done = true;
        continue;
      }
      result += String.fromCharCode(character);
    }

    return result;
  }

  public readStringUnterminated(length: number) {
    let result = "";
    while (length--) {
      result += String.fromCharCode(this.read8());
    }

    return result;
  }

  public read(length: number, size: number = 1) {
    length *= size;
    const result = [];
    while (length > 0) {
      result.push(this.readNBytes(size));
      length -= size;
    }
    return result;
  }

  public slice(length: number) {
    const data = this.data.slice(this.pos, this.pos + length);
    this.pos += length;
    return data;
  }

  public read16() {
    return this.readNBytes(2);
  }

  public read24() {
    return this.readNBytes(3);
  }

  public read32() {
    return this.readNBytes(4);
  }

  public read32S(): number {
    return this.readNBytes(4) >> 0;
  }

  // Potentially unsafe due to JavaScript's Number.MAX_SAFE_INTEGER
  // public read64() {
  //   return this.readNBytes(8);
  // }

  public read8() {
    return this.data[this.pos++];
  }

  public eof() {
    return this.pos === this.length;
  }

  public read8Bool(): boolean {
    return this.read8() !== 0;
  }

  private readNBytes(n: number) {
    let result = 0;
    for (let i = 0; i < n; i++) {
      result += this.read8() * 2 ** (i * 8);
    }
    return result;
  }

  private writeNBytes(n: number, value: number) {
    for (let i = 0; i < n; i++) {
      this.write8((value * 2 ** (-i * 8)) & 0xff);
    }
  }

  public write8(value: number) {
    assert(value >= 0 && value <= 0xff);
    this.data[this.pos++] = value;
  }

  public write16(value: number) {
    this.writeNBytes(2, value);
  }
}
