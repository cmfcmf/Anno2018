import { Castle } from "./castle";
import { City } from "./city";
import { Island } from "./island";
import { Kontor } from "./kontor";
import { Player } from "./player";
import { Producer } from "./producer";
import { Ship } from "./ship";
import { Soldier } from "./soldier";
import { Task } from "./task";
import { Timers } from "./timers";
import { Trader } from "./trader";
import { House } from "./house";

export type Rotation4 = 0 | 1 | 2 | 3;

export type Rotation8 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export enum SimulationSpeed {
  Paused = 0,
  Default = 1,
  Slow = Default,
  Medium = 2,
  Fast = 4,
  SuperFast = 8
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
    public readonly trader: Trader | null,
    public readonly timers: Timers,
    public readonly producers: Producer[],
    public readonly houses: House[]
  ) {
    console.log("Tasks");
    console.table(tasks);
    console.log("Game Name", gameName);
    console.log("Islands");
    console.table(islands);
    console.log("Players");
    console.table(players);
    console.log("Soldiers");
    console.table(soldiers);
    console.log("Ships");
    console.table(ships);
    console.log("Kontors");
    console.table(kontors);
    console.log("Castles");
    console.table(castles);
    console.log("Cities");
    console.table(cities);
    console.log("Trader", trader);
    console.log("Timers", timers);
    console.log("Producers");
    console.table(producers);
    console.log("Houses");
    console.table(houses);
  }
}
