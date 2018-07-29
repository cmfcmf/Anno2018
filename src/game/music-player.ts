import "pixi-sound";
import * as PIXI from "pixi.js";
import FileSystem from "../filesystem";

export default class MusicPlayer {
    private playing = false;
    private readonly songs: Array<{name: string, sound: PIXI.sound.Sound}> = [];
    private currentSongIdx: number;

    constructor(private readonly fs: FileSystem) { }

    public async load() {
        const files = await this.fs.ls("/music");
        for (const file of files) {
            console.log(`Loading music ${file.name}`);
            const data = (await this.fs.openAndGetContentAsUint8Array(file)).buffer as ArrayBuffer;
            this.songs.push({name: file.name, sound: await this.loadSound(data)});
            console.log(`Finished loading music ${file.name}`);
        }
    }

    public play(name: string, loop: boolean = false) {
        const song = this.songs.find((each) => each.name === name + ".wav");
        if (song === undefined) {
            console.warn(`Song ${name} not found.`);
            return;
        }
        if (!song.sound.isPlaying) {
            song.sound.play({loop: loop});
        }
    }

    public playAll() {
        if (this.songs.length === 0) {
            console.warn("No music to play found :(");
            return;
        }
        if (this.playing) {
            console.warn("Music is already playing!");
            return;
        }
        this.stop();

        this.playing = true;
        this.currentSongIdx = -1;
        this.playNext();
    }

    public stop() {
        this.songs.forEach((song) => song.sound.stop());
    }

    private playNext() {
        this.currentSongIdx++;
        if (this.currentSongIdx === this.songs.length) {
            this.currentSongIdx = 0;
        }
        this.songs[this.currentSongIdx].sound.play(this.playNext.bind(this));
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
