import FileSystem from "../filesystem";
import FieldType from "./field-type";

export default class ConfigLoader {
  private loaded = false;
  private readonly fieldData: Map<number, FieldType> = new Map();

  constructor(private readonly fs: FileSystem) {}

  public async load() {
    const fieldConfig = JSON.parse(
      await this.fs.openAndGetContentAsText("/fields.json")
    ).objects.HAUS.items;
    for (const key of Object.keys(fieldConfig)) {
      const fieldId = parseInt(fieldConfig[key].Id, 10);
      this.fieldData.set(fieldId, new FieldType(fieldConfig[key]));
    }
    this.loaded = true;
  }

  public getFieldData(): ReadonlyMap<number, FieldType> {
    if (!this.loaded) {
      throw new Error("Configuration is not loaded. Call .load() first!");
    }
    return this.fieldData;
  }
}
