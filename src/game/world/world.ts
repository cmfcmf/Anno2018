import {Castle} from "./castle";
import {City} from "./city";
import {Island} from "./island";
import {Kontor} from "./kontor";
import {Player} from "./player";
import {Producer} from "./producer";
import {Ship} from "./ship";
import {Soldier} from "./soldier";
import {Task} from "./task";
import {Timers} from "./timers";
import {Trader} from "./trader";

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
    constructor(
        public readonly islands: Island[],
        public readonly players: Player[],
        public readonly tasks: Task[],
        public readonly gameName: string,
        public readonly soldiers: Soldier[],
        public readonly ships: Ship[],
        public readonly kontors: Kontor[],
        public readonly castles: Castle[],
        public readonly cities: City[],
        public readonly trader: Trader|null,
        public readonly timers: Timers,
        public readonly producers: Producer[],
    ) {
        console.table(tasks);
        console.log(gameName);
        console.table(islands);
        console.table(players);
        console.table(soldiers);
        console.table(ships);
        console.table(kontors);
        console.table(castles);
        console.table(cities);
        console.log(trader);
        console.log(timers);
        console.table(producers);
    }
}
