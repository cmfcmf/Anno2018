import Stream from "../stream";

export class Block {
    public static empty(type: string) {
        return new Block(type, 0, new Stream(new Uint8Array()));
    }

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
    public inselHausBlocks: Block[] = [];
}
