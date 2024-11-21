import { ELEMENTS, SokobanLogic, calculateMapId, decodeMapFromId } from "../gameLogic";
import levels from '../levels.json';

const SYMBOLS = {
  "#": ELEMENTS.WALL,
  "@": ELEMENTS.PLAYER,
  "+": ELEMENTS.PLAYER_ON_TARGET,
  "$": ELEMENTS.BOX,
  "*": ELEMENTS.BOX_ON_TARGET,
  ".": ELEMENTS.TARGET,
  " ": ELEMENTS.FLOOR,
};

// Convert string map to numeric map
const parseMap = (mapString) => {
  return mapString
    .trim()
    .split("\n")
    .map((line) => line.split("").map((char) => SYMBOLS[char]));
};

describe("SokobanLogic - Basic Movement Tests", () => {
  const testCases = [
    {
      name: "Move Right - Valid",
      map: `
  #####
  #@  #
  #####`,
      direction: "RIGHT",
      expectedMap: `
  #####
  # @ #
  #####`,
      expectedMoves: 1,
    },
    {
      name: "Push Box to Target",
      map: `
  #####
  #@$.#
  #####`,
      direction: "RIGHT",
      expectedMap: `
  #####
  # @*#
  #####`,
      expectedMoves: 1,
    },
    {
      name: "Complex Push Scenario",
      map: `
    ####
  ###  ###
  #   $ #
  # #  #$ #
  # . ..@ #
  #########`,
      direction: "LEFT",
      expectedMap: `
    ####
  ###  ###
  #   $ #
  # #  #$ #
  # . .+  #
  #########`,
      expectedMoves: 1,
    },
  ];

  testCases.forEach((testCase) => {
    test(testCase.name, () => {
      const game = new SokobanLogic(1, {
        1: parseMap(testCase.map),
      });
      const result = game.movePlayer(testCase.direction);

      if (testCase.expectedMap === null) {
        expect(result).toBeNull();
      } else {
        expect(result).toEqual(parseMap(testCase.expectedMap));
      }
      expect(game.moves).toBe(testCase.expectedMoves);
    });
  });
});

describe("SokobanLogic - Win Condition Tests", () => {
  const testCases = [
    {
      name: "Win by pushing last box to target",
      map: `
  #####
  #@$.#
  #####`,
      moves: ["RIGHT"],
      expectedIsWon: true,
    },
    {
      name: "Multiple boxes - not won yet",
      map: `
  #######
  #. $ .#
  #  @  #
  # $ $ #
  #######`,
      moves: ["UP", "LEFT"],
      expectedIsWon: false,
    },
    {
      name: "Complete level",
      map: `
  #######
  #. $ .#
  #  @ $#
  #     #
  #######`,
      moves: ["DOWN", "RIGHT", "RIGHT", "UP", "LEFT", "UP", "LEFT", "LEFT"],
      expectedIsWon: true,
    },
  ];

  testCases.forEach((testCase) => {
    test(testCase.name, () => {
      const game = new SokobanLogic(1, {
        1: parseMap(testCase.map),
      });

      testCase.moves.forEach((move) => {
        game.movePlayer(move);
      });

      expect(game.isGameWon()).toBe(testCase.expectedIsWon);
    });
  });
});

describe("SokobanLogic - Invalid Moves Tests", () => {
  const testCases = [
    {
      name: "Cannot push two boxes",
      map: `
  #####
  #@$$#
  #####`,
      direction: "RIGHT",
      shouldMove: false,
    },
    {
      name: "Cannot push box against wall",
      map: `
  #####
  #@$##
  #####`,
      direction: "RIGHT",
      shouldMove: false,
    },
    {
      name: "Cannot move through wall",
      map: `
  #####
  #@#.#
  #####`,
      direction: "RIGHT",
      shouldMove: false,
    },
  ];

  testCases.forEach((testCase) => {
    test(testCase.name, () => {
      const game = new SokobanLogic(1, {
        1: parseMap(testCase.map),
      });
      const result = game.movePlayer(testCase.direction);

      if (!testCase.shouldMove) {
        expect(result).toBeNull();
        expect(game.moves).toBe(0);
        expect(game.map).toEqual(parseMap(testCase.map));
      }
    });
  });
});

describe('Map Encoding/Decoding Tests', () => {
  test('Each map should have unique ID', () => {
    const mapIds = new Set();
    levels.levels.forEach((map, index) => {
      const id = calculateMapId(map);
      expect(mapIds.has(id)).toBe(false);
      mapIds.add(id);
    });
  });

  test('All maps should encode and decode correctly', () => {
    levels.levels.forEach((originalMap, index) => {
      const id = calculateMapId(originalMap);
      const decodedMap = decodeMapFromId(id);
      
      // Ensure decoded map matches original map
      expect(decodedMap).toEqual(originalMap);
      
      // Check map dimensions
      expect(decodedMap.length).toBe(originalMap.length); // Same height
      expect(decodedMap[0].length).toBe(originalMap[0].length); // Same width
    });
  });

  test('Encoded result should be valid base64 string', () => {
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    
    levels.levels.forEach((map, index) => {
      const id = calculateMapId(map);
      expect(base64Regex.test(id)).toBe(true);
    });
  });
});

describe('Map Validation Tests', () => {
  const testCases = [
    {
      name: "Valid simple map",
      map: 
`#####
#@$.#
#####`,
      expected: { isValid: true }
    },
    {
      name: "Valid complex map",
      map:
`#######
#  .  #
# #$# #
#  @  #
#######`,
      expected: { isValid: true }
    },
    {
      name: "Empty map",
      map: ``,
      expected: { isValid: false, error: "empty_map" }
    },
    {
      name: "No player",
      map:
`####
# $.#
#####`,
      expected: { isValid: false, error: "no_player" }
    },
    {
      name: "No box",
      map:
`#####
#@. #
#####`,
      expected: { isValid: false, error: "no_box" }
    },
    {
      name: "No target",
      map:
`#####
#@$ #
#####`,
      expected: { isValid: false, error: "no_target" }
    },
    {
      name: "Too many targets",
      map:
`######
#@$..#
######`,
      expected: { isValid: false, error: "too_many_targets" }
    },
    {
      name: "Wall incomplete - gap on edge",
      map:
`#####
#@$. 
#####`,
      expected: { isValid: false, error: "wall_incomplete" }
    },
    {
      name: "Unreachable elements",
      map:
`#######
#@$.# #
##### #
#   $.#
#######`,
      expected: { isValid: false, error: "unreachable_elements" }
    },
    {
      name: "Valid map with multiple boxes and targets",
      map:
`#########
#  .$.  #
# #@# # #
#  $.$  #
#########`,
      expected: { isValid: true }
    },
    {
      name: "Valid map with player on target",
      map:
`#####
#+$ #
#  $#
#####`,
      expected: { isValid: true }
    },
    {
      name: "Valid map with box on target",
      map:
`#####
#@* #
#  $#
#####`,
      expected: { isValid: true }
    },
    {
      name: "Invalid - box trapped in corner",
      map:
`#####
#@$.#
## ##
#   #
#####`,
      expected: { isValid: true } 
    },
    {
      name: "Invalid - elements outside main area",
      map:
`#######
#@$. ##
#####$.`,
      expected: { isValid: false, error: "unreachable_elements" }
    }
  ];

  testCases.forEach((testCase) => {
    test(testCase.name, () => {
      const game = new SokobanLogic();
      const map = parseMap(testCase.map);
      const result = game.validateMap(map);
      expect(result).toEqual(testCase.expected);
    });
  });
});
