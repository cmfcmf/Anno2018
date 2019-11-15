import Stream from "./stream";

describe("stream", () => {
  it("works", () => {
    const data = new Uint8Array(2);
    const stream = new Stream(data);

    stream.write16(0xabcd);
    stream.seek(0);
    expect(stream.read16()).toBe(0xabcd);
  });
});
