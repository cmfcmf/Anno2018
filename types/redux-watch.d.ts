// Type definitions for redux-watch 1.1.1
// Project: https://github.com/jprichardson/redux-watch
// Based on definitions by melkir <https://github.com/melkir>

declare module "redux-watch" {
    type ObjectPath = string | string[];
    type CompareFunction<T> = (a: T, b: T) => boolean;
    type CallbackFunction<T> = (newVal: T, oldVal?: T, objectPath?: ObjectPath) => void;

    export default function watch<T>(
        getState: () => any,
        objectPath?: ObjectPath,
        compare?: CompareFunction<T>,
    ): (fn: CallbackFunction<T>) => (() => void);
}
