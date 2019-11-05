import pixiSound from "pixi-sound";
import FileSystem from "../filesystem";

const Sound = pixiSound.Sound;

export default class MusicPlayer {
  private playing = false;
  private readonly songs: Array<{ name: string; sound: pixiSound.Sound }> = [];
  private currentSongIdx: number;

  constructor(private readonly fs: FileSystem) {}

  public async load() {
    const files = await this.fs.ls("/music");
    for (const file of files) {
      console.log(`Loading music ${file.name}`);
      const data = (await this.fs.openAndGetContentAsUint8Array(file))
        .buffer as ArrayBuffer;
      this.songs.push({ name: file.name, sound: await this.loadSound(data) });
      console.log(`Finished loading music ${file.name}`);
    }
  }

  public async play(name: string, loop: boolean = false) {
    const song = this.songs.find(each => each.name === name + ".wav");
    if (song === undefined) {
      console.warn(`Song ${name} not found.`);
      return;
    }
    if (!song.sound.isPlaying) {
      await song.sound.play({ loop: loop });
    }
  }

  public async playAll() {
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
    await this.playNext();
  }

  public stop() {
    this.songs.forEach(song => song.sound.stop());
  }

  private async playNext() {
    this.currentSongIdx++;
    if (this.currentSongIdx === this.songs.length) {
      this.currentSongIdx = 0;
    }
    await this.songs[this.currentSongIdx].sound.play(this.playNext.bind(this));
  }

  private loadSound(data: ArrayBuffer, preload: boolean = false) {
    return new Promise<pixiSound.Sound>((resolve, reject) => {
      const sound = Sound.from({
        source: data,
        preload: preload,
        singleInstance: true,
        loaded: (err: Error, preloadedSound: pixiSound.Sound | undefined) => {
          if (preload) {
            if (err) {
              reject(err);
            } else {
              resolve(preloadedSound);
            }
          }
        }
      });
      if (!preload) {
        resolve(sound);
      }
    });
  }
}
