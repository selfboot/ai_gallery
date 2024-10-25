export const MOVES = {
  U: { axis: 'y', layer: 1, direction: 1 },   // Up
  U_: { axis: 'y', layer: 1, direction: -1 }, // Up Counter-clockwise
  D: { axis: 'y', layer: -1, direction: -1 }, // Down
  D_: { axis: 'y', layer: -1, direction: 1 }, // Down Counter-clockwise
  R: { axis: 'x', layer: 1, direction: 1 },   // Right
  R_: { axis: 'x', layer: 1, direction: -1 }, // Right Counter-clockwise
  L: { axis: 'x', layer: -1, direction: -1 }, // Left
  L_: { axis: 'x', layer: -1, direction: 1 }, // Left Counter-clockwise
  F: { axis: 'z', layer: 1, direction: 1 },   // Front
  F_: { axis: 'z', layer: 1, direction: -1 }, // Front Counter-clockwise
  B: { axis: 'z', layer: -1, direction: -1 }, // Back
  B_: { axis: 'z', layer: -1, direction: 1 }, // Back Counter-clockwise
}

export function generateScramble(moveCount = 20) {
  const moves = Object.keys(MOVES)
  const scramble = []
  let lastAxis = null

  for (let i = 0; i < moveCount; i++) {
    let move
    do {
      move = moves[Math.floor(Math.random() * moves.length)]
    } while (lastAxis === MOVES[move].axis)
    
    scramble.push(move)
    lastAxis = MOVES[move].axis
  }

  return scramble
}

