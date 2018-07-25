import * as PIXI from "pixi.js";
import {Action, combineReducers, createStore, Store} from "redux";
import {composeWithDevTools} from "redux-devtools-extension";
import watch from "redux-watch";
import GameRenderer from "./game-renderer";
import Player from "./world/player";
import World, {SimulationSpeed} from "./world/world";

type valueof<T> = T[keyof T];
type Keys = valueof<keyof typeof PIXI.keyboard.Key>;

const TICK = "TICK";
const DONATE_MONEY = "DONATE_MONEY";
const SET_SIMULATION_SPEED = "SET_SIMULATION_SPEED";

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

type Plain<T> = {
    [P in keyof T]?: T[P];
};

interface GameState {
    players: Array<Plain<Player>>;
    timers: {
        simulationSpeed: SimulationSpeed,
        gameTime: number,
    };
}

export default class Game {
    private store: Store<GameState>;

    private timerId: number = null;

    constructor(private readonly world: World, private readonly gameRenderer: GameRenderer) { }

    public async begin() {
        await this.gameRenderer.begin();

        const initialState: GameState = {
            timers: {
                simulationSpeed: SimulationSpeed.Paused,
                gameTime: 0,
            },
            players: [
                {id: 0, money: 1000},
                {id: 1, money: 1000},
                {id: 2, money: 1000},
                {id: 3, money: 1000},
            ],
        };

        this.store = createStore<GameState, Action<string>, any, never>(
            combineReducers({
                players: this.playerReducer,
                timers: this.timerReducer,
            }),
            initialState,
            composeWithDevTools(),
        );

        this.watchSimulationSpeed();

        this.setupHotKeys();

        this.store.dispatch(createSetSimulationSpeed(SimulationSpeed.Default));
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

    private setupHotKeys() {
        const keyboardManager = PIXI.keyboardManager;
        const keys = PIXI.keyboard.Key;

        const speedKeys = [
            {key: keys.PAUSE, speed: SimulationSpeed.Paused},
            {key: keys.F5, speed: SimulationSpeed.Slow},
            {key: keys.F6, speed: SimulationSpeed.Medium},
            {key: keys.F7, speed: SimulationSpeed.Fast},
            {key: keys.F8, speed: SimulationSpeed.SuperFast},
        ];
        for (const speedKey of speedKeys) {
            keyboardManager.setPreventDefault(speedKey.key);
            keyboardManager.on("pressed", (key: Keys) => {
                if (key === speedKey.key) {
                    this.store.dispatch(createSetSimulationSpeed(speedKey.speed));
                }
            });
        }

        keyboardManager.enable();
    }

    private tick() {
        console.debug("tick");
        this.store.dispatch(createTick());
    }

    private timerReducer(state: GameState["timers"] = null, action: any) {
        switch (action.type) {
            case TICK:
                return {...state, gameTime: ++state.gameTime};
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
                return state.map((player) => {
                    if (player.id === payload.fromPlayer) {
                        return {...player, money: player.money - payload.amount};
                    } else if (player.id === payload.toPlayer) {
                        return {...player, money: player.money + payload.amount};
                    }
                    return player;
                });
            default:
                return state;
        }
    }
}
