import { Producer, producerFromSaveGame } from "../world/producer";
import { SimulationSpeed } from "../world/world";
import {
  ADD_MONEY,
  DONATE_MONEY,
  SET_SIMULATION_SPEED,
  TICK,
  UPDATE_PRODUCER
} from "./reducers";

export function createTick() {
  return {
    type: TICK
  };
}

export function createDonateMoney(
  fromPlayer: number,
  toPlayer: number,
  amount: number
) {
  return {
    type: DONATE_MONEY,
    payload: {
      fromPlayer,
      toPlayer,
      amount
    }
  };
}

export function createSetSimulationSpeed(newSpeed: SimulationSpeed) {
  return {
    type: SET_SIMULATION_SPEED,
    payload: newSpeed
  };
}

export function createAddMoney(playerId: number, upkeep: number) {
  return {
    type: ADD_MONEY,
    payload: {
      playerId,
      upkeep
    }
  };
}

export function createUpdateProducer(
  producerId: number,
  patch: Partial<Producer>
) {
  return {
    type: UPDATE_PRODUCER,
    payload: {
      id: producerId,
      patch: patch
    }
  };
}
