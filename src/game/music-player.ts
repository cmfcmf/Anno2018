import "pixi-sound";
import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";

export default class MusicPlayer {
    private playing = false;
    private readonly songs: PIXI.sound.Sound[] = [];
    private currentSongIdx: number;

    constructor(private readonly fs: FileSystem) { }

    public async load() {
        const files = await this.fs.ls("/music");
        for (const file of files) {
            console.log(`Loading music ${file.name}`);
            const data = (await this.fs.openAndGetContentAsUint8Array(file)).buffer as ArrayBuffer;
            this.songs.push(await this.loadSound(data));
            console.log(`Finished loading music ${file.name}`);
        }
    }

    public play() {
        if (this.songs.length === 0) {
            console.warn("No music to play found :(");
            return;
        }
        if (this.playing) {
            console.warn("Music is already playing!");
            return;
        }
        this.playing = true;
        this.currentSongIdx = -1;
        this.playNext();
    }

    private playNext() {
        this.currentSongIdx++;
        if (this.currentSongIdx === this.songs.length) {
            this.currentSongIdx = 0;
        }
        this.songs[this.currentSongIdx].play(this.playNext.bind(this));
    }

    private loadSound(data: ArrayBuffer, preload: boolean = false) {
        return new Promise<PIXI.sound.Sound>((resolve, reject) => {
            const sound = PIXI.sound.Sound.from({
                source: data,
                preload: preload,
                singleInstance: true,
                loaded: (err: Error, preloadedSound: PIXI.sound.Sound) => {
                    if (preload) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(preloadedSound);
                        }
                    }
                },
            });
            if (!preload) {
                resolve(sound);
            }
        });
    }
}
