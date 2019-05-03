const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const webpack = require("webpack");
const path = require("path");

module.exports = merge.smartStrategy({ entry: "prepend" })(common, {
  devtool: "source-map",
  entry: {
    app: [
      // Polyfills
      // https://github.com/zloirock/core-js/blob/master/docs/2019-03-19-core-js-3-babel-and-a-look-into-the-future.md
      "core-js/stable",
      "regenerator-runtime/runtime",
      // Filesystem polyfill
      "idb.filesystem.js"
    ]
  },
  mode: "production",
  module: {
    rules: [
      {
        include: path.resolve("src"),
        test: /\.tsx?$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              babelrc: false,
              cacheDirectory: true,
              plugins: [
                ["@babel/plugin-proposal-class-properties", { loose: true }],
                "@babel/plugin-proposal-numeric-separator"
              ],
              presets: [
                [
                  "@babel/preset-env",
                  {
                    corejs: 3,
                    targets: {
                      browsers: "last 2 versions"
                    },
                    useBuiltIns: "entry"
                  }
                ],
                "@babel/preset-typescript",
                "@babel/preset-react"
              ]
            }
          }
        ]
      }
    ]
  },
  // Extract webpack and vendor code into separate files
  // https://webpack.js.org/guides/caching/#extracting-boilerplate
  optimization: {
    // Move webpack runtime data into separate file
    runtimeChunk: "single",
    // Move all vendor code into separate file
    splitChunks: {
      cacheGroups: {
        vendor: {
          chunks: "all",
          name: "vendors",
          test: /[\\/]node_modules[\\/]/
        }
      }
    }
  },
  output: {
    // Include hash in file name for cache invalidation
    // https://webpack.js.org/guides/caching/#output-filenames
    filename: "[name].[chunkhash].js"
  },
  plugins: [
    // Hash the module ids so that the file hash doesn't change if
    // modules are reordered.
    // https://webpack.js.org/guides/caching/#module-identifiers
    new webpack.HashedModuleIdsPlugin()
  ]
});
