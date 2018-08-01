import {uInt8ToBase64} from "../../util/util";
import {SpriteSheetConfig} from "../BSH/bsh-parser";
const xml = require("xml");

export default class BitmapFontGenerator {
    public async createBitmapFont(sheets: SpriteSheetConfig[], fontName: string) {
        const pages = [];
        const chars = [];

        for (let pageId = 0; pageId < sheets.length; pageId++) {
            const sheet = sheets[pageId];

            pages.push({
                page: [{
                    _attr: {
                        id: pageId,
                        file: `data:image/png;base64,${uInt8ToBase64(new Uint8Array(sheet.png))}`,
                        // file: `${pageId}.png`,
                    },
                }],
            });

            for (const idx of Object.keys(sheet.config.frames)) {
                const config = sheet.config.frames[idx];

                const char = parseInt(idx, 10) + 32;
                chars.push({
                    char: [{
                        _attr: {
                            id: char,
                            x: config.frame.x,
                            y: config.frame.y,
                            width: config.frame.w,
                            height: config.frame.h,
                            xoffset: 0,
                            yoffset: 0,
                            xadvance: config.frame.w,
                            page: pageId,
                            chnl: 15,
                            letter: String.fromCharCode(char),
                        },
                    }],
                });
            }
        }

        const fontSize = sheets[0].config.frames[0].sourceSize.h;

        // http://www.angelcode.com/products/bmfont/doc/file_format.html
        // https://raw.githubusercontent.com/pixijs/examples/gh-pages/required/assets/desyrel.xml
        const font: any = {
            font: [
                {
                    info: [
                        {
                            _attr: {
                                face: fontName,
                                size: fontSize,
                                padding: "0,0,0,0",
                                spacing: "0,0",
                                italic: "0",
                                bold: "0",
                                stretchH: "100",
                                smooth: "1", // unsure
                                aa: "1", // unsure
                                // charset
                                // unicode
                            },
                        },
                    ],
                },
                {
                    common: [
                        {
                            _attr: {
                                pages: sheets.length,
                                lineHeight: fontSize,
                                // base
                                // scaleW
                                // scaleH
                                packed: 0,
                                // alphaChnl
                                // redChnl
                                // greenChnl
                                // blueChnl
                            },
                        },
                    ],
                },
                {pages},
                {chars},
            ],
        };

        return xml(font, {indent: "  "});
    }
}
