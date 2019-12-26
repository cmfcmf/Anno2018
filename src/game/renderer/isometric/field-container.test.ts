import { FieldContainer } from "./field-container";

describe("the field container works", () => {
  it.each`
    isoX   | isoY   | x      | y
    ${0}   | ${0}   | ${174} | ${0}
    ${0}   | ${1}   | ${174} | ${1}
    ${1}   | ${0}   | ${175} | ${1}
    ${0}   | ${2}   | ${173} | ${2}
    ${1}   | ${1}   | ${174} | ${2}
    ${2}   | ${0}   | ${175} | ${2}
    ${0}   | ${349} | ${0}   | ${349}
    ${0}   | ${348} | ${0}   | ${348}
    ${1}   | ${349} | ${0}   | ${350}
    ${499} | ${349} | ${249} | ${848}
  `(
    "calcualtes grid offset correctly from isometric coordinates",
    ({ isoX, isoY, x, y }) => {
      const result = FieldContainer["isoToGrid"](
        parseInt(isoX, 10),
        parseInt(isoY, 10)
      );
      expect(result.x).toBe(x);
      expect(result.y).toBe(y);
    }
  );

  it.each`
    y      | from   | to
    ${0}   | ${174} | ${174}
    ${1}   | ${174} | ${175}
    ${2}   | ${173} | ${175}
    ${3}   | ${173} | ${176}
    ${4}   | ${172} | ${176}
    ${5}   | ${172} | ${177}
    ${346} | ${1}   | ${347}
    ${347} | ${1}   | ${348}
    ${348} | ${0}   | ${348}
    ${349} | ${0}   | ${349}
    ${350} | ${0}   | ${349}
    ${351} | ${1}   | ${350}
    ${352} | ${1}   | ${350}
    ${496} | ${73}  | ${422}
    ${497} | ${74}  | ${423}
    ${498} | ${74}  | ${423}
    ${499} | ${75}  | ${424}
    ${500} | ${75}  | ${423}
    ${501} | ${76}  | ${423}
    ${502} | ${76}  | ${422}
    ${845} | ${248} | ${251}
    ${846} | ${248} | ${250}
    ${847} | ${249} | ${250}
    ${848} | ${249} | ${249}
  `(
    "calcualtes the field range per grid row correctly (y = $y)",
    ({ y, from, to }) => {
      const result = FieldContainer["fieldRangeInGridRow"](parseInt(y, 10));
      if (from !== -1) expect(result.from).toBe(from);
      if (to !== -1) expect(result.to).toBe(to);
    }
  );
});
