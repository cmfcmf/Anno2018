import *  as Filer from 'filer.js';


export default class FileSystem {
    private filer: any;
    constructor() {
        this.filer = new Filer();
    }

    root() {
        return this.filer.fs.root;
    }

    async init(size: number) {
        return await new Promise((resolve, reject) => {
           this.filer.init({persistent: true, size: size}, resolve, reject);
        });
    }

    async create(filename: string|object) {
        return new Promise((resolve, reject) => {
            this.filer.create(filename, false, resolve, reject);
        });
    }

    async mkdir(foldername: string|object) {
        return new Promise((resolve, reject) => {
            this.filer.mkdir(foldername, false, resolve, reject);
        });
    }

    async ls(directory: string|object) {
        return new Promise((resolve, reject) => {
            this.filer.ls(directory, resolve, reject);
        });
    }

    async exists(entryOrPath: string|object) {
        try {
            await this.open(entryOrPath);
            return true;
        } catch (e) {
            return false;
        }
    }

    async open(entryOrPath: string|object) {
        return new Promise((resolve, reject) => {
            this.filer.open(entryOrPath, resolve, reject);
        });
    }

    async df() {
        return new Promise((resolve, reject) => {
            this.filer.df(
                (used: number, free: number, cap: number) => resolve({used: used, free: free, cap: cap}),
                reject
            );
        });
    }

    async write(pathOrEntry: string|object, content: any) {
        return new Promise((resolve, reject) => {
            this.filer.write(pathOrEntry, {data: content}, resolve, reject);
        });
    }

    async rm(pathOrEntry: string|object) {
        return new Promise((resolve, reject) => {
            this.filer.rm(pathOrEntry, resolve, reject);
        })
    }
}