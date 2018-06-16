import FileSystem from '../../filesystem';
import * as log from 'loglevel';
import Stream from '../stream';
import * as JSZip from 'jszip';


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

        const decodedBytes = new Uint8Array(codStream.length);
        for (let i = 0; i < codStream.length; i++) {
            decodedBytes[i] = 256 - codStream.read8();
        }

        this.fileSystem.write(outName, decodedBytes);

        this.log.info(`Finished parsing "${inName}".`);
    }
}