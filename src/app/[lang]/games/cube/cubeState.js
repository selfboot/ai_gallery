export class CubeState {
  constructor() {
    this.pieces = this.initializePieces()
    this.rotatingFace = null
    this.rotationAngle = 0
  }

  initializePieces() {
    const pieces = []
    // 创建26个方块（排除中心）
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue
          pieces.push({
            position: [x, y, z],
            rotation: [0, 0, 0],
            index: pieces.length
          })
        }
      }
    }
    return pieces
  }

  getPiecesInFace(face) {
    const axis = face.charAt(0).toLowerCase()
    const direction = face.includes('_') ? -1 : 1
    const layer = face.includes('2') ? 0 : direction

    return this.pieces.filter(piece => {
      const [x, y, z] = piece.position
      switch (axis) {
        case 'x': return x === layer
        case 'y': return y === layer
        case 'z': return z === layer
        default: return false
      }
    })
  }
}

