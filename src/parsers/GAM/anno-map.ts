import Player from "./entities/player";
import Ship from "./entities/ship";
import Task from "./entities/task";
import {Island, Kontor} from "./gam-parser";

export class AnnoMap {
    constructor(public islands: Island[], public ships: Ship[], public kontors: Kontor[], public players: Player[],
                public task: Task, public gameName: string) {
        console.table(ships);
        console.log(task);
        console.table(kontors);
        console.table(players);
    }
}
