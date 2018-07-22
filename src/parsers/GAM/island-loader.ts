import assert from "browser-assert";
import FileSystem from "../../filesystem";
import Field from "../../game/world/field";
import Island from "../../game/world/island";
import {Block} from "./block";
import {PlayerMap} from "./gam-parser";

export type IslandSizeId = 0|1|2|3|4;
export type IslandSizeName = "lit"|"mit"|"med"|"big"|"lar";
interface IslandSize {
    id: IslandSizeId;
    name: IslandSizeName;
    maxSize: number;
}

export default class IslandLoader {
    private readonly islandSizes: IslandSize[] = [
        {
            id: 0,
            name: "lit",
            maxSize: 35,
        },
        {
            id: 1,
            name: "mit",
            maxSize: 45,
        },
        {
            id: 2,
            name: "med",
            maxSize: 55,
        },
        {
            id: 3,
            name: "big",
            maxSize: 85,
        },
        {
            id: 4,
            name: "lar",
            maxSize: 100,
        },
    ];

    constructor(private fs: FileSystem) {}

    public async loadIslandFile(island: Island) {
        const climate = island.isSouth ? "south" : "north";
        const islandNumber = island.baseIslandNumber.toString().padStart(2, "0");
        for (const islandSize of this.islandSizes) {
            if (island.width <= islandSize.maxSize) {
                return await this.fs.openAndGetContentAsStream(
                    `/islands/${climate}/${islandSize.name}${islandNumber}.scp`,
                );
            }
        }

        throw new Error("Could not load island");
    }

    public async loadRandomIslandFile(sizeId: 0|1|2|3|4, climate: "NORTH"|"SOUTH"|"ANY") {
        const islandSize = this.islandSizes.find((size) => size.id === sizeId);
        if (islandSize === undefined) {
            throw new Error("This should never happen.");
        }

        const islandFiles = [];
        if (["ANY", "NORTH"].includes(climate)) {
            islandFiles.push(...await this.loadIslandsWithSizeAndClimate(islandSize.name, "north"));
        }
        if (["ANY", "SOUTH"].includes(climate)) {
            islandFiles.push(...await this.loadIslandsWithSizeAndClimate(islandSize.name, "south"));
        }

        const randomIslandFile = islandFiles[Math.floor(Math.random() * islandFiles.length)];

        return {
            data: await this.fs.openAndGetContentAsStream(randomIslandFile.file.fullPath),
            isSouth: randomIslandFile.climate === "south",
            id: randomIslandFile.id,
        };
    }

    public parseIslandBuildings(island: Island, block: Block, players: PlayerMap): Array<Array<Field|null>> {
        const data = block.data;
        const dataLength = block.length;

        const fields: Field[][] = [];
        for (let x = 0; x < island.width; x++) {
            fields.push(new Array(island.height).fill(null));
        }

        for (let i = 0; i < dataLength / Field.saveGameDataLength; i++) {
            const field = Field.fromSaveGame(data, players);
            assert(field.x < island.width);
            assert(field.y < island.height);
            fields[field.x][field.y] = field;
        }

        return fields;
    }

    private async loadIslandsWithSizeAndClimate(sizeName: IslandSizeName, climate: "north"|"south") {
        return (await this.fs.ls(`/islands/${climate}`))
            .filter((islandFile) => islandFile.name.startsWith(sizeName))
            .filter((islandFile) => islandFile.name.match(/\d\d\.scp$/) !== null)
            .map((file) => {
                return {
                    file: file,
                    climate: climate,
                    id: parseInt(file.name.substr(3, 2), 10),
                };
            });
    }
}
