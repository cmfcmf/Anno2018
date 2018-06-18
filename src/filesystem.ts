import Stream from "./parsers/stream";

const Filer = require("filer.js");

export default class FileSystem {
    private filer: any;
    constructor() {
        this.filer = new Filer();
    }

    public root() {
        return this.filer.fs.root;
    }

    public async init(size: number) {
        return await new Promise((resolve, reject) => this.filer.init({
            persistent: true,
            size: size,
        }, resolve, reject));
    }

    public async create(filename: string|WebKitEntry) {
        return new Promise((resolve, reject) => this.filer.create(filename, false, resolve, reject));
    }

    public async mkdir(foldername: string|WebKitEntry) {
        return new Promise((resolve, reject) => this.filer.mkdir(foldername, false, resolve, reject));
    }

    public async ls(directory: string|WebKitEntry): Promise<WebKitFileEntry[]|WebKitDirectoryEntry[]> {
        // noinspection TsLint
        return new Promise((resolve, reject) => {
            return this.filer.ls(directory, resolve, reject);
        }) as Promise<WebKitFileEntry[]|WebKitDirectoryEntry[]>;
    }

    public async exists(entryOrPath: string|WebKitEntry) {
        try {
            await this.open(entryOrPath);
            return true;
        } catch (e) {
            return false;
        }
    }

    public async open(entryOrPath: string|WebKitEntry): Promise<File> {
        return new Promise((resolve, reject) => this.filer.open(entryOrPath, resolve, reject)) as Promise<File>;
    }

    public async openAndGetContentAsText(entryOrPath: string|WebKitEntry) {
        return await this.getTextContentFromFile(await this.open(entryOrPath));
    }

    public async openAndGetContentAsStream(entryOrPath: string|WebKitEntry): Promise<Stream> {
        return new Stream(await this.getUint8ContentFromFile(await this.open(entryOrPath)));
    }

    public async openAndGetContentAsUint8Array(entryOrPath: string|WebKitEntry): Promise<Uint8Array> {
        return await this.getUint8ContentFromFile(await this.open(entryOrPath));
    }

    public async getTextContentFromFile(file: File): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = ((event) => {
                resolve(event.target.result);
            });
            fileReader.onerror = ((event) => {
                reject();
            });
            fileReader.readAsText(file);
        });
    }

    public async getUint8ContentFromFile(file: File): Promise<Uint8Array> {
        return new Promise<Uint8Array>((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = ((event) => {
                resolve(new Uint8Array(event.target.result));
            });
            fileReader.onerror = ((event) => {
                reject();
            });
            fileReader.readAsArrayBuffer(file);
        });
    }

    public async df() {
        return new Promise((resolve, reject) => {
            this.filer.df(
                (used: number, free: number, cap: number) => resolve({used: used, free: free, cap: cap}),
                reject,
            );
        });
    }

    public async write(pathOrEntry: string|WebKitEntry, content: any) {
        return new Promise((resolve, reject) => this.filer.write(pathOrEntry, {data: content}, resolve, reject));
    }

    public async rm(pathOrEntry: string|WebKitEntry) {
        return new Promise((resolve, reject) => this.filer.rm(pathOrEntry, resolve, reject));
    }
}
