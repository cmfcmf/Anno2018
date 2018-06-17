import Stream from '../stream';
import {decode as iconv_decode} from "iconv-lite";

export default class CODParser {
    public parse(codStream: Stream) {
        const decryptedBytes = new Buffer(codStream.length);
        for (let i = 0; i < codStream.length; i++) {
            decryptedBytes[i] = 256 - codStream.read8();
        }

        // Decode the bytes using Windows 1252 "Western" encoding.
        // The resulting string will then be written in UTF-8 format.
        return iconv_decode(decryptedBytes, 'win1252');
    }
}