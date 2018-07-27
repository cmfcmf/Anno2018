// Type definitions for redux-watch 1.1.1
// Project: https://github.com/jprichardson/redux-watch
// Based on definitions by melkir <https://github.com/melkir>

type ObjectPath = string | string[];
type CompareFunction<T> = (a: T, b: T) => boolean;
type CallbackFunction<T> = (newVal: T, oldVal?: T, objectPath?: ObjectPath) => void;

declare function watch<T>(
    getState: () => any,
    objectPath?: ObjectPath,
    compare?: CompareFunction<T>,
): (fn: CallbackFunction<T>) => (() => void);

declare module "redux-watch" {
    export default watch;
}
