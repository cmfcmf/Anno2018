const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const webpack = require("webpack");
const path = require("path");
const fs = require("fs");
const LicenseCheckerWebpackPlugin = require("license-checker-webpack-plugin");

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
    new webpack.HashedModuleIdsPlugin(),
    new LicenseCheckerWebpackPlugin({
      outputFilename: "thirdparty.txt",
      allow: "MIT OR BSD-3-Clause OR Apache-2.0 OR ISC OR Zlib OR GPL-3.0-only OR GPL-2.0-or-later OR LGPL-2.1-or-later",
      emitError: true,
      override: {
        "pako@1.0.10": {
          // Adds the zlib copyright notice to the MIT license written in LICENSE
          licenseText: `\
${fs.readFileSync(path.join("node_modules", "pako", "LICENSE"), { encoding: "utf-8" })}

zlib License

Copyright (C) 1995-2017 Jean-loup Gailly and Mark Adler

This software is provided 'as-is', without any express or implied
warranty.  In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.
2. Altered source versions must be plainly marked as such, and must not be
    misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.

Jean-loup Gailly        Mark Adler
jloup@gzip.org          madler@alumni.caltech.edu`
        }
      },
      additionalPackages: {
        "mdcii-engine": {
          name: "mdcii-engine",
          version: " master",
          repository: "https://github.com/roybaer/mdcii-engine",
          licenseName: "GPL-2.0-or-later",
          licenseText: `\
This project includes code based on the mdcii-engine project by Benedikt Freisen
originally licensed under the GPLv2 or later license.

${fs.readFileSync("COPYING.GPLv2", { encoding: "utf-8" })}`
        },
        "ffmpeg-wav": {
          name: "FFmpeg",
          version: "n4.0",
          repository: "https://git.ffmpeg.org/ffmpeg.git",
          licenseName: "LGPL-2.1-or-later",
          licenseText: fs.readFileSync("COPYING.LGPLv2.1", { encoding: "utf-8" })
        },
        "pixi-keyboard": {
          name: "pixi-keyboard",
          version: "0.9.4",
          repository: "https://github.com/Nazariglez/pixi-keyboard",
          licenseName: "MIT",
          licenseText: `\
This project includes code based on the pixi-keyboard project by Celsius online
(see \`src/game/renderer/keyboard\`) originally licensed under the MIT license.

The MIT License (MIT)

Copyright (c) 2015 Celsius online

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`
        },

        "smk2mp4-ffmpeg": {
          name: "FFmpeg",
          version: "3.1.3",
          repository: "https://git.ffmpeg.org/ffmpeg.git",
          licenseName: "GPL-2.0-or-later",
          licenseText: fs.readFileSync("COPYING.GPLv2", { encoding: "utf-8" })
        },
        "smk2mp4-libx264": {
          name: "libx264",
          version: "x264-snapshot-20160910-2245",
          repository: "https://code.videolan.org/videolan/x264.git",
          licenseName: "GPL-2.0-or-later",
          licenseText: fs.readFileSync("COPYING.GPLv2", { encoding: "utf-8" })
        },
      }
    })
  ]
});
