declare namespace PIXI {
    namespace keyboard {
        export class KeyboardManager extends PIXI.utils.EventEmitter {
            public isEnabled: boolean;
            constructor();
            public enable(): void;
            public disable(): void;
            public setPreventDefault(key: number, value?: boolean): void;
            public isDown(key: number): boolean;
            public isPressed(key: number): boolean;
            public isReleased(key: number): boolean;
            public update(): void;
            public getHotKey(key: number): HotKey;
            public removeHotKey(key: HotKey): void;
        }

        export class HotKey {
            public key: number;
            public isDown: boolean;
            public isPressed: boolean;
            public isReleased: boolean;
            public ctrl: boolean;
            public shift: boolean;
            public alt: boolean;
            constructor(key: number, manager: KeyboardManager);
            public remove(): void;
        }

        export let Key: {
            BACKSPACE: number;
            TAB: number;
            ENTER: number;
            SHIFT: number;
            PAUSE: number;
            CTRL: number;
            ALT: number;
            CAPS_LOCK: number;
            ESCAPE: number;
            SPACE: number;
            PAGE_UP: number;
            PAGE_DOWN: number;
            END: number;
            HOME: number;
            LEFT: number;
            UP: number;
            RIGHT: number;
            DOWN: number;
            PRINT_SCREEN: number;
            INSERT: number;
            DELETE: number;
            _0: number;
            _1: number;
            _2: number;
            _3: number;
            _4: number;
            _5: number;
            _6: number;
            _7: number;
            _8: number;
            _9: number;
            A: number;
            B: number;
            C: number;
            D: number;
            E: number;
            F: number;
            G: number;
            H: number;
            I: number;
            J: number;
            K: number;
            L: number;
            M: number;
            N: number;
            O: number;
            P: number;
            Q: number;
            R: number;
            S: number;
            T: number;
            U: number;
            V: number;
            W: number;
            X: number;
            Y: number;
            Z: number;
            CMD: number;
            CMD_RIGHT: number;
            NUM_0: number;
            NUM_1: number;
            NUM_2: number;
            NUM_3: number;
            NUM_4: number;
            NUM_5: number;
            NUM_6: number;
            NUM_7: number;
            NUM_8: number;
            NUM_9: number;
            MULTIPLY: number;
            ADD: number;
            SUBTRACT: number;
            DECIMAL_POINT: number;
            DIVIDE: number;
            F1: number;
            F2: number;
            F3: number;
            F4: number;
            F5: number;
            F6: number;
            F7: number;
            F8: number;
            F9: number;
            F10: number;
            F11: number;
            F12: number;
            NUM_LOCK: number;
            SCROLL_LOCK: number;
            SEMI_COLON: number;
            EQUAL: number;
            COMMA: number;
            DASH: number;
            PERIOD: number;
            FORWARD_SLASH: number;
            OPEN_BRACKET: number;
            BLACK_SLASH: number;
            CLOSE_BRACKET: number;
            SINGLE_QUOTE: number;
        };
    }

    export let keyboardManager: keyboard.KeyboardManager;
}

declare module "pixi-keyboard" {
    export default PIXI.keyboard.KeyboardManager;
}
