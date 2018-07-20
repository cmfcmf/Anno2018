/*
 * The savegame data structure was reverse-engineered by Benedikt Freisen
 * as part of the 'mdcii-engine' project and released under GPLv2+.
 * https://github.com/roybaer/mdcii-engine
 */

import {PlayerMap} from "../../parsers/GAM/gam-parser";
import Stream from "../../parsers/stream";
import Field from "./field";
import Player from "./player";
import Ship from "./ship";
import {Rotation8} from "./world";

export enum SoldierType {
    Swordsman = 0,
    Cavalry = 1,
    Musketeer = 2,
    Gunner = 3,
    Native = 8,
}

export default class Soldier {
    public static fromSaveGame(data: Stream, players: PlayerMap) {
        const x = data.read16() / 2;
        const y = data.read16() / 2;
        const hp = data.read16();
        const type = data.read16();
        const id = data.read16();
        const course1 = data.read(4);
        const _1 = data.read16();
        const _2 = data.read16();
        const _3 = data.read8();
        const _4 = data.read8();
        const _5 = data.read32();
        const playerId = data.read8();
        const _6 = data.read8();
        const _7 = data.read8();
        const rotation = data.read8() as Rotation8;
        const _8 = data.read8();
        const isPatrolling = data.read8Bool();
        const course2 = data.read(4);
        const course3 = data.read(4);
        const empty = data.read(30);

        const player = players.get(playerId);
        const soldier = new Soldier(
            id,
            player,
            type,
            new PIXI.Point(x, y),
            rotation,
            isPatrolling,
            hp,
        );
        player.soldiers.push(soldier);
        return soldier;
    }

    private patrollingPoints: [PIXI.Point, PIXI.Point];

    constructor(
        public readonly id: number,
        public readonly player: Player,

        public readonly type: SoldierType,

        public position: PIXI.Point,
        public rotation: Rotation8,
        private isPatrolling: boolean,

        public hp: number,
    ) { }

    public moveTo(position: PIXI.Point): boolean {
        const path = this.pathFindTo(position);
        if (path === false) {
            return false;
        }

        // TODO: Start movement.

        return true;
    }

    public attack(entity: Field|Soldier|Ship) {
        // Make sure you can't attack your own units.
        console.assert(entity.player !== this.player);
        // TODO
    }

    public takeDamage(damage: number) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.die();
        }
    }

    public setPatrollingPoints(otherPoint: PIXI.Point) {
        console.assert(otherPoint !== this.position);
        this.patrollingPoints = [
            this.position,
            otherPoint,
        ];
    }

    public startPatrolling() {
        if (this.patrollingPoints[0] !== this.patrollingPoints[1]) {
            this.isPatrolling = true;
        } else {
            // TODO: Error
        }
    }

    /**
     * Finds a path from the current position to the given point.
     * @param {PIXI.Point} position
     * @returns {false | Array<PIXI.Point>}
     */
    private pathFindTo(position: PIXI.Point): false|PIXI.Point[] {
        // TODO
        return false;
    }

    private die() {
        // TODO
    }
}
