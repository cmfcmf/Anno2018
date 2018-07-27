import FileSystem from "../filesystem";
import FieldType from "./field-type";

export default class ConfigLoader {
    private loaded = false;
    private fieldConfig: any;

    constructor(private readonly fs: FileSystem) { }

    public async load() {
        this.fieldConfig = JSON.parse(await this.fs.openAndGetContentAsText("/fields.json"));
        this.loaded = true;
    }

    public getFieldData(): ReadonlyMap<number, FieldType> {
        const fields = new Map();
        const fieldData = this.getFieldConfig();
        for (const key of Object.keys(fieldData)) {
            const fieldId = parseInt(fieldData[key].Id, 10);
            fields.set(fieldId, new FieldType(fieldData[key]));
        }
        return fields;
    }

    private getFieldConfig() {
        if (!this.loaded) {
            throw new Error("Configuration is not loaded. Call .load() first!");
        }
        return this.fieldConfig.objects.HAUS.items;
    }
}
