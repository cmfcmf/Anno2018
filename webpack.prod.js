const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const webpack = require("webpack");

module.exports = merge(common, {
    devtool: "source-map",
    mode: "production",
    output: {
        // Include hash in file name for cache invalidation
        // https://webpack.js.org/guides/caching/#output-filenames
        filename: "[name].[chunkhash].js",
    },
    plugins: [
        // Hash the module ids so that the file hash doesn't change if
        // modules are reordered.
        // https://webpack.js.org/guides/caching/#module-identifiers
        new webpack.HashedModuleIdsPlugin(),
    ],
});
