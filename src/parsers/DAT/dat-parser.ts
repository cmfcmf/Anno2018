import * as log from "loglevel";
import assert from "../../util/assert";

export default class DATParser {
  private log: log.Logger;

  private variables: Map<string, any>;
  private objects: any;
  private template: object | null;
  private gfxMap: Map<string, string>;

  private lastGfxName: string | null;
  private currentObject: string | null;
  private currentNestedObject: string | null;
  private currentItem: string | null;
  private currentNestedItem: number | null;

  constructor() {
    this.log = log.getLogger("dat-parser");
  }

  public parse(
    content: string,
    initialVariables: Map<string, any> = new Map()
  ) {
    this.variables = initialVariables;
    this.objects = {};
    this.template = null;
    this.gfxMap = new Map();
    this.lastGfxName = null;
    this.currentObject = null;
    this.currentNestedObject = null;
    this.currentItem = null;
    this.currentNestedItem = 0;

    for (let line of content.split("\n")) {
      line = line.split(";")[0].trim();
      if (line.length === 0) {
        continue;
      }

      if (
        line.startsWith("Nahrung:") ||
        line.startsWith("Soldat:") ||
        line.startsWith("Turm:")
      ) {
        // TODO: Skipped for now.
        continue;
      }

      if (line === 'Include: "TOOLS.INC"') {
        assert(initialVariables.size > 0);
        continue;
      }

      let result;

      if ((result = /^(@?)(\w+)\s*=\s*((?:\d+|\+|\w+)+)$/.exec(line))) {
        this.handleConstantAssignment(result);
        continue;
      }

      if ((result = /^ObjFill:\s*([\w,]+)$/.exec(line))) {
        this.handleObjFill(result);
        continue;
      }

      if ((result = /^Objekt:\s*(\w+)$/.exec(line))) {
        this.handleNestedObjectBegin(result);
        continue;
      }

      if (line === "EndObj") {
        this.handleNestedObjectEnd();
        continue;
      }

      if ((result = /^(@?)(\w+):\s*(.*?)\s*$/.exec(line))) {
        this.handleProperty(result);
        continue;
      }

      throw new Error("Could not parse: " + line);
    }

    return {
      variables: this.mapToObject(this.variables),
      objects: this.objects,
      gfx_category_map: this.mapToObject(this.gfxMap)
    };
  }

  private handleObjFill(result: RegExpMatchArray) {
    assert(this.currentObject != null);
    assert(this.currentItem != null);

    const fill = result[1];
    const item = this.objects[this.currentObject!].items[this.currentItem!];
    if (fill.startsWith("0,MAX")) {
      assert(this.template === null);
      this.template = item;
    } else {
      assert(Object.prototype.hasOwnProperty.call(item, "nested_objects"));

      const baseItemNum = this.getValue(null, fill, false);
      const baseItem = this.objects[this.currentObject!].items[baseItemNum];
      this.objects[this.currentObject!].items[
        this.currentItem!
      ] = this.deepCopy(baseItem);

      if (this.lastGfxName != null) {
        item.GfxCategory = this.lastGfxName;
      }
    }
  }

  private handleConstantAssignment(result: RegExpMatchArray) {
    const isMath = result[1].length > 0;
    const constant = result[2];
    const value = result[3];

    if (constant.startsWith("GFX")) {
      if (value === "0") {
        this.gfxMap.set(constant, constant);
      } else if (value.startsWith("GFX")) {
        const currentGfx = value.split("+")[0];
        if (this.gfxMap.has(currentGfx)) {
          this.gfxMap.set(constant, this.gfxMap.get(currentGfx)!);
        }
      }
    }

    this.variables.set(constant, this.getValue(constant, value, isMath));
  }

  private handleNestedObjectBegin(result: RegExpMatchArray) {
    const objectName = result[1];
    if (this.currentObject === null) {
      this.currentObject = objectName;
      this.objects[objectName] = {
        items: {}
      };
    } else if (this.currentNestedObject === null) {
      assert(this.currentItem !== null);
      this.currentNestedObject = objectName;
      this.currentNestedItem = 0;
      const item = this.objects[this.currentObject].items[this.currentItem!];
      if (
        item.nested_objects[this.currentNestedObject] === undefined ||
        item.nested_objects[this.currentNestedObject][
          this.currentNestedItem
        ] === undefined
      ) {
        item.nested_objects[this.currentNestedObject] = {
          [this.currentNestedItem]: {}
        };
      }
    } else {
      throw new Error(
        "It appears like there is more than one nesting level. " +
          "This is not supported by this parser."
      );
    }
  }

  private handleNestedObjectEnd() {
    if (this.currentNestedObject !== null) {
      this.currentNestedObject = null;
      this.currentNestedItem = null;
    } else if (this.currentObject !== null) {
      this.currentObject = null;
      this.currentItem = null;
    } else {
      throw new Error("Received EndObj without current object!");
    }
  }

  private handleProperty(result: RegExpMatchArray) {
    const isMath = result[1].length > 0;
    const key = result[2];
    const valueAsString = result[3];

    const value = this.deepCopy(this.getValue(key, valueAsString, isMath));
    this.variables.set(key, value);

    if (key === "Nummer") {
      if (this.currentNestedObject === null) {
        this.currentItem = value;

        this.objects[this.currentObject!].items[this.currentItem!] = {
          nested_objects: {}
        };
        if (this.template !== null) {
          const tmp = this.deepCopy(this.template);
          this.objects[this.currentObject!].items[
            this.currentItem!
          ] = this.deepMerge(
            tmp,
            this.objects[this.currentObject!].items[this.currentItem!]
          );
        }
      } else {
        this.currentNestedItem = value;
        this.objects[this.currentObject!].items[
          this.currentItem!
        ].nested_objects[this.currentNestedObject][
          this.currentNestedItem!
        ] = {};
      }

      return;
    }
    const item = this.objects[this.currentObject!].items[this.currentItem!];

    if (key === "Gfx" && valueAsString.startsWith("GFX")) {
      this.lastGfxName = valueAsString.split("+")[0];
    }

    if (this.currentNestedObject == null) {
      item[key] = value;
      if (this.lastGfxName != null) {
        item.GfxCategory = this.lastGfxName;
        item.GfxCategoryMapped = this.gfxMap.get(this.lastGfxName);
      }
    } else {
      const nestedItem =
        item.nested_objects[this.currentNestedObject][this.currentNestedItem!];
      if (
        Object.keys(nestedItem).includes(key) &&
        this.isObject(nestedItem[key])
      ) {
        nestedItem[key] = this.deepMerge(nestedItem[key], value);
      } else {
        nestedItem[key] = value;
      }
    }
  }

  private getValue(
    key: string | null,
    value: string,
    isMath: boolean,
    arrayElement: number = -1
  ): any {
    let result;
    if (isMath) {
      if ((result = /^([+-])(\d+)$/.exec(value))) {
        let oldVal = this.variables.has(key!)
          ? this.deepCopy(this.variables.get(key!))
          : null;
        if (oldVal.toString() === "RUINE_KONTOR_1") {
          // TODO
          oldVal = 424242;
        }

        if (arrayElement > -1) {
          if (key === "Size") {
            oldVal = oldVal[arrayElement === 0 ? "x" : "y"];
          } else {
            oldVal = oldVal[arrayElement];
          }
        }

        if (result[1] === "+") {
          return oldVal + parseInt(result[2], 10);
        }
        if (result[1] === "-") {
          return oldVal - parseInt(result[2], 10);
        }

        throw new Error("This code should not be reached.");
      }
    }

    if (/^[-+]?\d+$/.exec(value)) {
      return parseInt(value, 10);
    }
    if (/^[-+]?\d+\.\d+$/.exec(value)) {
      return parseFloat(value);
    }
    if ((result = /^([A-Za-z0-9_]+)(?:\[(\d+)])?$/.exec(value))) {
      const name = result[1];
      const arrayIdx = result[2];
      // TODO: When is value not in variables
      const res = this.variables.has(name)
        ? this.deepCopy(this.variables.get(name))
        : name;
      if (arrayIdx !== undefined) {
        return res[arrayIdx];
      }
      return res;
    }
    if (value.includes(",")) {
      const values = value
        .split(",")
        .map((v, index) => this.getValue(key, v.trim(), isMath, index));

      if (key === "Size") {
        return {
          x: values[0],
          y: values[1]
        };
      } else if (key === "Ware") {
        const obj: any = {};
        obj[values[0]] = values[1];
        return obj;
      } else {
        return values;
      }
    }
    if (
      (result = /^([A-z]+(?:\[\d+])?|\d+)([+-])([A-z]+(?:\[\d+])?|\d+)$/.exec(
        value
      ))
    ) {
      const op = result[2];
      const val1 = this.getValue(key, result[1], false);
      const val2 = this.getValue(key, result[3], false);
      return op === "+" ? val1 + val2 : val1 - val2;
    }

    throw new Error("This code should not be reached.");
  }

  private deepCopy(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }

  private isObject(item: any) {
    return item && typeof item === "object" && !Array.isArray(item);
  }

  /**
   * Deep-Merge two objects.
   *
   * Based on code written by CplLL, which was based on code by Salakar.
   *
   * https://stackoverflow.com/a/37164538
   */
  private deepMerge(target: any, patch: any) {
    const output = { ...target };
    if (this.isObject(target) && this.isObject(patch)) {
      Object.keys(patch).forEach(key => {
        if (this.isObject(patch[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: patch[key] });
          } else {
            output[key] = this.deepMerge(target[key], patch[key]);
          }
        } else {
          Object.assign(output, { [key]: patch[key] });
        }
      });
    }
    return output;
  }

  private mapToObject<K, V>(map: Map<K, V>): object {
    const obj: any = {};
    map.forEach((value: V, key: K) => (obj[key] = value));
    return obj;
  }
}
