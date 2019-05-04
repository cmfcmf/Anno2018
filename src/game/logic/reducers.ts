import { Map } from "immutable";
import { defaultTimers, GameState } from "../game";

export const TICK = "TICK";
export const DONATE_MONEY = "DONATE_MONEY";
export const SET_SIMULATION_SPEED = "SET_SIMULATION_SPEED";
export const ADD_MONEY = "ADD_MONEY";
export const UPDATE_PRODUCER = "UPDATE_PRODUCER";

function inc(
  counter: number,
  max: number,
  interval: number = 10,
  gameTime: number = 0
) {
  if (gameTime % interval !== 0) {
    return counter;
  }
  counter++;
  if (counter >= max) {
    counter = 0;
  }
  return counter;
}

export function timerReducer(
  state: GameState["timers"] = defaultTimers,
  action: any
): GameState["timers"] {
  switch (action.type) {
    case TICK:
      const newTimeGame = state.timeGame + 1;
      return {
        ...state,
        timeGame: newTimeGame,
        cntCity: inc(state.cntCity, 8, 100, newTimeGame),
        cntIsland: inc(state.cntIsland, 8, 100, newTimeGame),
        cntShipyard: inc(state.cntShipyard, 8, 10, newTimeGame),
        cntMilitary: inc(state.cntMilitary, 8, 10, newTimeGame),
        cntProduction: inc(state.cntProduction, 8, 10, newTimeGame)
      };
    case SET_SIMULATION_SPEED:
      return { ...state, simulationSpeed: action.payload };
    default:
      return state;
  }
}

export function playerReducer(
  state: GameState["players"] = {},
  action: any
): GameState["players"] {
  switch (action.type) {
    case DONATE_MONEY:
      const payload = action.payload;
      return {
        ...state,
        [payload.fromPlayer]: {
          ...state[payload.fromPlayer],
          money: state[payload.fromPlayer].money - payload.amount
        },
        [payload.toPlayer]: {
          ...state[payload.toPlayer],
          money: state[payload.toPlayer].money + payload.amount
        }
      };
    case ADD_MONEY:
      const playerId = action.payload.playerId;
      const money = action.payload.money;
      return {
        ...state,
        [playerId]: {
          ...state[playerId],
          money: state[playerId].money + money
        }
      };
    default:
      return state;
  }
}

export function producerReducer(
  state: GameState["producers"] = Map(),
  action: any
): GameState["producers"] {
  switch (action.type) {
    case UPDATE_PRODUCER:
      const { id, patch } = action.payload;
      return state.mergeIn([id], patch);
    default:
      return state;
  }
}
