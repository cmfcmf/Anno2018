let loadedFFmpeg: any;

export async function loadFFmpeg(): Promise<any> {
    if (loadedFFmpeg) {
        return loadedFFmpeg;
    }

    loadedFFmpeg = await doLoadFFmpeg();

    await new Promise((resolve, reject) => {
        loadedFFmpeg({
            arguments: ["-version"],
            returnCallback: resolve,
        });
    });

    return loadedFFmpeg;
}

async function doLoadFFmpeg() {
    console.log("Loading FFmpeg");
    let ffmpeg;

    if (typeof window !== "undefined") {
        ffmpeg = await loadFFmpegInBrowser();
    } else {
        // We can't write require() directly, because we don't want webpack to interpret it.
        // It is only used when running this script under Node.js.
        // tslint:disable-next-line:no-eval
        ffmpeg = eval("require")(__dirname + "/../../node_modules/smk2mp4/demo/ffmpeg.js");
    }
    console.log("Finished loading FFmpeg");
    return ffmpeg;
}

async function loadFFmpegInBrowser(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
        const callback = () => {
            const ffmpeg_run = (self as any).ffmpeg_run;
            if (ffmpeg_run) {
                resolve(ffmpeg_run);
            } else {
                reject("Could not load FFmpeg!");
            }
        };

        const head = document.getElementsByTagName("head")[0];
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "ffmpeg.js";
        (script as any).onreadystatechange = callback;
        script.onload = callback;

        head.appendChild(script);
    });
}
