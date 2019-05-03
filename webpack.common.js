const path = require("path");
const webpack = require("webpack");
const GitRevisionPlugin = require("git-revision-webpack-plugin");
const gitRevisionPlugin = new GitRevisionPlugin({
  // branch: true,
});
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: {
    app: ["./src/index.ts"]
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist")
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
    })
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"]
  }
};
