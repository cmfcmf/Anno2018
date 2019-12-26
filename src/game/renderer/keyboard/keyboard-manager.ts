import { utils } from "pixi.js";

export class KeyboardManager extends utils.EventEmitter {
  private isEnabled = false;
  private _pressedKeys: Set<number> = new Set();
  private _releasedKeys: Set<number> = new Set();
  private _downKeys: Set<number> = new Set();
  private _preventDefaultKeys: Record<number, boolean> = {};

  constructor() {
    super();
  }

  enable() {
    if (!this.isEnabled) {
      this.isEnabled = true;
      this._enableEvents();
    }
  }

  _enableEvents() {
    window.addEventListener("keydown", this._onKeyDown.bind(this), true);
    window.addEventListener("keyup", this._onKeyUp.bind(this), true);
  }

  disable() {
    if (this.isEnabled) {
      this.isEnabled = false;
      this._disableEvents();
    }
  }

  _disableEvents() {
    window.removeEventListener("keydown", this._onKeyDown, true);
    window.removeEventListener("keyup", this._onKeyUp, true);
  }

  setPreventDefault(key: number[] | number, value = true) {
    if (Array.isArray(key)) {
      for (let i = 0; i < key.length; i++) {
        this._preventDefaultKeys[key[i]] = value;
      }
    } else {
      this._preventDefaultKeys[key] = value;
    }
  }

  _onKeyDown(evt: KeyboardEvent) {
    const key = evt.which || evt.keyCode;
    if (this._preventDefaultKeys[key]) {
      evt.preventDefault();
    }

    if (!this.isDown(key)) {
      this._downKeys.add(key);
      this._pressedKeys.add(key);
      this.emit("pressed", key);
    }
  }

  _onKeyUp(evt: KeyboardEvent) {
    const key = evt.which || evt.keyCode;
    if (this._preventDefaultKeys[key]) {
      evt.preventDefault();
    }

    if (this.isDown(key)) {
      this._pressedKeys.delete(key);
      this._releasedKeys.delete(key);
      this._downKeys.delete(key);
      this.emit("released", key);
    }
  }

  onKeyPressedWithPreventDefault(key: number, callback: () => void) {
    this.onKeysPressedWithPreventDefault([key], callback);
  }

  onKeysPressedWithPreventDefault(keys: number[], callback: () => void) {
    this.setPreventDefault(keys);
    this.on("pressed", () => {
      if (keys.every(key => this.isPressed(key))) {
        callback();
      }
    });
  }

  isDown(key: number) {
    return this._downKeys.has(key);
  }

  isPressed(key: number) {
    return this._pressedKeys.has(key);
  }

  isReleased(key: number) {
    return this._releasedKeys.has(key);
  }

  update() {
    for (const key of this._downKeys) {
      this.emit("down", key);
    }

    this._pressedKeys.clear();
    this._releasedKeys.clear();
  }
}
