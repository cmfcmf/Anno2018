import Player from "./entities/player";
import Task from "./entities/task";
import {Island, Kontor, Ship} from "./gam-parser";

export class AnnoMap {
    constructor(public islands: Island[], public ships: Ship[], public kontors: Kontor[], public players: Player[],
                public task: Task, public gameName: string) { }
}
