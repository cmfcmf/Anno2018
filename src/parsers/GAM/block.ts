import Stream from "../stream";

export class Block {
    public readonly data: Stream;

    constructor(
        public readonly type: string,
        public readonly length: number,
        data: Stream,
    ) {
        this.data = new Stream(data.slice(length));
    }
}

// tslint:disable-next-line:max-classes-per-file
export class IslandBlock extends Block {
    public inselHausBlocks: Block[];
}
