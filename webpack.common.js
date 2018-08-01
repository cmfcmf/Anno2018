const path = require("path");
const webpack = require("webpack");
const GitRevisionPlugin = require("git-revision-webpack-plugin");
const gitRevisionPlugin = new GitRevisionPlugin({
    // branch: true,
});
const CopyWebpackPlugin = require("copy-webpack-plugin");

/* tslint:disable */
module.exports = {
    entry: {
        app: [
           "idb.filesystem.js",
            "@babel/polyfill",
            "./src/index.ts",
        ],
    },
    plugins: [
        gitRevisionPlugin,
        new webpack.DefinePlugin({
            '__VERSION__': JSON.stringify(gitRevisionPlugin.version()),
            // '__COMMITHASH__': JSON.stringify(gitRevisionPlugin.commithash()),
            // '__BRANCH__': JSON.stringify(gitRevisionPlugin.branch()),
        }),
        new CopyWebpackPlugin([
            {from: "./node_modules/smk2mp4/demo/ffmpeg.js", to: 'ffmpeg.js'},
            {from: "./node_modules/smk2mp4/demo/ffmpeg.js.mem", to: 'ffmpeg.js.mem'},
        ]),
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ['@babel/preset-env']
                        },
                    },
                    {
                        loader: "ts-loader",
                    },
                ],
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "dist"),
    },
};
