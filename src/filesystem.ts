import Stream from "./parsers/stream";
import JSZip from "jszip";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Filer = require("filer.js");

export default class FileSystem {
  private filer: any;
  constructor() {
    this.filer = new Filer();
  }

  public async init(size: number) {
    return new Promise((resolve, reject) =>
      this.filer.init(
        {
          persistent: true,
          size: size
        },
        resolve,
        reject
      )
    );
  }

  public async create(filename: string | WebKitEntry) {
    return new Promise((resolve, reject) =>
      this.filer.create(filename, false, resolve, reject)
    );
  }

  public async mkdir(foldername: string | WebKitEntry) {
    return new Promise((resolve, reject) =>
      this.filer.mkdir(foldername, false, resolve, reject)
    );
  }

  public async ls(
    directory: string | WebKitEntry,
    filterByExtensions?: string
  ): Promise<WebKitEntry[]> {
    const entries = await new Promise<WebKitEntry[]>((resolve, reject) => {
      this.filer.ls(directory, resolve, reject);
    });

    if (!filterByExtensions) {
      return entries;
    }

    const extensions = filterByExtensions.split("|");
    return entries.filter((entry: WebKitEntry) => {
      return (
        entry.isFile &&
        extensions.some(extension => entry.name.endsWith(extension))
      );
    });
  }

  public async exists(entryOrPath: string | WebKitEntry) {
    let path: string;
    if ((entryOrPath as WebKitEntry).fullPath) {
      path = (entryOrPath as WebKitEntry).fullPath;
    } else {
      path = entryOrPath as string;
    }
    if (!path.startsWith("/")) {
      throw new Error(
        `exists() only works with absolute paths, "${path}" given.`
      );
    }
    const parts = path.split("/").filter(part => part !== "");
    path = "";
    for (const part of parts) {
      path += "/";
      const entries = await this.ls(path);
      // eslint-disable-next-line require-atomic-updates
      path += part;
      if (entries.find(entry => entry.fullPath === path) === undefined) {
        return false;
      }
    }
    return true;
  }

  public async open(entryOrPath: string | WebKitEntry): Promise<File> {
    return new Promise((resolve, reject) =>
      this.filer.open(entryOrPath, resolve, reject)
    );
  }

  public async openAndGetContentAsText(entryOrPath: string | WebKitEntry) {
    return this.getTextContentFromFile(await this.open(entryOrPath));
  }

  public async openAndGetContentAsStream(
    entryOrPath: string | WebKitEntry
  ): Promise<Stream> {
    return new Stream(
      await this.getUint8ContentFromFile(await this.open(entryOrPath))
    );
  }

  public async openAndGetContentAsUint8Array(
    entryOrPath: string | WebKitEntry
  ): Promise<Uint8Array> {
    return this.getUint8ContentFromFile(await this.open(entryOrPath));
  }

  public async getTextContentFromFile(file: File): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = event => {
        if (fileReader.result !== null) {
          resolve(fileReader.result as string);
        } else {
          reject();
        }
      };
      fileReader.onerror = event => {
        reject();
      };
      fileReader.readAsText(file);
    });
  }

  public async getUint8ContentFromFile(file: File): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = event => {
        if (fileReader.result !== null) {
          resolve(new Uint8Array(fileReader.result as ArrayBuffer));
        } else {
          reject();
        }
      };
      fileReader.onerror = event => {
        reject();
      };
      fileReader.readAsArrayBuffer(file);
    });
  }

  public async df() {
    return new Promise((resolve, reject) => {
      this.filer.df(
        (used: number, free: number, cap: number) =>
          resolve({ used: used, free: free, cap: cap }),
        reject
      );
    });
  }

  public async write(pathOrEntry: string | WebKitEntry, content: any) {
    return new Promise((resolve, reject) =>
      this.filer.write(pathOrEntry, { data: content }, resolve, reject)
    );
  }

  public async rm(pathOrEntry: string | WebKitEntry) {
    return new Promise((resolve, reject) =>
      this.filer.rm(pathOrEntry, resolve, reject)
    );
  }

  public async rmRoot() {
    const entries = await this.ls("/");
    return Promise.all(entries.map(entry => this.rm(entry.fullPath)));
  }

  public async download(pathOrEntry: string | WebKitEntry) {
    let entries;
    try {
      entries = await this.ls(pathOrEntry);
    } catch (e) {
      return this.downloadFile(pathOrEntry);
    }
    return this.downloadDirectory(entries);
  }

  private async downloadFile(pathOrEntry: string | WebKitEntry) {
    const fileName =
      typeof pathOrEntry === "string" ? pathOrEntry : pathOrEntry.fullPath;

    const content = await this.openAndGetContentAsUint8Array(pathOrEntry);
    this.doDownload(fileName, content);
  }

  private async downloadDirectory(entries: WebKitEntry[]) {
    const zip = new JSZip();

    const addToZip = async (entries: WebKitEntry[]) =>
      Promise.all(
        entries.map(async entry => {
          console.log(entry.fullPath);
          if (entry.isFile) {
            zip.file(entry.fullPath, this.openAndGetContentAsUint8Array(entry));
          } else {
            const subEntries = await this.ls(entry);
            await addToZip(subEntries);
          }
        })
      );
    await addToZip(entries);

    const zipContent = await zip.generateAsync({ type: "uint8array" });
    this.doDownload("data.zip", zipContent);
  }

  private doDownload(fileName: string, content: Uint8Array) {
    const blob = new Blob([content], { type: "application/zip" });
    const element = document.createElement("a");
    element.href = window.URL.createObjectURL(blob);
    element.download = fileName;
    element.click();
  }
}
