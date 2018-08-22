import parseTranslations from "./translation-parser";

test("parses empty file", () => {
  expect(parseTranslations("")).toEqual({});
});

test("parses correctly", () => {
  expect(
    parseTranslations(
      `
------
[FOO]
a
b
c
[END]
------
[BAR]
d
e
f
[END]
    `.replace(/\n/g, "\r\n")
    )
  ).toEqual({
    FOO: ["a", "b", "c"],
    BAR: ["d", "e", "f"]
  });
});
