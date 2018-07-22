import FileSystem from "../../filesystem";
import Island from "../../game/world/island";

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

    public async load(island: Island) {
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

    public async loadRandom(sizeId: 0|1|2|3|4, climate: "NORTH"|"SOUTH"|"ANY") {
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

        console.log(randomIslandFile.fullPath);

        return await this.fs.openAndGetContentAsStream(randomIslandFile.fullPath);
    }

    private async loadIslandsWithSizeAndClimate(sizeName: IslandSizeName, climate: "north"|"south") {
        return (await this.fs.ls(`/islands/${climate}`)).filter((islandFile) => islandFile.name.startsWith(sizeName));
    }
}
