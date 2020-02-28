# Anno 2018

[![Gitpod Open-Dev-Environment](https://img.shields.io/badge/GitPod-click%20to%20open%20ready%20to%20use%20dev%20environment-blue)](https://gitpod.io/#https://github.com/cmfcmf/Anno2018) 

This is a rewrite of twenty-year-old Anno 1602 using modern techniques, running
entirely in the browser.
My goal is to bring the complete Anno 1602 experience to modern devices.
It uses grahics and configuration of the original game. Due to copyright law,
I cannot include the Anno 1602 graphics with Anno 2018. You need to have a copy of
Anno 1602 installed on your computer to import them into this game.

## Thanks

This would have never been possible without the work of countless Anno enthusiasts:
- [Sir Henry](https://github.com/wzurborg) for their work on different tools around
  the Anno1602 file formats, including decryption of the savegame format.
- [Benedikt Freisen](https://github.com/roybaer) for their work on _mdcii-engine_
  and decoding further Anno1602 file formats.
- The countless forum posts and websites who worked on Anno1602 mods.

## Getting Started

1. Go to http://cmfcmf.github.io/Anno2018/
2. Upload your zipped Anno files
3. Grab a coffee
4. Click on a savegame to start it.

## Contributing / Running Locally

To run this project on your machine, follow the steps outlined in the
[Contributing Guide](CONTRIBUTING.md).

## Roadmap

- [x] Load Anno 1602 savegames
- [x] Render Anno 1602 savegames
- [x] Render static animations (flags, smoke)
- [x] Render tile animations (water, rivers, mill, canon foundry)
- [x] Render ships
- [ ] Building logic
  - [x] Calculate radius
  - [x] Calculate running cost
  - [ ] Visualize radius
  - [ ] Market logic
    - [ ] Calculate storage capactiy
    - [ ] Fetch produced goods
  - [ ] Production building logic
    - [ ] Render worker animations
    - [ ] Fetch raw goods
    - [x] Produce goods
    - [ ] Pause if on fire or manually paused
    - [ ] Building UI
  - [ ] Public building logic
  - [ ] House logic
    - [ ] Tax
    - [ ] Consumption of goods
    - [ ] Level advancement
- [ ] Building things
  - [ ] Draggable streets, walls
  - [ ] Rotateable buildings
- [ ] Shipyard
- [ ] Firefighters, Doctor
- [ ] Ship logic
  - [ ] Movement
  - [ ] Trade Routes
- [ ] Save savegame
- [x] Start randomly generated endless game
- [x] Play Anno 1602 scenarios
- [ ] Trader
- [ ] Pirate
- [ ] Natives
- [ ] Sound
  - [x] Background music
  - [ ] Building sounds
- [ ] Misc
  - [ ] Triumphal arch
  - [ ] Golden monument
  - [ ] Palace
- [ ] Random events
  - [ ] Vulcano
  - [ ] Fire
  - [ ] Plague
  - [ ] Drought
- [ ] Military
  - [ ] Soldiers
  - [ ] Towers
  - [ ] Ship cannons
- [ ] AI
- [ ] Multiplayer
- [ ] Random island generation
- [ ] Increase island and map size
- [ ] Running on Android and iOS

## License

See the LICENSE.md file for further information.
