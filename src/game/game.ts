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
import { GoodIds } from "./field-type";

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
      this.emit("player/upkeep", {
        playerId: parseInt(playerId, 10),
        upkeep: upkeeps[playerId]
      });
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
    this.state.producers.forEach((producer, producerId) => {
      if (!producer.isActive()) {
        return;
      }
      if (producer.timer > 0) {
        producer.timer--;
        if (producer.timer > 0) {
          return;
        }
      }

      const island = this.state.islands[producer.islandId];
      const buildingId = this.getFieldAtIsland(island, producer.position)!
        .fieldId;
      const fieldConfig = fieldData.get(buildingId)!;
      assert(fieldConfig);

      if (producer.howMuchIsBeingProduced > 0) {
        // Good produced (this might mean that just 0.5 of a good was produced)
        producer.firstGoodStock -=
          ((fieldConfig.production.amount1 << 5) *
            producer.howMuchIsBeingProduced) >>
          7;
        producer.secondGoodStock -=
          ((fieldConfig.production.amount2 << 5) *
            producer.howMuchIsBeingProduced) >>
          7;

        const oldStock = producer.stock;
        producer.stock +=
          fieldConfig.production.amount * producer.howMuchIsBeingProduced;
        if (producer.stock - oldStock >= 32) {
          this.emit("producer/good-produced", {
            island: this.state.islands[producer.islandId],
            position: producer.position,
            stock: producer.stock
          });
        }
      }

      let howMuchCanWeProduce = 0;
      let var11c = 11;
      let notmp5 = false;

      // Check if we can produce more
      if (producer.stock >= fieldConfig.production.maxStock << 5) {
        // Show stock full message (but do not print good produced message!)
      } else {
        // check_has_first_good, check_is_producing, check_can_produce_valid_good
        if (
          producer.firstGoodStock !== 0 &&
          !producer.isProducing() &&
          fieldConfig.production.good !== GoodIds.NOWARE
        ) {
          // check_needs_good_1
          if (fieldConfig.production.amount1 === 0) {
            howMuchCanWeProduce = 128;
          } else {
            const howMuchCanWeProduceWithGood1 =
              (producer.firstGoodStock /
                (fieldConfig.production.amount1 << 5)) *
              128;
            howMuchCanWeProduce = Math.min(128, howMuchCanWeProduceWithGood1);
          }

          // check_needs_good_2
          if (fieldConfig.production.amount2 === 0) {
            // Nothing to do
          } else {
            const howMuchCanWeProduceWithGood2 =
              (producer.secondGoodStock /
                (fieldConfig.production.amount2 << 5)) *
              128;
            howMuchCanWeProduce = Math.min(
              howMuchCanWeProduceWithGood2,
              howMuchCanWeProduce
            );
          }

          // tmp_2
          if (howMuchCanWeProduce < 64) {
            // tmp_3
            // less than 0.5 goods can be produced
            howMuchCanWeProduce = 0;
          } else {
            // tmp_4
            // between 0.5 and 1 goods can be produced
            var11c =
              ((fieldConfig.production.interval << 8) * howMuchCanWeProduce) >>
              7;
            if (howMuchCanWeProduce !== 0) {
              // tmp_6
              producer.prodCount +=
                (howMuchCanWeProduce >> 7) *
                (fieldConfig.production.amount << 5);
              producer.setGoodWasProducedTimer(0);
              notmp5 = true;
            }
          }
        }

        if (!notmp5) {
          // tmp_5
          if (producer.getGoodWasProducedTimer() < 0b1111) {
            // tmp_7
            producer.setGoodWasProducedTimer(
              producer.getGoodWasProducedTimer() + 1
            );
          }
        }
      }

      // tmp_1
      if (howMuchCanWeProduce > 0 !== producer.howMuchIsBeingProduced > 0) {
        // tmp_8
        // TODO producer.setSpeedCntANimationSomething(animation_something())
      }

      // tmp_9
      producer.timeCount += var11c >> 8;
      producer.howMuchIsBeingProduced = howMuchCanWeProduce;
      producer.timer = var11c >> 8;
      if (producer.timeCount <= 240) {
        // tmp_10
        producer.timeCount >>= 1;
        producer.prodCount >>= 1;
      }

      // TODO: Skipped a few blocks that seem to be related to animations.

      // tmp_11, tmp_12
      if (
        producer.howMuchIsBeingProduced > 0 ||
        producer.stock < fieldConfig.production.maxStock
      ) {
        let edi;
        // tmp_13
        if (fieldConfig.production.amount2 !== 0) {
          // TODO: tmp_14
          edi = 0x180;
        } else {
          // TODO: tmp_15
          edi = Math.floor(
            ((producer.secondGoodStock << 8) << 7) /
              fieldConfig.production.amount2
          );
        }

        // tmp_16
        if (fieldConfig.production.amount1 === 0) {
          // TODO: tmp_17
        } else {
          // tmp_18, tmp_19
          const eax = Math.floor(
            ((producer.firstGoodStock << 8) << 7) /
              fieldConfig.production.amount2
          );
          if (eax > 0x100 || eax > edi) {
            // TODO: tmp_17
          } else {
            // TODO: tmp_20
          }
        }
      }

      // TODO: block at the very bottom

      this.emit("producer/updated", { producerId: producerId });
    });
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
        fieldConfig.production.upkeep[
          producer.isActive() ? "active" : "inactive"
        ];
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
