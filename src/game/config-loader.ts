import FileSystem from "../filesystem";
import FieldType from "./field-type";
import { AnimationData } from "./animation-renderer";

export default class ConfigLoader {
  private loaded = false;
  private readonly fieldData: Map<number, FieldType> = new Map();
  private readonly figuresData: Map<string, AnimationData> = new Map();

  constructor(private readonly fs: FileSystem) {}

  public async load() {
    const fieldConfig = JSON.parse(
      await this.fs.openAndGetContentAsText("/fields.json")
    ).objects.HAUS.items;
    for (const key of Object.keys(fieldConfig)) {
      const fieldId = parseInt(fieldConfig[key].Id, 10);
      this.fieldData.set(fieldId, new FieldType(fieldConfig[key]));
    }
    await this.loadFigures();
    this.loaded = true;
  }

  private async loadFigures() {
    const animationData = JSON.parse(
      await this.fs.openAndGetContentAsText("/animations.json")
    ).objects.FIGUR.items;
    for (const key of Object.keys(animationData)) {
      this.figuresData.set(key, animationData[key]);
    }
  }

  public getFieldData(): ReadonlyMap<number, FieldType> {
    if (!this.loaded) {
      throw new Error("Configuration is not loaded. Call .load() first!");
    }
    return this.fieldData;
  }

  public getFiguresData(): ReadonlyMap<string, AnimationData> {
    return this.figuresData;
  }
}
