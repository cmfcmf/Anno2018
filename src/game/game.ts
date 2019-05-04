import { Map as ImmutableMap, Record } from "immutable";
import { Key, KeyboardManager } from "pixi-keyboard";
import { Point } from "pixi.js";
import { createStore, Store } from "redux";
import { batchActions, enableBatching } from "redux-batched-actions";
import { devToolsEnhancer } from "redux-devtools-extension";
import { combineReducers } from "redux-immutable";
import { Observable } from "rxjs/internal/Observable";
import { distinctUntilChanged, filter, map } from "rxjs/operators";
import assert from "../util/assert";
import ConfigLoader from "./config-loader";
import GameRenderer from "./game-renderer";
import {
  createAddMoney,
  createSetSimulationSpeed,
  createTick,
  createUpdateProducer
} from "./logic/action-creators";
import * as actionCreators from "./logic/action-creators";
import {
  playerReducer,
  producerReducer,
  TICK,
  timerReducer
} from "./logic/reducers";
import { City } from "./world/city";
import { Island } from "./world/island";
import { Kontor } from "./world/kontor";
import { Player } from "./world/player";
import { Producer } from "./world/producer";
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

const GameStateFactory = Record<{
  players: MapById<Player>;
  islands: MapById<Island>;
  tasks: MapById<Task>;
  cities: City[];
  kontors: Kontor[];
  producers: ImmutableMap<number, Producer>;
  timers: Timers & { simulationSpeed: SimulationSpeed };
}>({
  players: {},
  islands: {},
  tasks: {},
  cities: [],
  kontors: [],
  producers: ImmutableMap<number, Producer>(),
  timers: defaultTimers
});

export type GameState = ReturnType<typeof GameStateFactory>;

function getState$<T>(store: Store<T>) {
  return new Observable<T>(observer => {
    observer.next(store.getState());
    return store.subscribe(() => {
      observer.next(store.getState());
    });
  });
}

export default class Game {
  private store: Store<GameState>;

  private timerId: number | null;
  private readonly myPlayerId: number = 0;
  private readonly keyboardManager: KeyboardManager;

  constructor(
    private readonly gameRenderer: GameRenderer,
    private readonly configLoader: ConfigLoader
  ) {
    this.keyboardManager = new KeyboardManager();
    this.keyboardManager.enable();
    this.setupHotKeys();
  }

  public async begin(world: World) {
    const producers = ImmutableMap(
      world.producers.map((producer, idx) => [idx, producer])
    );

    const initialState: GameState = GameStateFactory({
      players: this.mapArrayById(world.players),
      islands: this.mapArrayById(world.islands),
      tasks: this.mapArrayById(world.tasks),
      cities: world.cities,
      kontors: world.kontors,
      producers: producers,
      timers: { ...world.timers, simulationSpeed: SimulationSpeed.Paused }
    });

    this.store = createStore(
      enableBatching(
        combineReducers({
          players: playerReducer,
          islands: (state: GameState["islands"] = {}) => state,
          timers: timerReducer,
          tasks: (state: GameState["tasks"] = {}) => state,
          cities: (state: GameState["cities"] = []) => state,
          kontors: (state: GameState["kontors"] = []) => state,
          producers: producerReducer
        })
      ),
      initialState,
      devToolsEnhancer({ actionsBlacklist: [TICK], actionCreators })
    );

    this.watchSimulationSpeed();
    this.watchTicksForUpkeep();
    this.watchTicksForProducing();
    getState$(this.store)
      .pipe(
        map(state => state.players[0].money),
        distinctUntilChanged()
      )
      .subscribe(money => {
        this.gameRenderer.setMoney(money);
      });

    this.store.dispatch(createSetSimulationSpeed(SimulationSpeed.Default));

    this.keyboardManager.enable();

    await this.gameRenderer.begin(this.myPlayerId);
  }

  public getFieldAtIsland = (island: Island, islandPos: Point) => {
    return island.fields[islandPos.x][islandPos.y];
  };

  public getFieldAt = (globalPos: Point) => {
    const island = Object.values(this.store.getState().islands).find(each =>
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

  private mapArrayById<T extends { id: number }>(arr: T[]) {
    return arr.reduce((objectMap: { [k: string]: T }, obj: T) => {
      objectMap[obj.id] = obj;
      return objectMap;
    }, {});
  }

  private watchSimulationSpeed() {
    getState$(this.store)
      .pipe(
        map(state => state.timers.simulationSpeed),
        distinctUntilChanged()
      )
      .subscribe(speed => {
        if (this.timerId) {
          clearInterval(this.timerId);
        }
        if (speed !== SimulationSpeed.Paused) {
          this.timerId = window.setInterval(this.tick, 100 / speed);
        }
      });
  }

  private watchTicksForUpkeep() {
    getState$(this.store)
      .pipe(
        map(state => state.timers.timeGame),
        filter(time => time % 100 === 0),
        distinctUntilChanged()
      )
      .subscribe(() => {
        // console.profile("upkeep");
        console.log("upkeep calculation");
        const upkeeps = this.calculateUpkeeps();
        for (const playerId of Object.keys(upkeeps)) {
          // This is how Anno 1602 does it, see
          // https://www.annozone.de/Charlie/Cod/numerik.html
          const upkeep = Math.floor(upkeeps[playerId] / 6);
          this.store.dispatch(createAddMoney(parseInt(playerId, 10), -upkeep));
        }
        // console.profileEnd("upkeep");
      });
  }

  private watchTicksForProducing() {
    getState$(this.store)
      .pipe(
        filter(state => state.timers.timeGame % 10 === 0),
        distinctUntilChanged((a, b) => a.timers.timeGame === b.timers.timeGame)
      )
      .subscribe(state => {
        console.log("update producers");
        const fieldData = this.configLoader.getFieldData();
        const actions = state.producers.entrySeq().flatMap(([id, producer]) => {
          if (!producer.active) {
            return [];
          }
          const island = state.islands[producer.islandId];
          const buildingId = this.getFieldAtIsland(island, producer.position)!
            .fieldId;
          const fieldConfig = fieldData.get(buildingId)!;
          assert(fieldConfig);

          if (producer.producedGood === 128 && producer.timer === 1) {
            // We have finished producing!
            const canProduceEvenMore =
              producer.firstGoodStock >= 2 * fieldConfig.production.amount1 &&
              producer.secondGoodStock >= 2 * fieldConfig.production.amount2 &&
              producer.stock < fieldConfig.production.maxStock - 1;
            const newStock = producer.stock + 1;

            this.gameRenderer.onProduced(island, producer.position, newStock);
            return [
              createUpdateProducer(id, {
                stock: newStock,
                timer: canProduceEvenMore
                  ? fieldConfig.production.interval
                  : 11,
                firstGoodStock:
                  producer.firstGoodStock - fieldConfig.production.amount1,
                secondGoodStock:
                  producer.secondGoodStock - fieldConfig.production.amount2,
                producedGood: canProduceEvenMore ? 128 : 0
              })
            ];
          } else if (
            producer.producedGood === 0 &&
            (producer.timer === 1 || state.timers.cntProduction === 0)
          ) {
            // We are not currently producing something but should now check
            // whether we can start producing something new.
            const canProduce =
              producer.firstGoodStock >= fieldConfig.production.amount1 &&
              producer.secondGoodStock >= fieldConfig.production.amount2 &&
              producer.stock < fieldConfig.production.maxStock;
            return [
              createUpdateProducer(id, {
                timer: canProduce
                  ? fieldConfig.production.interval
                  : producer.timer <= 1
                  ? 11
                  : producer.timer - 1,
                producedGood: canProduce ? 128 : 0
              })
            ];
          } else {
            return [
              createUpdateProducer(id, {
                // The timer never reaches 0.
                timer: producer.timer <= 1 ? 11 : producer.timer - 1
              })
            ];
          }
        });
        this.store.dispatch(batchActions(actions.toArray()));
      });
  }

  private calculateUpkeeps() {
    const state = this.store.getState();
    const upkeeps: { [k: string]: number } = Object.keys(state.players).reduce(
      (obj: { [k: string]: number }, id: string) => {
        obj[id] = 0;
        return obj;
      },
      {}
    );

    const islands = state.islands;
    state.producers.forEach(producer => {
      const island = islands[producer.islandId];
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

  private setupHotKeys() {
    const showTaskKey = Key.F1;
    this.keyboardManager.onKeyPressedWithPreventDefault(showTaskKey, () => {
      const state = this.store.getState();
      const player = state.players[this.myPlayerId];
      const assignedTask = state.tasks[player.assignedTaskId];
      if (assignedTask !== undefined) {
        console.info(assignedTask.text);
      } else {
        console.info("It appears like you have no task :/");
      }
    });

    const zoomKeys: Array<{ key: number; zoom: 1 | 2 | 3 }> = [
      { key: Key.F2, zoom: 1 },
      { key: Key.F3, zoom: 2 },
      { key: Key.F4, zoom: 3 }
    ];
    for (const zoomKey of zoomKeys) {
      this.keyboardManager.onKeyPressedWithPreventDefault(zoomKey.key, () =>
        this.gameRenderer.zoom(zoomKey.zoom)
      );
    }

    const speedKeys = [
      { keys: [Key.PAUSE], speed: SimulationSpeed.Paused },
      { keys: [Key.F5], speed: SimulationSpeed.Slow },
      { keys: [Key.F6], speed: SimulationSpeed.Medium },
      { keys: [Key.F7], speed: SimulationSpeed.Fast },
      { keys: [Key.SHIFT, Key.F8], speed: SimulationSpeed.SuperFast }
    ];
    for (const speedKey of speedKeys) {
      this.keyboardManager.onKeysPressedWithPreventDefault(speedKey.keys, () =>
        this.store.dispatch(createSetSimulationSpeed(speedKey.speed))
      );
    }
  }

  private tick = () => {
    this.store.dispatch(createTick());
  };
}
