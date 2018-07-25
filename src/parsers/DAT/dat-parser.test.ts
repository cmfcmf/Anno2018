import DATParser from "./dat-parser";

function doTest(input: string, objects: object, variables: object, gfxMap: object) {
    const parser = new DATParser();

    expect(parser.parse(input)).toEqual({
        objects: objects,
        variables: variables,
        gfx_category_map: gfxMap,
    });
}

test("comments and constants", () => {
    doTest(`
        ; This is a comment
        ;======;
        ;;;  ;;; ;$% ;&/%; %;§; ;/ ; /&
            IDSTRAND     =    100
                GFXBODEN   =    300
          GFXHANG   =     GFXBODEN+500
           Nahrung:    1.3
        KOST_BEDARF_3_SLP = 38
          ; Another comment`,
        {},
        {
            IDSTRAND: 100,
            GFXBODEN: 300,
            GFXHANG: 800,
            // TODO: Nahrung
            KOST_BEDARF_3_SLP: 38,
        },
        {},
    );
});

test("json objects", () => {
    doTest(`
        Objekt: BGRUPPE

            Nummer:     0
            Maxwohn:    2              ; A comment
            Steuer:     1.4            ; Another comment

            Nummer:     1
            Maxwohn:    6
            Steuer:     1.6
            Objekt:     BGRUPPE_WARE
              Foo: bar
              Ware:       STOFFE, 0.6       ; ORG/SUN  1.0 / 0.4
              Ware:       ALKOHOL, 0.5      ; ORG/SUN  0.8 / 0.4
            EndObj;`,
        {
            BGRUPPE: {
                items: {
                    0: {
                        Maxwohn: 2,
                        Steuer: 1.4,
                        nested_objects: {},
                    },
                    1: {
                        Maxwohn: 6,
                        Steuer: 1.6,
                        nested_objects: {
                            BGRUPPE_WARE: {
                                0: {
                                    Foo: "bar",
                                    Ware: {
                                        STOFFE: 0.6,
                                        ALKOHOL: 0.5,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }, {
            Foo: "bar",
            Maxwohn: 6,
            Nummer: 1,
            Steuer: 1.6,
            Ware: {ALKOHOL: 0.5},
        },
        {});
});

test("handles @ sign", () => {
    doTest(`
        Objekt: HELLO
            IDSTART = 42
            @Nummer:    0
            Id:         IDSTART+0
            @Nummer:    +1
            @Id:        +1
            @Nummer:    +1
            VARIABLE = Nummer
            @Id:        +1
        EndObj;`,
        {
            HELLO: {
                items: {
                    0: {Id: 42, nested_objects: {}},
                    1: {Id: 43, nested_objects: {}},
                    2: {Id: 44, nested_objects: {}},
                },
            },
        },
        {
            IDSTART: 42,
            VARIABLE: 2,
            Id: 44,
            Nummer: 2,
        },
        {});
});

test("handles size property", () => {
    doTest(`
        Objekt: HELLO
            Nummer:    1
            Id:        1
            Size:      2, 3
        EndObj;`,
        {
            HELLO: {
                items: {
                    1: {Id: 1, Size: {x: 2, y: 3}, nested_objects: {}},
                },
            },
        },
        {
            Nummer: 1,
            Id: 1,
            Size: {x: 2, y: 3},
        },
        {});
});

test("handles ObjFill", () => {
    doTest(`
        Objekt: HELLO
            @Nummer:    0
            NUMMERBASE = Nummer
            A:          5
            B:          6
            Id:         10
            @Nummer:    +1
            ObjFill:    NUMMERBASE
            @Id:        +1
            @Nummer:    +1
            ObjFill:    NUMMERBASE
            @Id:        +1
            A:          7
            @Nummer:    +1
            ObjFill:    NUMMERBASE
            @Id:        +1

        EndObj;
    `,
        {
            HELLO: {
                items: {
                    0: {Id: 10, A: 5, B: 6, nested_objects: {}},
                    1: {Id: 11, A: 5, B: 6, nested_objects: {}},
                    2: {Id: 12, A: 7, B: 6, nested_objects: {}},
                    3: {Id: 13, A: 5, B: 6, nested_objects: {}},
                },
            },
        },
        {
            NUMMERBASE: 0,
            Id: 13,
            Nummer: 3,
            A: 7,
            B: 6,
        },
        {});
});

test("handles ObjFill with nested properties", () => {
    doTest(`
        Objekt: HELLO
            @Nummer:    0
            BASE =      Nummer
            Objekt:     HAUS_PRODTYP
              Bauinfra:	  INFRA_KONTOR_1
              Kosten:     KOST_KONTOR_1, KOST_KONTOR_1
            EndObj;

            @Nummer:    +1
            ObjFill:    BASE
            Objekt:     HAUS_PRODTYP
              Bauinfra:	  INFRA_KONTOR_2
            EndObj;
        EndObj;`,
        {
            HELLO: {
                items: {
                    0: {
                        nested_objects: {
                            HAUS_PRODTYP: {
                                0: {
                                    Bauinfra: "INFRA_KONTOR_1",
                                    Kosten: ["KOST_KONTOR_1", "KOST_KONTOR_1"],
                                },
                            },
                        },
                    },
                    1: {
                        nested_objects: {
                            HAUS_PRODTYP: {
                                0: {
                                    Bauinfra: "INFRA_KONTOR_2",
                                    Kosten: ["KOST_KONTOR_1", "KOST_KONTOR_1"],
                                },
                            },
                        },
                    },
                },
            },
        },
        {
            BASE: 0,
            Bauinfra: "INFRA_KONTOR_2",
            Kosten: ["KOST_KONTOR_1", "KOST_KONTOR_1"],
            Nummer: 1,
        },
        {});
});

test("handles ObjFill max", () => {
    doTest(`
        Objekt: HELLO
            @Nummer:    0
            A:          5
            Id:         10
            Size:       1, 1
            ObjFill:    0,MAXHELLO
            @Nummer:    +1
            NUMMERBASE = Nummer
            B:          6
            @Id:        +1
            @Nummer:    +1
            ObjFill:    NUMMERBASE
            @Id:        +1
            A:          7
            Size:       2, 3
            @Nummer:    +1
            ObjFill:    NUMMERBASE
            @Id:        +1

        EndObj;`,
        {
            HELLO: {
                items: {
                    0: {Id: 10, A: 5,         Size: {x: 1, y: 1}, nested_objects: {}},
                    1: {Id: 11, A: 5, B: 6, Size: {x: 1, y: 1}, nested_objects: {}},
                    2: {Id: 12, A: 7, B: 6, Size: {x: 2, y: 3}, nested_objects: {}},
                    3: {Id: 13, A: 5, B: 6, Size: {x: 1, y: 1}, nested_objects: {}},
                },
            },
        },
        {
            NUMMERBASE: 1,
            Id: 13,
            Nummer: 3,
            A: 7,
            B: 6,
            Size: {x: 2, y: 3},
        },
        {});
});
