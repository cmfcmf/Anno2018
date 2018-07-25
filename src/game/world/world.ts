import {IslandMap, PlayerMap} from "../../parsers/GAM/gam-parser";
import Castle from "./castle";
import City from "./city";
import Field from "./field";
import Island from "./island";
import Kontor from "./kontor";
import Player from "./player";
import Ship from "./ship";
import Soldier from "./soldier";
import Task from "./task";
import Timers from "./timers";
import Trader from "./trader";

export type Rotation4 = 0 | 1 | 2 | 3;
export type Rotation8 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export enum SimulationSpeed {
    Paused = 0,
    Default = 1,
    Slow = Default,
    Medium = 2,
    Fast = 4,
    SuperFast = 8,
}

export default class World {
    public readonly players: Player[];
    public readonly islands: Island[];

    private simulationSpeed: SimulationSpeed = SimulationSpeed.Default;

    constructor(
        public readonly islandMap: IslandMap,
        public readonly playerMap: PlayerMap,
        public readonly tasks: Task[],
        public readonly gameName: string,
        public readonly soldiers: Soldier[],
        public readonly ships: Ship[],
        public readonly kontors: Kontor[],
        public readonly castles: Castle[],
        public readonly cities: City[],
        public readonly trader: Trader|null,
        public readonly timers: Timers,
    ) {
        this.players = [...playerMap.values()];
        this.islands = [...islandMap.values()];

        console.table(tasks);
        console.log(gameName);
        console.table(this.islands);
        console.table(this.players);
        console.table(soldiers);
        console.table(ships);
        console.table(kontors);
        console.table(castles);
        console.table(cities);
        console.log(trader);
        console.log(timers);
    }

    // Called every 10 seconds
    public tick10() {
        for (const player of this.players) {
            // player.updateMoney();
        }
        for (const island of this.islands) {
            // Chance for disaster

            for (const city of island.cities) {
                // city.consumeGoods();
            }
        }
        // etc.
    }

    public getBuildingAt(worldPosition: PIXI.Point): Field|null {
        const island = this.getIslandAt(worldPosition);
        if (island === null) {
            return null;
        }
        return island.getBuildingAtWorldPosition(worldPosition);
    }

    public getLandAt(worldPosition: PIXI.Point) {
        // TODO
    }

    public getIslandAt(worldPosition: PIXI.Point): Island|null {
        for (const island of this.islands) {
            if (island.positionRect.contains(worldPosition.x, worldPosition.y)) {
                return island;
            }
        }
        return null;
    }
}
