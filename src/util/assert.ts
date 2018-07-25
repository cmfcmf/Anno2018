/**
 * Based on the MIT-licensed browser-assert NPM package.
 * Copyright (c) 2015 Social Ally
 */
export default function assert(expr: any, message?: string) {
    if (!Boolean(expr)) {
        throw new Error(message || "unknown assertion error");
    }
}
