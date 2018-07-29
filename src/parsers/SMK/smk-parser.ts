import {loadFFmpeg} from "../../util/ffmpeg";

interface FileInfo {
    data: Uint8Array;
    name: string;
}

export default class SMKParser {
    private ffmpeg: any;

    public async parse(data: Uint8Array): Promise<Uint8Array> {
        this.ffmpeg = await loadFFmpeg();

        const inputFiles = [{data, name: "input.smk"}];
        try {
            const args = this.prepareArguments(true);
            return await this.convert(args, inputFiles);
        } catch (e) {
            if (e.message === "only-one-audio-stream") {
                try {
                    const args = this.prepareArguments(false);
                    return await this.convert(args, inputFiles);
                } catch (e) {
                    throw e;
                }
            } else {
                throw e;
            }
        }
    }

    private prepareArguments(mergeAudio: boolean) {
        const args = [
            "-i", "input.smk",
        ];
        if (mergeAudio) {
            args.push(...[
                "-filter_complex", "[0:a]amerge[c]", // merge all audio streams into [c]
                "-map", "[c]", // use merged audio stream
                "-map", "0:v:0", // pass through first video stream
            ]);
        }
        args.push(...[
            "-ac", "2", // use stereo audio

            // H.264 options
            // https://trac.ffmpeg.org/wiki/Encode/H.264
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p", // older pix_fmt required for Firefox
            "-preset", "ultrafast", // faster encoding, but bigger filesize
            "-movflags", "+faststart", // faster loading
            "output.mp4",
            // "output.ogg", // I wish I could use the free ogg format instead of mp4.
        ]);

        return args;
    }

    private async convert(args: string[], inputFiles: FileInfo[]) {
        console.log(`Converting video with arguments ${args.join(" ")}`);

        return new Promise<Uint8Array>((resolve, reject) => {
            let output = "";
            const handleOutput = (str: string) => {
                output += str + "\n";
                console.log(str);
            };
            this.ffmpeg({
                // apt update && apt -y install binutils pkg-config && cd /src/build && ./build_lgpl.sh
                arguments: args,
                files: inputFiles,
                print: handleOutput,
                printErr: handleOutput,
                stdin: () => {
                    // Do nothing. This prevents the browser from "prompt"ing the user for input.
                },
                TOTAL_MEMORY: 100_000_000,
                returnCallback: (files: FileInfo[]) => {
                    if (output.includes("Cannot find a matching stream for unlabeled input pad 1")) {
                        reject(new Error("only-one-audio-stream"));
                    } else if (files.length !== 1) {
                        reject(new Error("unknown-error"));
                    } else {
                        resolve(new Uint8Array(files[0].data));
                    }
                },
            });
        });
    }
}
