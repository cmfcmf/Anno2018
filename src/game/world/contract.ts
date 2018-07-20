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
    Active = 3,
}

export default class Contract {
    public static fromSaveGame(data: Stream) {
        const contract = new Contract(
            data.read32(),
        );
        data.read32();

        return contract;
    }

    constructor(public readonly state: ContractState) { }
}
