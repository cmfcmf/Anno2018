import { Block } from "../../parsers/GAM/block";
import { Producer } from "./producer";
import Stream from "../../parsers/stream";

const BLOCK_TYPE = "PRODLIST2";

describe("producer entity", () => {
  it.each([
    new Uint8Array([
      0,
      8,
      14,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0
    ]),
    new Uint8Array([
      0,
      16,
      7,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0
    ])
  ])("loads and saves correctly", (data: Uint8Array) => {
    const DATA_LENGTH = data.length;
    const block = new Block(BLOCK_TYPE, DATA_LENGTH, new Stream(data));

    const producer = Producer.load(block.data);
    expect(producer).toMatchSnapshot();

    const newBlock = new Block(
      BLOCK_TYPE,
      DATA_LENGTH,
      new Stream(new Uint8Array(DATA_LENGTH))
    );
    producer.save(newBlock.data);
    expect(block).toEqual(newBlock);
  });
});
