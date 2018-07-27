import "pixi-keyboard";
import * as PIXI from "pixi.js";
import {Action, combineReducers, createStore, Store} from "redux";
import {composeWithDevTools} from "redux-devtools-extension";
import watch from "redux-watch";
import {Observable} from "rxjs/internal/Observable";
import {filter} from "rxjs/operators";
import assert from "../util/assert";
import ConfigLoader from "./config-loader";
import GameRenderer from "./game-renderer";
import Keys = PIXI.keyboard.Keys;
import {City} from "./world/city";
import {Island} from "./world/island";
import {Kontor} from "./world/kontor";
import {Player} from "./world/player";
import {Producer} from "./world/producer";
import {Task} from "./world/task";
import {Timers} from "./world/timers";
import World, {SimulationSpeed} from "./world/world";

const TICK = "TICK";
const DONATE_MONEY = "DONATE_MONEY";
const SET_SIMULATION_SPEED = "SET_SIMULATION_SPEED";
const PAY_UPKEEP = "PAY_UPKEEP";

function createTick() {
    return {
        type: TICK,
    };
}

function createDonateMoney(fromPlayer: number, toPlayer: number, amount: number) {
    return {
        type: DONATE_MONEY,
        payload: {
            fromPlayer,
            toPlayer,
            amount,
        },
    };
}

function createSetSimulationSpeed(newSpeed: SimulationSpeed) {
    return {
        type: SET_SIMULATION_SPEED,
        payload: newSpeed,
    };
}

function createPayUpkeep(playerId: number, upkeep: number) {
    return {
        type: PAY_UPKEEP,
        payload: {
            playerId,
            upkeep,
        },
    };
}

interface MapById<T> {
    [k: string]: T;
}

interface GameState {
    players: MapById<Player>;
    islands: MapById<Island>;
    tasks: MapById<Task>;
    cities: City[];
    kontors: Kontor[];
    producers: Producer[];
    timers: Timers & {simulationSpeed: SimulationSpeed};
}

const takeEveryNth = (n: number) => filter((value, index) => index % n === 0);

export default class Game {
    private store: Store<GameState>;

    private timerId: number = null;
    private readonly myPlayerId: number = 0;
    private readonly keyboardManager: PIXI.keyboard.KeyboardManager;

    constructor(private readonly gameRenderer: GameRenderer, private readonly configLoader: ConfigLoader) {
        this.keyboardManager = PIXI.keyboardManager;
        this.setupHotKeys();
    }

    public async begin(world: World) {
        const initialState: GameState = {
            players: this.mapArrayById(world.players),
            islands: this.mapArrayById(world.islands),
            tasks: this.mapArrayById(world.tasks),
            cities: world.cities,
            kontors: world.kontors,
            producers: world.producers,
            timers: {...world.timers, simulationSpeed: SimulationSpeed.Paused},
        };

        this.store = createStore<GameState, Action<string>, any, never>(
            combineReducers({
                players: this.playerReducer,
                islands: (state: GameState["islands"] = null, action: any) => state,
                timers: this.timerReducer,
                tasks: (state: GameState["tasks"] = null, action: any) => state,
                cities: (state: GameState["cities"] = null, action: any) => state,
                kontors: (state: GameState["kontors"] = null, action: any) => state,
                producers: (state: GameState["producers"] = null, action: any) => state,
            }),
            initialState,
            composeWithDevTools(),
        );

        this.watchSimulationSpeed();
        this.watchTicksForUpkeep();

        this.store.dispatch(createSetSimulationSpeed(SimulationSpeed.Default));

        this.keyboardManager.enable();

        await this.gameRenderer.begin(this.myPlayerId);

        // this.gameRenderer.onMove(viewport => )
    }

    private mapArrayById<T extends {id: number}>(arr: T[]) {
        return arr.reduce((objectMap: {[k: string]: T}, obj: T) => {
            objectMap[obj.id] = obj;
            return objectMap;
        }, {});
    }

    private watchSimulationSpeed() {
        const simulationSpeedWatcher = watch<GameState["timers"]["simulationSpeed"]>(
            this.store.getState,
            "timers.simulationSpeed",
        );
        this.store.subscribe(simulationSpeedWatcher((speed: GameState["timers"]["simulationSpeed"]) => {
            if (this.timerId !== null) {
                clearInterval(this.timerId);
            }
            if (speed !== SimulationSpeed.Paused) {
                this.timerId = setInterval(this.tick.bind(this), 1000 / speed);
            }
        }));
    }

    private watchTicksForUpkeep() {
        const tickWatcher = watch<GameState["timers"]["timeGame"]>(
            this.store.getState,
            "timers.timeGame",
        );

        new Observable((observer) => {
            this.store.subscribe(tickWatcher((tick: GameState["timers"]["timeGame"]) => {
                observer.next(tick);
            }));
        }).pipe(
            takeEveryNth(10),
        ).subscribe(() => {
            const upkeeps = this.calculateUpkeeps();
            for (const playerId of Object.keys(upkeeps)) {
                // This is how Anno 1602 does it, see
                // https://www.annozone.de/Charlie/Cod/numerik.html
                const upkeep = Math.floor(upkeeps[playerId] / 6);

                this.store.dispatch(createPayUpkeep(+playerId, upkeep));
            }
        });
    }

    private calculateUpkeeps() {
        const state = this.store.getState();
        const upkeeps: {[k: string]: number} = Object.keys(state.players)
            .reduce((obj: {[k: string]: number}, id: string) => {
                obj[id] = 0;
                return obj;
            }, {});

        const islands = state.islands;
        const producers = state.producers;
        for (const producer of producers) {
            const island = islands[producer.islandId];
            const field = island.topFields[producer.position.x][producer.position.y];
            const buildingId = field.fieldId;
            const playerId = field.playerId;
            assert(buildingId !== 0xFFFF);
            assert(playerId < 7);
            const fieldConfig = this.configLoader.getFieldData().get(buildingId);
            assert(fieldConfig);

            upkeeps[playerId] += fieldConfig.production.upkeep[producer.active ? "active" : "inactive"];
        }

        return upkeeps;
    }

    private setupHotKeys() {
        const keys = PIXI.keyboard.Key;

        const showTaskKey = keys.F1;
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

        const zoomKeys: Array<{key: Keys, zoom: 1|2|3}> = [
            {key: keys.F2, zoom: 1},
            {key: keys.F3, zoom: 2},
            {key: keys.F4, zoom: 3},
        ];
        for (const zoomKey of zoomKeys) {
            this.keyboardManager.onKeyPressedWithPreventDefault(
                zoomKey.key,
                () => this.gameRenderer.zoom(zoomKey.zoom),
            );
        }

        const speedKeys = [
            {keys: [keys.PAUSE], speed: SimulationSpeed.Paused},
            {keys: [keys.F5], speed: SimulationSpeed.Slow},
            {keys: [keys.F6], speed: SimulationSpeed.Medium},
            {keys: [keys.F7], speed: SimulationSpeed.Fast},
            {keys: [keys.SHIFT, keys.F8], speed: SimulationSpeed.SuperFast},
        ];
        for (const speedKey of speedKeys) {
            this.keyboardManager.onKeysPressedWithPreventDefault(
                speedKey.keys,
                () => this.store.dispatch(createSetSimulationSpeed(speedKey.speed)),
            );
        }
    }

    private tick() {
        this.store.dispatch(createTick());
    }

    private timerReducer(state: GameState["timers"] = null, action: any) {
        switch (action.type) {
            case TICK:
                return {...state, gameTime: ++state.timeGame};
            case SET_SIMULATION_SPEED:
                return {...state, simulationSpeed: action.payload};
            default:
                return state;
        }
    }

    private playerReducer(state: GameState["players"] = null, action: any) {
        switch (action.type) {
            case DONATE_MONEY:
                const payload = action.payload;
                return {
                    ...state,
                    [payload.fromPlayer]: {
                        ...state[payload.fromPlayer], money: state[payload.fromPlayer].money - payload.amount,
                    },
                    [payload.toPlayer]: {
                        ...state[payload.toPlayer], money: state[payload.toPlayer].money + payload.amount,
                    },
                };
            case PAY_UPKEEP:
                const playerId = action.payload.playerId;
                const upkeep = action.payload.upkeep;
                return {
                    ...state,
                    [playerId]: {
                        ...state[playerId], money: state[playerId].money - upkeep,
                    },
                };
            default:
                return state;
        }
    }
}
