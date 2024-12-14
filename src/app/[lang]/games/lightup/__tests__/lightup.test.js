import { GameState, CellFlags, listLigths, setLight, placeNumbers } from "../lightup";

describe("Test listLigths", () => {
  test("Empty board center light", () => {
    const state = new GameState(5, 5);
    const data = listLigths(state, 2, 2, true);

    expect(data).toEqual({
      ox: 2,
      oy: 2,
      minx: 0,
      maxx: 4,
      miny: 0,
      maxy: 4,
      includeOrigin: true,
    });
  });

  test("Light blocked by black blocks", () => {
    const state = new GameState(5, 5);
    state.flags[2 * 5 + 1] |= CellFlags.BLACK; // (1,2)
    state.flags[1 * 5 + 2] |= CellFlags.BLACK; // (2,1)
    state.flags[2 * 5 + 3] |= CellFlags.BLACK; // (3,2)
    state.flags[3 * 5 + 2] |= CellFlags.BLACK; // (2,3)

    const data = listLigths(state, 2, 2, true);
    expect(data).toEqual({
      ox: 2,
      oy: 2,
      minx: 2, // Left blocked by (1,2)
      maxx: 2, // Right blocked by (3,2)
      miny: 2, // Top blocked by (2,1)
      maxy: 2, // Bottom blocked by (2,3)
      includeOrigin: true,
    });
  });

  test("Light at the edge", () => {
    const state = new GameState(5, 5);
    const data = listLigths(state, 0, 0, true);

    expect(data).toEqual({
      ox: 0,
      oy: 0,
      minx: 0,
      maxx: 4, // Can light up to the right edge
      miny: 0,
      maxy: 4, // Can light up to the bottom edge
      includeOrigin: true,
    });
  });

  test("Light blocked by a black block", () => {
    const state = new GameState(5, 5);
    state.flags[2 * 5 + 2] |= CellFlags.BLACK; // (2,2)
    const data = listLigths(state, 0, 2, true);
    expect(data).toEqual({
      ox: 0,
      oy: 2,
      minx: 0,
      maxx: 1, // Blocked by (2,2)
      miny: 0,
      maxy: 4,
      includeOrigin: true,
    });
  });

  test("includeOrigin parameter test", () => {
    const state = new GameState(5, 5);
    const data1 = listLigths(state, 2, 2, true);
    const data2 = listLigths(state, 2, 2, false);

    expect(data1.includeOrigin).toBe(true);
    expect(data2.includeOrigin).toBe(false);
  });
});

describe("setLight", () => {
  test("Place one light, check the lighting range", () => {
    const state = new GameState(5, 5);
    setLight(state, 2, 2, true);

    // Check each cell in the cross-shaped lighting range
    expect(state.lights[2 * 5 + 0]).toBe(1); // (0,2)
    expect(state.lights[2 * 5 + 1]).toBe(1); // (1,2)
    expect(state.lights[2 * 5 + 2]).toBe(1); // (2,2)
    expect(state.lights[2 * 5 + 3]).toBe(1); // (3,2)
    expect(state.lights[2 * 5 + 4]).toBe(1); // (4,2)

    expect(state.lights[0 * 5 + 2]).toBe(1); // (2,0)
    expect(state.lights[1 * 5 + 2]).toBe(1); // (2,1)
    expect(state.lights[3 * 5 + 2]).toBe(1); // (2,3)
    expect(state.lights[4 * 5 + 2]).toBe(1); // (2,4)

    // Check light flag
    expect(state.flags[2 * 5 + 2] & CellFlags.LIGHT).toBeTruthy();
  });

  test("Place light blocked by black blocks", () => {
    const state = new GameState(5, 5);
    state.flags[2 * 5 + 1] |= CellFlags.BLACK; // (1,2)
    state.flags[1 * 5 + 2] |= CellFlags.BLACK; // (2,1)

    setLight(state, 2, 2, true);

    // Check the lighting range blocked by black blocks
    expect(state.lights[2 * 5 + 0]).toBe(0); // (0,2) blocked
    expect(state.lights[2 * 5 + 1]).toBe(0); // (1,2) black block
    expect(state.lights[2 * 5 + 2]).toBe(1); // (2,2) light position
    expect(state.lights[2 * 5 + 3]).toBe(1); // (3,2)
    expect(state.lights[2 * 5 + 4]).toBe(1); // (4,2)

    expect(state.lights[0 * 5 + 2]).toBe(0); // (2,0) blocked
    expect(state.lights[1 * 5 + 2]).toBe(0); // (2,1) black block
  });

  test("Remove light, check lighting value decrease", () => {
    const state = new GameState(5, 5);
    setLight(state, 2, 2, true);
    setLight(state, 2, 2, false);

    // Check all cells lighting value should be 0
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        expect(state.lights[y * 5 + x]).toBe(0);
      }
    }

    // Check light flag removed
    expect(state.flags[2 * 5 + 2] & CellFlags.LIGHT).toBeFalsy();
  });

  test("Overlapping lights lighting value superposition", () => {
    const state = new GameState(5, 5);
    setLight(state, 1, 2, true); // First light
    setLight(state, 3, 2, true); // Second light

    // The cell (2,2) should be lit twice
    expect(state.lights[2 * 5 + 2]).toBe(2);
  });

  test("Cannot place light on black block", () => {
    const state = new GameState(5, 5);
    state.flags[2 * 5 + 2] |= CellFlags.BLACK; // Set black block

    expect(() => {
      setLight(state, 2, 2, true);
    }).toThrow();
  });

  test("Complex scene: two walls and multiple lights", () => {
    const state = new GameState(4, 4);
    state.flags[1 * 4 + 1] |= CellFlags.BLACK; // (1,1)
    state.flags[2 * 4 + 2] |= CellFlags.BLACK; // (2,2)

    // Place lights on all non-black cells
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const index = y * 4 + x;
        if (!(state.flags[index] & CellFlags.BLACK)) {
          setLight(state, x, y, true);
        }
      }
    }
    // debugPrintState(state);

    // Check each cell lighting value is correct
    const expectedLights = [
      [7, 4, 5, 7],
      [4, 0, 3, 5],
      [5, 3, 0, 4],
      [7, 5, 4, 7],
    ];

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(state.lights[y * 4 + x]).toBe(expectedLights[y][x]);
      }
    }

    expect(state.flags[1 * 4 + 1] & CellFlags.BLACK).toBeTruthy();
    expect(state.flags[2 * 4 + 2] & CellFlags.BLACK).toBeTruthy();

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const index = y * 4 + x;
        if (!(state.flags[index] & CellFlags.BLACK)) {
          expect(state.flags[index] & CellFlags.LIGHT).toBeTruthy();
        }
      }
    }
  });
});

describe("placeNumbers", () => {
  test("Count lights around black block", () => {
    const state = new GameState(5, 5);
    state.flags[2 * 5 + 2] |= CellFlags.BLACK;
    setLight(state, 1, 2, true); // Left
    setLight(state, 3, 2, true); // Right
    setLight(state, 2, 1, true); // Top
    setLight(state, 2, 3, true); // Bottom
    placeNumbers(state);
    expect(state.flags[2 * 5 + 2] & CellFlags.NUMBERED).toBeTruthy();
  });

  test("Count partial lights around black block", () => {
    const state = new GameState(5, 5);
    state.flags[2 * 5 + 2] |= CellFlags.BLACK;
    setLight(state, 1, 2, true); // Left
    setLight(state, 2, 1, true); // Top
    placeNumbers(state);
    expect(state.lights[2 * 5 + 2]).toBe(2);
    expect(state.flags[2 * 5 + 2] & CellFlags.NUMBERED).toBeTruthy();
  });

  test("Black block at edge", () => {
    const state = new GameState(5, 5);
    state.flags[0 * 5 + 0] |= CellFlags.BLACK; // Top-left corner
    setLight(state, 1, 0, true); // Right
    setLight(state, 0, 1, true); // Bottom
    placeNumbers(state);
    expect(state.lights[0]).toBe(2);
    expect(state.flags[0] & CellFlags.NUMBERED).toBeTruthy();
  });

  test("Multiple black blocks", () => {
    const state = new GameState(3, 3);
    state.flags[0 * 3 + 0] |= CellFlags.BLACK; // (0,0)
    state.flags[2 * 3 + 2] |= CellFlags.BLACK; // (2,2)
    setLight(state, 1, 0, true); // Light between blocks
    setLight(state, 1, 2, true); // Another light

    placeNumbers(state);
    expect(state.lights[0]).toBe(1);
    expect(state.lights[2 * 3 + 2]).toBe(1);
    expect(state.flags[0] & CellFlags.NUMBERED).toBeTruthy();
    expect(state.flags[2 * 3 + 2] & CellFlags.NUMBERED).toBeTruthy();
  });

  test("No lights around black block", () => {
    const state = new GameState(5, 5);
    state.flags[2 * 5 + 2] |= CellFlags.BLACK;
    placeNumbers(state);
    expect(state.lights[2 * 5 + 2]).toBe(0);
    expect(state.flags[2 * 5 + 2] & CellFlags.NUMBERED).toBeTruthy();
  });
});
