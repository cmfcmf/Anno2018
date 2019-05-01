# Production Buildings

Let's take the woodcutter as an example. Here's the building config:
```
 ;---Försterhaus---;
    @Nummer:    +1
    BASE =      Nummer
    Id:         IDFORST+0
    Gfx:        GFXFARM+0
    Baugfx:     BGFXFARM+0
   	Ruinenr:    RUINE_HOLZ
    Kind:       GEBAEUDE
    Size:       2, 2
    Rotate:     4
    Tuerflg:    1
    NoShotFlg:  1
    Einhoffs:   1.65
    AnimAnz:    4
    AnimAdd:    16
    AnimTime:   TIMENEVER
    Objekt:     HAUS_PRODTYP
      Kind:       PLANTAGE
      Ware:       HOLZ                        ; produced good
      Rohstoff:   BAUM                        ; required good
      Kosten:     KOST_WENIG, KOST_WENIG_SLP  ; production costs and production sleep costs
      Figurnr:    HOLZFAELLER                 ; animation name
      Figuranz:   1                           ; number of animated people per building, however, only 1 will ever be out at once.
      Maxnorohst: 8                           ;
      Arbeiter:	  1                           ; number of people added to the population count
      Rohmenge:   1                           ; number of wood harvested per tree (or number of trees required for 1 wood?)
      Radius:     3                           ; area within which trees are harvested
      Interval:   8                           ; time it takes to convert a harvested tree into wood
      Maxlager:   10                          ; max stock capacity
      LagAniFlg:  1                           ; animate the building based on its capacity
    EndObj;
    Objekt:     HAUS_BAUKOST
      Werkzeug:   2
      Money:      50
    EndObj;
```
and here the `HOLZFAELLER` animation config:
```
    Nummer:     HOLZFAELLER
    Blocknr:    4
    Speed:      220
    Rotate:     8
    Posoffs:    0, 3
    Schatten:   SCHATTEN
    Worktime:   8
    Gfx:        GFXHOLZ

    Objekt:     ANIM

      Nummer:     0
      Kind:       ENDLESS
      AnimOffs:   0
      AnimAdd:    1
      AnimAnz:    8
      AnimSpeed:  85

      Nummer:     1
      Kind:       ENDLESS
      AnimOffs:   64
      AnimAdd:    1
      AnimAnz:    8
      AnimSpeed:  85

      ; This animation is triggered once the woodcutter reaches the tree.
      ; The woodcutter vanishes, instead we hear twelve cutting noises.
      ; Although, probably, only some of them will be played based on
      ; some randomness from `WAV_HACK1, 3, 2`.
      Nummer:     2
      Kind:       JUMPTO
      AnimOffs:   4
      AnimAdd:    0
      AnimAnz:    1
      AnimSpeed:  500
	  AnimRept:	  12					; ACHTUNG: Worktime 500*12 = 6000 ; This comment indicates that it needs to be over before the 8 second worktime are up.
      AnimNr:     3                     ; After 6 seconds, play the next animation (3).
      AnimSmp:    WAV_HACK1, 3, 2

      Nummer:     3
      Kind:       ENDLESS
      AnimOffs:   4
      AnimAdd:    0
      AnimAnz:    1
      AnimSpeed:  5000					; ACHTUNG: Worktime < (500*12 + 5000) ; I'm unsure why exactly this needs to hold true.
      AnimSmp:    WAV_BAUM              ; This takes 2 seconds, therefore the tress has fallen audibly after exactly 8 seconds.

    EndObj;
```

Here's how it works: For each `Figuranz`, the building has one worker who acts on his own. If there is a `Rohstoff`
field within `Radius` of the building, _and no worker is currently outside_, a free worker is sent out to the field
using the `Figurnr` animation. Once he reaches the field, he vanishes for `Animation.Worktime`. He then walks back to
the building and brings home `Rohmenge` trees. Now he starts producing the `Ware` from `Rohstoff` which takes `Interval`
time. After that, the produced good is waiting for pickup.

The `LagAniFlg` denotes that the building's stock is animated, i.e. multiple sprites exist depending on the stock level.

## Animation

1. Walking with goods
2. Walking without goods
3. Harvesting goods
4. Idle Animation

AnimNr = 0 + Kind = ENDLESS -> Animation ended
