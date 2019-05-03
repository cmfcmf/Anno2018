import FileSystem from "../../filesystem";
import FieldType from "../../game/field-type";
import Field from "../../game/world/field";
import { Island } from "../../game/world/island";
import assert from "../../util/assert";
import { Block } from "./block";

export type IslandSizeId = 0 | 1 | 2 | 3 | 4;
export type IslandSizeName = "lit" | "mit" | "med" | "big" | "lar";
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
      maxSize: 35
    },
    {
      id: 1,
      name: "mit",
      maxSize: 45
    },
    {
      id: 2,
      name: "med",
      maxSize: 55
    },
    {
      id: 3,
      name: "big",
      maxSize: 85
    },
    {
      id: 4,
      name: "lar",
      maxSize: 100
    }
  ];

  constructor(
    private fs: FileSystem,
    private fieldData: ReadonlyMap<number, FieldType>
  ) {}

  public async loadIslandFile(island: Island) {
    const climate = island.isSouth ? "south" : "north";
    const islandNumber = island.numBaseIsland.toString().padStart(2, "0");
    for (const islandSize of this.islandSizes) {
      if (island.size.x <= islandSize.maxSize) {
        return this.fs.openAndGetContentAsStream(
          `/islands/${climate}/${islandSize.name}${islandNumber}.scp`
        );
      }
    }

    throw new Error("Could not load island");
  }

  public async loadIslandFileByName(name: string) {
    return this.fs.openAndGetContentAsStream(`/islands/${name}.scp`);
  }

  public async loadRandomIslandFile(
    sizeId: 0 | 1 | 2 | 3 | 4,
    climate: "NORTH" | "SOUTH" | "ANY"
  ) {
    const islandSize = this.islandSizes.find(size => size.id === sizeId);
    if (islandSize === undefined) {
      throw new Error("This should never happen.");
    }

    const islandFiles = [];
    if (["ANY", "NORTH"].includes(climate)) {
      islandFiles.push(
        ...(await this.loadIslandsWithSizeAndClimate(islandSize.name, "north"))
      );
    }
    if (["ANY", "SOUTH"].includes(climate)) {
      islandFiles.push(
        ...(await this.loadIslandsWithSizeAndClimate(islandSize.name, "south"))
      );
    }

    const randomIslandFile =
      islandFiles[Math.floor(Math.random() * islandFiles.length)];

    return {
      data: await this.fs.openAndGetContentAsStream(
        randomIslandFile.file.fullPath
      ),
      isSouth: randomIslandFile.climate === "south",
      id: randomIslandFile.id
    };
  }

  public setIslandFields(island: Island, blocks: Block[]) {
    island.baseFields = [];
    island.topFields = [];
    for (let x = 0; x < island.size.x; x++) {
      island.baseFields.push(new Array(island.size.y).fill(null));
      island.topFields.push(new Array(island.size.y).fill(null));
    }
    for (const block of blocks) {
      const parsedFields = this.parseIslandFields(island, block);
      for (let x = 0; x < island.size.x; x++) {
        for (let y = 0; y < island.size.y; y++) {
          const parsedField = parsedFields[x][y];
          if (parsedField === null) {
            continue;
          }
          const config = this.fieldData.get(parsedField.fieldId);
          if (
            [
              "BODEN",
              "FLUSS",
              "FLUSSECK",
              "HANG",
              "HANGQUELL",
              "HANGECK",
              "STRAND",
              "STRANDMUND",
              "STRANDECKI",
              "STRANDVARI",
              "STRANDECKA",
              "BRANDUNG",
              "BRANDECK",
              "MEER",
              "FELS",
              "MUENDUNG"
            ].includes(config.kind)
          ) {
            island.baseFields[x][y] = parsedField;
          } else {
            island.topFields[x][y] = parsedField;
          }
        }
      }
    }
  }

  private parseIslandFields(
    island: Island,
    block: Block
  ): Array<Array<Field | null>> {
    const data = block.data;
    const dataLength = block.length;

    const fields: Field[][] = [];
    for (let x = 0; x < island.size.x; x++) {
      fields.push(new Array(island.size.y).fill(null));
    }

    for (let i = 0; i < dataLength / Field.saveGameDataLength; i++) {
      const field = Field.fromSaveGame(data);
      assert(field.x < island.size.x);
      assert(field.y < island.size.y);
      fields[field.x][field.y] = field;
    }

    return fields;
  }

  private async loadIslandsWithSizeAndClimate(
    sizeName: IslandSizeName,
    climate: "north" | "south"
  ) {
    return (await this.fs.ls(`/islands/${climate}`))
      .filter(islandFile => islandFile.name.startsWith(sizeName))
      .filter(islandFile => islandFile.name.match(/\d\d\.scp$/) !== null)
      .map(file => {
        return {
          file: file,
          climate: climate,
          id: parseInt(file.name.substr(3, 2), 10)
        };
      });
  }
}
