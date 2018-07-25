/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";
import assert from "../../util/assert";
import City from "./city";
import Field from "./field";
import {OreLocation} from "./island-ore-location";

enum IslandFertilityFlags {
    TOBACCO = 1,
    SUGARCANE = 3,
    WINE = 5,
    COTTON = 4,
    CACAO = 6,
    SPICE = 2,
}

export interface IslandFertility {
    tobacco: boolean;
    sugarcane: boolean;
    wine: boolean;
    cotton: boolean;
    cacao: boolean;
    spice: boolean;
}

export default class Island {
    public static fromIsland3File(id: number, position: PIXI.Point, isSouth: boolean, numBaseIsland: number,
                                  data: Stream) {
        data.read8(); // Ignore id
        const size = new PIXI.Point(data.read8(), data.read8());

        return new Island(
            id,
            position,
            size,
            numBaseIsland,
            0,
            [],
            {
                tobacco: false,
                sugarcane: false,
                wine: false,
                cotton: false,
                cacao: false,
                spice: false,
            },
            isSouth,
            false,
            false,
        );
    }

    public static fromIsland4File(id: number, position: PIXI.Point, isSouth: boolean, numBaseIsland: number,
                                  data: Stream) {
        return this.fromIsland3File(id, position, isSouth, numBaseIsland, data);
    }

    public static fromIsland5File(id: number, position: PIXI.Point, isSouth: boolean, numBaseIsland: number,
                                  data: Stream) {
        return this.fromIsland3File(id, position, isSouth, numBaseIsland, data);
    }

    public static fromSaveGame(data: Stream) {
        const id = data.read8();
        const width = data.read8();
        const height = data.read8();
        /*
        uint8      strtduerrflg:1;
        uint8      nofixflg:1;
        uint8      vulkanflg:1;
         */
        const _1 = data.read8();
        const x = data.read16();
        const y = data.read16();

        const hirschreviercnt = data.read16();
        const speedcnt = data.read16();
        // the order in which players built their cities on this island
        // is 7, 7, 7, 7, 7, 7, 7, 7, by default
        // fills up from the beginning with player ids once a player builds a kontor.
        // natives are also listed; islands with natives start with 6, 7, 7, ...
        const stadtplayernr = data.read(8);

        assert(data.read(3).every((e) => e === 0));

        const vulcanoCount = data.read8();
        const treasureFlag = data.read8Bool();
        const rohstanz = data.read8();

        const numOreLocations = data.read8();
        const fertilityDiscovered = data.read8();
        const oreLocations = [
            OreLocation.fromSaveGame(data),
            OreLocation.fromSaveGame(data),
        ];
        // These look like even more ore locations.
        const _5 = data.read(48);

        const fertility = this.parseFertility(data.read32());
        const numBaseIsland = data.read16();

        // unsure
        const sizenr = data.read16();

        const isSouth = data.read8Bool();
        const differsFromBaseIsland = data.read8Bool();

        // unsure
        const duerrproz = data.read8();
        // unsure
        const rotier = data.read8();

        const seeplayerflags = data.read32(); // 1 nach bloßem Vorbeifahren (= zeigt Eingebohrene), 0xFF nach Kontorbau

        // unsure
        const duerrcnt = data.read32();

        assert(data.read32() === 0);

        const island = new Island(
            id,
            new PIXI.Point(x, y),
            new PIXI.Point(width, height),
            numBaseIsland,
            numOreLocations,
            oreLocations,
            fertility,
            isSouth,
            differsFromBaseIsland,
            fertilityDiscovered !== 0,
        );
        island.debug = {
            _1,
            _5,
            hirschreviercnt,
            speedcnt,
            stadtplayernr,
            vulcanoCount,
            treasureFlag,
            rohstanz,

            sizenr,
            duerrproz,
            rotier,

            seeplayerflags,
            duerrcnt,
        };
        console.log(island.debug);

        return island;
    }

    private static parseFertility(fertility: number): IslandFertility {
        return {
            tobacco:   (fertility & (1 << IslandFertilityFlags.TOBACCO)) > 0,
            sugarcane: (fertility & (1 << IslandFertilityFlags.SUGARCANE)) > 0,
            wine:      (fertility & (1 << IslandFertilityFlags.WINE)) > 0,
            cotton:    (fertility & (1 << IslandFertilityFlags.COTTON)) > 0,
            cacao:     (fertility & (1 << IslandFertilityFlags.CACAO)) > 0,
            spice:     (fertility & (1 << IslandFertilityFlags.SPICE)) > 0,
        };
    }

    public debug: any;

    public baseFields: Field[][] = [];

    public topFields: Array<Array<Field|null>> = [];

    public cities: City[];

    constructor(
        public readonly id: number,
        public readonly worldPosition: PIXI.Point,
        public readonly size: PIXI.Point,
        public readonly baseIslandNumber: number,
        public readonly numOreLocations: number,
        public readonly oreLocations: OreLocation[],
        public readonly fertility: IslandFertility,
        private readonly south: boolean,
        public readonly differsFromBaseIsland: boolean, // If this is 1, we need to ignore the .scp file for this island
                                                        // and instead use the data in INSELHAUS[0] directly after
                                                        // the island block. This can happen, for example, when the
                                                        // island is rotated.

        public fertilityDiscovered: boolean,
    ) {
        this.cities = [];
    }

    get width() {
        return this.size.x;
    }

    get height() {
        return this.size.y;
    }

    get x() {
        return this.worldPosition.x;
    }

    get y() {
        return this.worldPosition.y;
    }

    get positionRect() {
        return new PIXI.Rectangle(
            this.x,
            this.y,
            this.width,
            this.height,
        );
    }

    get isSouth() {
        return this.south;
    }

    get isNorth() {
        return !this.south;
    }

    public getBuildingAtWorldPosition(worldPosition: PIXI.Point): Field|null {
        assert(this.positionRect.contains(worldPosition.x, worldPosition.y));

        return this.topFields[worldPosition.x][worldPosition.y];
    }
}
