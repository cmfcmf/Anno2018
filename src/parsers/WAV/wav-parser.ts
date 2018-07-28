import WaveFile from "wavefile";

interface ADPCMChannelStatus {
    predictor: number;
    step_index: number;
}

export interface RawSamples {
    left: Int16Array;
    right: Int16Array;
    sampleRate: number;
}

/**
 * This code is based on FFmpeg:
 * https://github.com/FFmpeg/FFmpeg/blob/a8ce6fb425e07e60eb06d3f44992fdb91f23aafb/libavcodec/adpcm.c#L180-L204
 *
 * FFmpeg is licensed under the terms of the GNU Lesser General Public License 2.1 and later.
 */
export default class WAVParser {
    private readonly adpcmIndexTable = [
        -1, -1, -1, -1, 2, 4, 6, 8,
        -1, -1, -1, -1, 2, 4, 6, 8,
    ];

    private readonly adpcmStepTable = [
        7,     8,     9,    10,    11,    12,    13,    14,    16,    17,
        19,    21,    23,    25,    28,    31,    34,    37,    41,    45,
        50,    55,    60,    66,    73,    80,    88,    97,   107,   118,
        130,   143,   157,   173,   190,   209,   230,   253,   279,   307,
        337,   371,   408,   449,   494,   544,   598,   658,   724,   796,
        876,   963,  1060,  1166,  1282,  1411,  1552,  1707,  1878,  2066,
        2272,  2499,  2749,  3024,  3327,  3660,  4026,  4428,  4871,  5358,
        5894,  6484,  7132,  7845,  8630,  9493, 10442, 11487, 12635, 13899,
        15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767,
    ];

    public decode(data: Uint8Array): RawSamples {
        const wav = new WaveFile(data);

        const bitsPerSample: number = (wav.fmt as any).bitsPerSample;
        const sampleRate: number = (wav.fmt as any).sampleRate;
        const channels: number = (wav.fmt as any).numChannels;

        if (bitsPerSample !== 4) {
            throw new Error("Can only convert .wav files with 4 bits per sample.");
        }
        if (channels !== 2) {
            throw new Error("Can only convert .wav files with stereo sound.");
        }

        const c1: ADPCMChannelStatus = {
            step_index: 0,
            predictor: 0,
        };
        const c2: ADPCMChannelStatus = {
            step_index: 0,
            predictor: 0,
        };

        const samples: Buffer = (wav.data as any).samples;
        const left = new Int16Array(samples.length);
        const right = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
            left[i] = this.decodeADPCM_IMA(c1, samples[i] >>> 4);
            right[i] = this.decodeADPCM_IMA(c2, samples[i] & 0x0F);
        }

        return {
            left,
            right,
            sampleRate,
        };
    }

    public encode(rawData: RawSamples) {
        const numSamples = rawData.left.length;
        const samples = new Int16Array(numSamples * 2);
        for (let i = 0; i < numSamples; i++) {
            samples[i * 2 + 0] = rawData.left[i];
            samples[i * 2 + 1] = rawData.right[i];
        }

        const wav = new WaveFile();
        wav.fromScratch(2, rawData.sampleRate, "16", samples as any);
        return wav.toBuffer();
    }

    private av_clip(n: number, min: number, max: number) {
        return Math.min(Math.max(min, n), max);
    }

    private av_clip_int16(a: number) {
        if ((a + 0x8000) & ~0xFFFF) {
            return (a >> 31) ^ 0x7FFF;
        } else {
            return a;
        }
    }

    private decodeADPCM_IMA(c: ADPCMChannelStatus, nibble: number) {
        const step = this.adpcmStepTable[c.step_index];
        const stepIndex = this.av_clip(c.step_index + this.adpcmIndexTable[nibble], 0, 88);

        const sign = nibble & 8;
        const delta = nibble & 7;
        const diff = ((2 * delta + 1) * step) >>> 3;
        let predictor = c.predictor;
        if (sign) {
            predictor -= diff;
        } else {
            predictor += diff;
        }

        c.predictor = this.av_clip_int16(predictor);
        c.step_index = stepIndex;

        return c.predictor;
    }
}
