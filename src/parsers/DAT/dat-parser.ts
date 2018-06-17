import * as log from 'loglevel';
import * as assert from "assert";

export default class DATParser {
    private log: log.Logger;

    private variables: Map<string, any> = new Map<string, any>();
    private objects: any = {};
    private template: object = null;
    private gfx_map: Map<string, string> = new Map<string, string>();

    private last_gfx_name: string = null;
    private current_object: string = null;
    private current_nested_object: string = null;
    private current_item: string = null;
    private current_nested_item = 0;

    constructor() {
        this.log = log.getLogger('dat-parser');
    }

    public parse(content: string) {
        for (let line of content.split('\n')) {
            line = line.split(';')[0].trim();
            if (line.length === 0) {
                continue;
            }

            if (line.startsWith('Nahrung:') || line.startsWith('Soldat:') || line.startsWith('Turm:')) {
                // TODO: Skipped for now.
                continue;
            }

            let result;

            if (result = line.match(/^(@?)(\w+)\s*=\s*((?:\d+|\+|\w+)+)$/)) {
                this.handleConstantAssignment(result);
                continue;
            }

            if (result = line.match(/^ObjFill:\s*([\w,]+)$/)) {
                this.handleObjFill(result);
                continue;
            }

            if (result = line.match(/^Objekt:\s*(\w+)$/)) {
                this.handleNestedObjectBegin(result);
                continue;
            }

            if (line === 'EndObj') {
                this.handleNestedObjectEnd();
                continue;
            }

            if (result = line.match(/^(@?)(\w+):\s*(.*?)\s*$/)) {
                this.handleProperty(result);
                continue;
            }

            throw new Error("Could not parse: " + line)
        }

        return {
            'variables': this.mapToObject(this.variables),
            'objects': this.objects,
            'gfx_category_map': this.mapToObject(this.gfx_map),
        };
    }

    private handleObjFill(result: RegExpMatchArray) {
        assert(this.current_object != null);
        assert(this.current_item != null);

        const fill = result[1];
        if (fill.startsWith("0,MAX")) {
            assert(this.template == null);
            this.template = this.objects[this.current_object]['items'][this.current_item]
        } else {
            assert.strictEqual(Object.keys(this.objects[this.current_object]['items'][this.current_item]).length, 1);
            assert(this.objects[this.current_object]['items'][this.current_item].hasOwnProperty('nested_objects'));
            assert.strictEqual(Object.keys(this.objects[this.current_object]['items'][this.current_item]['nested_objects']).length, 0);

            const base_item_num = this.getValue(null, fill, false);
            const base_item = this.objects[this.current_object]['items'][base_item_num];
            this.objects[this.current_object]['items'][this.current_item] = this.deepCopy(base_item);

            if (this.last_gfx_name != null) {
                this.objects[this.current_object]['items'][this.current_item]['GfxCategory'] = this.last_gfx_name
            }
        }
    }

    private handleConstantAssignment(result: RegExpMatchArray) {
        const is_math = result[1].length > 0;
        const constant = result[2];
        const value = result[3];

        if (constant.startsWith('GFX')) {
            if (value === "0") {
                this.gfx_map.set(constant, constant);
            } else if (value.startsWith('GFX')) {
                const current_gfx = value.split('+')[0];
                if (this.gfx_map.has(current_gfx)) {
                    this.gfx_map.set(constant, this.gfx_map.get(current_gfx));
                }
            }
        }

        this.variables.set(constant, this.getValue(constant, value, is_math));
    }

    private handleNestedObjectBegin(result: RegExpMatchArray) {
        const object_name = result[1];
        if (this.current_object === null) {
            this.current_object = object_name;
            this.objects[object_name] = {
                'items': {},
            };
        } else if (this.current_nested_object === null) {
            assert(this.current_item !== null);
            this.current_nested_object = object_name;
            this.current_nested_item = 0;
            this.objects[this.current_object]['items'][this.current_item]['nested_objects'][this.current_nested_object] = {[this.current_nested_item]: {}};
        } else {
            throw new Error('It appears like there is more than one nesting level. This is not supported by this parser.');
        }
    }

    private handleNestedObjectEnd() {
        if (this.current_nested_object !== null) {
            this.current_nested_object = null;
            this.current_nested_item = null;
        } else if (this.current_object !== null) {
            this.current_object = null;
            this.current_item = null;
        } else {
            throw new Error('Received EndObj without current object!');
        }
    }

    private handleProperty(result: RegExpMatchArray) {
        const is_math = result[1].length > 0;
        const key = result[2];
        const value_str = result[3];

        const value = this.deepCopy(this.getValue(key, value_str, is_math));
        this.variables.set(key, value);

        if (key === 'Nummer') {
            if (this.current_nested_object === null) {
                if (this.template !== null) {
                    const tmp = this.deepCopy(this.template);
                    this.objects[this.current_object]['items'][this.current_item] = this.deepMerge(tmp, this.objects[this.current_object]['items'][this.current_item]);
                }
                this.current_item = value;
                //assert(this.current_item not in this.objects[this.current_object]['items'].keys())
                this.objects[this.current_object]['items'][this.current_item] = {
                    'nested_objects': {}
                };
            } else {
                this.current_nested_item = value;
                this.objects[this.current_object]['items'][this.current_item]['nested_objects'][this.current_nested_object][this.current_nested_item] = {};
            }

            return;
        }

        if (key === 'Gfx' && value_str.startsWith('GFX')) {
            this.last_gfx_name = value_str.split("+")[0];
        }

        if (this.current_nested_object == null) {
            this.objects[this.current_object]['items'][this.current_item][key] = value;
            if (this.last_gfx_name != null) {
                this.objects[this.current_object]['items'][this.current_item]['GfxCategory'] = this.last_gfx_name;
                this.objects[this.current_object]['items'][this.current_item]['GfxCategoryMapped'] = this.gfx_map.get(this.last_gfx_name);
            }
        } else {
            if (this.objects[this.current_object]['items'][this.current_item]['nested_objects'][this.current_nested_object][this.current_nested_item].hasOwnProperty(key)) {
                assert(this.isObject(this.objects[this.current_object]['items'][this.current_item]['nested_objects'][this.current_nested_object][this.current_nested_item][key]));
                this.objects[this.current_object]['items'][this.current_item]['nested_objects'][this.current_nested_object][this.current_nested_item][key] = this.deepMerge(this.objects[this.current_object]['items'][this.current_item]['nested_objects'][this.current_nested_object][this.current_nested_item][key], value);
            } else {
                this.objects[this.current_object]['items'][this.current_item]['nested_objects'][this.current_nested_object][this.current_nested_item][key] = value;
            }
        }
    }

    private getValue(key: string, value: string, is_math: boolean): any {
        let result;
        if (is_math) {
            if (result = value.match(/^([+\-])(\d+)$/)) {
                let old_val = this.variables.has(key) ? this.deepCopy(this.variables.get(key)) : null;
                if (old_val.toString() === 'RUINE_KONTOR_1') {
                    // TODO
                    old_val = 424242;
                }

                if (result[1] == '+') {
                    return old_val + parseInt(result[2]);
                }
                if (result[1] == '-') {
                    return old_val - parseInt(result[2]);
                }

                throw new Error('This code should not be reached.');
            }
        }

        if (value.match(/^[\-+]?\d+$/)) {
            return parseInt(value);
        }
        if (value.match(/^[\-+]?\d+\.\d+$/)) {
            return parseFloat(value);
        }
        if (value.match(/^[A-Za-z0-9_]+$/)) {
            // TODO: When is value not in variables
            return this.variables.has(value) ? this.deepCopy(this.variables.get(value)) : value;
        }
        if (value.indexOf(',') !== -1) {
            const values = value
                .split(',')
                .map(value => this.getValue(key, value.trim(), false));

            if (key == 'Size') {
                return {
                    x: values[0],
                    y: values[1],
                };
            } else if (key == 'Ware') {
                const obj: any = {};
                obj[values[0]] = values[1];
                return obj;
            } else {
                return values;
            }
        }
        if (result = value.match(/^([A-Z]+|\d+)\+([A-Z]+|\d+)$/)) {
            const val_1 = this.getValue(key, result[1], false);
            const val_2 = this.getValue(key, result[2], false);
            return val_1 + val_2;
        }

        throw new Error('This code should not be reached.');
    }

    private deepCopy(data: any): any {
        return JSON.parse(JSON.stringify(data));
    }

    private isObject(item: any) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }

    /**
     * Deep-Merge two objects.
     *
     * Based on code written by CplLL, which was based on code by Salakar.
     *
     * https://stackoverflow.com/a/37164538
     */
    private deepMerge(target: any, patch: any) {
        let output = Object.assign({}, target);
        if (this.isObject(target) && this.isObject(patch)) {
            Object.keys(patch).forEach(key => {
                if (this.isObject(patch[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: patch[key] });
                    else
                        output[key] = this.deepMerge(target[key], patch[key]);
                } else {
                    Object.assign(output, { [key]: patch[key] });
                }
            });
        }
        return output;
    }

    private mapToObject<K, V>(map: Map<K, V>): object {
        const obj: any = {};
        map.forEach((value: V, key: K) => obj[key] = value);
        return obj;
    }
}