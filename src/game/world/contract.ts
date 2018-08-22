/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import Stream from "../../parsers/stream";

export enum ContractState {
  Inactive = 0,
  OfferedByMe = 1,
  OfferedByOther = 2,
  Active = 3
}

export default class Contract {
  public static fromSaveGame(data: Stream) {
    const state = data.read32();
    const time = data.read32(); // unsure

    return new Contract(state, time);
  }

  constructor(
    public readonly state: ContractState,
    public readonly time: number
  ) {}
}
