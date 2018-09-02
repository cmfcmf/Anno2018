const path = require("path");
const webpack = require("webpack");
const GitRevisionPlugin = require("git-revision-webpack-plugin");
const gitRevisionPlugin = new GitRevisionPlugin({
  // branch: true,
});
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  entry: {
    app: ["idb.filesystem.js", "@babel/polyfill", "./src/index.ts"]
  },
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.tsx?$/,
        use: [
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"]
            }
          },
          {
            loader: "ts-loader",
            options: {
              transpileOnly: true
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
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    gitRevisionPlugin,
    new webpack.DefinePlugin({
      __VERSION__: JSON.stringify(gitRevisionPlugin.version())
      // '__COMMITHASH__': JSON.stringify(gitRevisionPlugin.commithash()),
      // '__BRANCH__': JSON.stringify(gitRevisionPlugin.branch()),
    }),
    new CopyWebpackPlugin([
      { from: "./node_modules/smk2mp4/demo/ffmpeg.js", to: "ffmpeg.js" },
      { from: "./node_modules/smk2mp4/demo/ffmpeg.js.mem", to: "ffmpeg.js.mem" }
    ]),
    new HtmlWebpackPlugin({
      meta: {
        "apple-mobile-web-app-capable": "yes",
        viewport:
          "initial-scale=1, maximum-scale=1, user-scalable=no, minimum-scale=1, width=device-width, height=device-height"
      },
      title: "Anno 2018"
    }),
    new ForkTsCheckerWebpackPlugin()
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  }
};
