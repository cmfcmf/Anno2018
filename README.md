# Anno 2018

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

1. Go to http://cmfcmf.github.io/Anno2018-js/
2. Upload your zipped Anno files
3. Grab a coffee
4. Click on a savegame to start it.

## Roadmap

- [x] Load Anno 1602 savegames
- [x] Render Anno 1602 savegames
- [ ] Render static animations (flags, smoke)
- [x] Render tile animations (water, rivers, mill, canon foundry)
- [ ] Render ships
- [ ] Building logic
  - [ ] Render radius
  - [x] Calculate running cost
  - [ ] Market logic
    - [ ] Calculate storage capactiy
    - [ ] Fetch produced goods
  - [ ] Production building logic
    - [ ] Render worker animations
    - [ ] Fetch raw goods
    - [ ] Produce goods
    - [ ] Pause if on fire or manually paused
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

This project is licensed under the AGPLv3 or (at your option) any later version.
See the LICENSE file for further information.

This project includes code based on the [mdcii-engine](https://github.com/roybaer/mdcii-engine) project
by Benedikt Freisen, originally licensed under GPLv2 or later.

This project also includes code based on the [FFmpeg](https://github.com/FFmpeg/FFmpeg) project,
originally licensed under the LGPLv2.1 or later.
