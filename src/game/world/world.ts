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
import { FarmField } from "./farmField";

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
    public readonly houses: House[],
    public readonly farmFields: FarmField[]
  ) {}

  public log() {
    console.log("Tasks");
    console.table(this.tasks);
    console.log("Game Name", this.gameName);
    console.log("Islands");
    console.table(this.islands);
    console.log("Players");
    console.table(this.players);
    console.log("Soldiers");
    console.table(this.soldiers);
    console.log("Ships");
    console.table(this.ships);
    console.log("Kontors");
    console.table(this.kontors);
    console.log("Castles");
    console.table(this.castles);
    console.log("Cities");
    console.table(this.cities);
    console.log("Trader", this.trader);
    console.log("Timers", this.timers);
    console.log("Producers");
    console.table(this.producers);
    console.log("Houses");
    console.table(this.houses);
    console.log("Farm fields");
    console.table(this.farmFields);
  }
}
