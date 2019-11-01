import { EventEmitter } from "events";
import { Point } from "pixi.js";
import assert from "../util/assert";
import ConfigLoader from "./config-loader";
import { City } from "./world/city";
import { Island } from "./world/island";
import { Kontor } from "./world/kontor";
import { Player } from "./world/player";
import { Producer } from "./world/producer";
import { Ship } from "./world/ship";
import { Task } from "./world/task";
import { Timers } from "./world/timers";
import World, { SimulationSpeed } from "./world/world";

interface MapById<T> {
  [k: string]: T;
}

export const defaultTimers = {
  simulationSpeed: 0,
  cntCity: 0,
  cntIsland: 0,
  cntShipyard: 0,
  cntMilitary: 0,
  cntProduction: 0,
  cntSettlers: [],
  cntGrowth: [],
  timeCity: 0,
  timeIsland: 0,
  timeShipyard: 0,
  timeMilitary: 0,
  timeProduction: 0,
  timeGoodToolsCnt: 0,
  timeGoodToolsMax: 0,
  timeGame: 0,
  noErzOutFlg: 0,
  tutorFlg: 0,
  aiLevel: 0,
  missionNumber: 0,
  gameId: 0,
  cityNameNumber: 0,
  timeNextDrought: 0,
  timePirateSec: 0,
  missionSubNumber: 0,
  shipMax: 0,
  timeNextVulcano: 0,
  cntVulcano: 0,
  timeSettlers: [],
  timeGrowth: [],
  enableTrader: false,
  bigIronRunsOut: false,
  enableDroughts: false,
  enablePirate: false,
  enableVulcano: false
};

export interface GameState {
  players: MapById<Player>;
  islands: MapById<Island>;
  tasks: MapById<Task>;
  cities: City[];
  kontors: Kontor[];
  producers: Producer[];
  ships: Ship[];
  timers: Timers & { simulationSpeed: SimulationSpeed };
}

export default class Game extends EventEmitter {
  public state: GameState;
  private timerId: number | null;

  constructor(private readonly configLoader: ConfigLoader, world: World) {
    super();
    this.state = {
      players: this.mapArrayById(world.players),
      islands: this.mapArrayById(world.islands),
      tasks: this.mapArrayById(world.tasks),
      cities: world.cities,
      kontors: world.kontors,
      producers: world.producers,
      ships: world.ships,
      timers: { ...world.timers, simulationSpeed: SimulationSpeed.Paused }
    };
  }

  public getFieldAtIsland = (island: Island, islandPos: Point) => {
    return island.fields[islandPos.x][islandPos.y];
  };

  public getFieldAt = (globalPos: Point) => {
    const island = Object.values(this.state.islands).find(each =>
      each.positionRect.contains(globalPos.x, globalPos.y)
    );
    if (!island) {
      return null;
    }
    const islandPos = new Point(
      globalPos.x - island.position.x,
      globalPos.y - island.position.y
    );

    return this.getFieldAtIsland(island, islandPos);
  };

  public setSimulationSpeed(speed: SimulationSpeed) {
    this.state.timers.simulationSpeed = speed;

    if (this.timerId) {
      window.clearInterval(this.timerId);
    }
    if (speed !== SimulationSpeed.Paused) {
      this.timerId = window.setInterval(this.tick, 100 / speed);
    }

    this.emit("simulation-speed", speed);
  }

  private mapArrayById<T extends { id: number }>(arr: T[]) {
    return arr.reduce((objectMap: { [k: string]: T }, obj: T) => {
      objectMap[obj.id] = obj;
      return objectMap;
    }, {});
  }

  private watchTicksForUpkeep() {
    const time = this.state.timers.timeGame;
    if (time % 100 !== 0) {
      return;
    }

    console.log("upkeep calculation");
    const upkeeps = this.calculateUpkeeps();
    for (const playerId of Object.keys(upkeeps)) {
      // This is how Anno 1602 does it, see
      // https://www.annozone.de/Charlie/Cod/numerik.html
      const upkeep = Math.floor(upkeeps[playerId] / 6);
      this.addMoney(parseInt(playerId, 10), -upkeep);
    }
  }

  private addMoney(playerId: number, money: number) {
    this.state.players[playerId].money += money;
    this.emit("player/money", {
      playerId,
      money: this.state.players[playerId].money
    });
  }

  private watchTicksForProducing() {
    const time = this.state.timers.timeGame;
    if (time % 10 !== 0) {
      return;
    }

    console.log("update producers");
    const fieldData = this.configLoader.getFieldData();
    this.state.producers.forEach((producer, id) => {
      if (!producer.active) {
        return [];
      }
      const island = this.state.islands[producer.islandId];
      const buildingId = this.getFieldAtIsland(island, producer.position)!
        .fieldId;
      const fieldConfig = fieldData.get(buildingId)!;
      assert(fieldConfig);

      if (producer.producedGood === 128 && producer.timer === 1) {
        // We have finished producing!
        const newStock = producer.stock + 1;
        const newFirstGoodStock =
          producer.firstGoodStock - fieldConfig.production.amount1;
        const newSecondGoodStock =
          producer.secondGoodStock - fieldConfig.production.amount2;
        const canProduceEvenMore =
          newFirstGoodStock >= fieldConfig.production.amount1 &&
          newSecondGoodStock >= fieldConfig.production.amount2 &&
          newStock < fieldConfig.production.maxStock;

        this.updateProcuder((id as unknown) as number, {
          stock: newStock,
          timer: canProduceEvenMore ? fieldConfig.production.interval : 11,
          firstGoodStock: newFirstGoodStock,
          secondGoodStock: newSecondGoodStock,
          producedGood: canProduceEvenMore ? 128 : 0
        });
      } else if (
        producer.producedGood === 0 &&
        (producer.timer === 1 || this.state.timers.cntProduction === 0)
      ) {
        // We are not currently producing something but should now check
        // whether we can start producing something new.
        const canProduce =
          producer.firstGoodStock >= fieldConfig.production.amount1 &&
          producer.secondGoodStock >= fieldConfig.production.amount2 &&
          producer.stock < fieldConfig.production.maxStock;
        this.updateProcuder((id as unknown) as number, {
          timer: canProduce
            ? fieldConfig.production.interval
            : producer.timer <= 1
            ? 11
            : producer.timer - 1,
          producedGood: canProduce ? 128 : 0
        });
      } else {
        this.updateProcuder((id as unknown) as number, {
          // The timer never reaches 0.
          timer: producer.timer <= 1 ? 11 : producer.timer - 1
        });
      }
    });
  }

  private updateProcuder(producerId: number, patch: Partial<Producer>) {
    const producer = this.state.producers[producerId];
    Object.assign(producer, patch);

    this.emit("producer/updated", { producerId });
    if (patch.stock !== undefined) {
      this.emit("producer/good-produced", {
        island: this.state.islands[producer.islandId],
        position: producer.position,
        stock: producer.stock
      });
    }
  }

  private calculateUpkeeps() {
    const upkeeps: Record<string, number> = Object.keys(
      this.state.players
    ).reduce((obj: Record<string, number>, id: string) => {
      obj[id] = 0;
      return obj;
    }, {});

    Object.values(this.state.producers).forEach(producer => {
      const island = this.state.islands[producer.islandId];
      const field = island.fields[producer.position.x][producer.position.y]!;
      const buildingId = field.fieldId;
      const playerId = field.playerId;
      assert(buildingId !== 0xffff);
      assert(playerId < 7);
      const fieldConfig = this.configLoader.getFieldData().get(buildingId)!;
      assert(fieldConfig);

      upkeeps[playerId] +=
        fieldConfig.production.upkeep[producer.active ? "active" : "inactive"];
    }, this);

    return upkeeps;
  }

  private tick = () => {
    this.state.timers.timeGame++;
    this.state.timers.cntCity = this.inc(this.state.timers.cntCity, 8, 100);
    this.state.timers.cntIsland = this.inc(this.state.timers.cntIsland, 8, 100);
    this.state.timers.cntShipyard = this.inc(
      this.state.timers.cntShipyard,
      8,
      10
    );
    this.state.timers.cntMilitary = this.inc(
      this.state.timers.cntMilitary,
      8,
      10
    );
    this.state.timers.cntProduction = this.inc(
      this.state.timers.cntProduction,
      8,
      10
    );

    this.watchTicksForUpkeep();
    this.watchTicksForProducing();
    this.emit("tick");
  };

  private inc = (value: number, max: number, interval: number) => {
    const gameTime = this.state.timers.timeGame;
    if (gameTime % interval !== 0) {
      return value;
    }
    value++;
    if (value >= max) {
      value = 0;
    }
    return value;
  };
}
