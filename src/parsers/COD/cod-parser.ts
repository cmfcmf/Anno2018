import FileSystem from '../../filesystem';
import * as log from 'loglevel';
import Stream from '../stream';
import * as JSZip from 'jszip';
import {decode as iconv_decode} from 'iconv-lite';

export default class CODParser {
    private fileSystem: FileSystem;
    private log: log.Logger;
    private zip: JSZip;

    constructor(zip: JSZip, fileSystem: FileSystem) {
        this.fileSystem = fileSystem;
        this.log = log.getLogger('cod-parser');
        this.zip = zip;
    }

    public async parse(inName: string, outName: string) {
        this.log.info(`Started parsing "${inName}".`);

        const codFile = this.zip.file(inName);
        const codStream = await Stream.fromZipObject(codFile);

        const decryptedBytes = new Uint8Array(codStream.length);
        for (let i = 0; i < codStream.length; i++) {
            decryptedBytes[i] = 256 - codStream.read8();
        }

        // Decode the bytes using Windows 1252 "Western" encoding.
        // The resulting string will then be written in UTF-8 format.
        const utf8String = iconv_decode(decryptedBytes, 'win1252');
        this.fileSystem.write(outName, utf8String);

        this.log.info(`Finished parsing "${inName}".`);
    }
}