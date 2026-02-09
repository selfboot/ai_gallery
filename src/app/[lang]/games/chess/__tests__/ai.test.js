import { parseWukongMove, stateToFen } from "../ai";
import { createInitialState } from "../engine";

describe("Wukong AI adapter", () => {
  test("stateToFen should generate wukong start fen", () => {
    const state = createInitialState();
    expect(stateToFen(state)).toBe(
      "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1"
    );
  });

  test("parseWukongMove should convert coordinates", () => {
    expect(parseWukongMove("h2e2")).toEqual({
      from: { row: 7, col: 7 },
      to: { row: 7, col: 4 },
    });
  });

  test("parseWukongMove should reject invalid strings", () => {
    expect(parseWukongMove("abcd")).toBeNull();
    expect(parseWukongMove("z9a0")).toBeNull();
  });
});
