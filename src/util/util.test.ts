import * as JSZip from "jszip";
import {findRootInZip} from "./util";

test("finds root in simple zip", () => {
    const zip = new JSZip();
    zip.folder("GFX");
    zip.folder("MGFX");
    zip.folder("SAVEGAME");

    expect(findRootInZip(zip)).toEqual(zip);
});

test("finds root in zip with __MACOS", () => {
    const zip = new JSZip();
    zip.folder("GFX");
    zip.folder("MGFX");
    zip.folder("SAVEGAME");
    zip.folder("__MACOS");

    expect(findRootInZip(zip)).toEqual(zip);
});

test("finds root in nested zip 1 level", () => {
    const zip = new JSZip();
    const annoFolder = zip.folder("Anno 1602");
    annoFolder.folder("GFX");
    annoFolder.folder("MGFX");
    annoFolder.folder("SAVEGAME");

    // @ts-ignore
    expect(findRootInZip(zip).root).toEqual("Anno 1602/");
});

test("finds root in nested zip 2 level", () => {
    const zip = new JSZip();
    const folderA = zip.folder("anno");
    const folderB = folderA.folder("1602");
    folderB.folder("GFX");
    folderB.folder("MGFX");
    folderB.folder("SAVEGAME");

    // @ts-ignore
    expect(findRootInZip(zip).root).toEqual("anno/1602/");
});

test("throws error if GFX folder does not exist", () => {
    expect(() => {
        const zip = new JSZip();
        findRootInZip(zip);
    }).toThrowError("Your ZIP file does not have the expected structure.");
});

test("throws error if GFX folder does not exist", () => {
    expect(() => {
        const zip = new JSZip();
        zip.folder("MGFX");
        findRootInZip(zip);
    }).toThrowError("Your ZIP file does not have the expected structure.");
});
