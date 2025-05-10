// Soma Cube piece definitions
// Each piece is defined as an array of 3D coordinates relative to (0,0,0)
export const SOMA_PIECES = [
  // Piece 1: L shape
  {
    id: 1,
    name: 'L',
    color: '#FF0000',
    blocks: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [2, 1, 0]
    ]
  },
  // Piece 2: T shape
  {
    id: 2,
    name: 'T',
    color: '#00FF00',
    blocks: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [1, 1, 0]
    ]
  },
  // Piece 3: Z shape
  {
    id: 3,
    name: 'Z',
    color: '#0000FF',
    blocks: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [2, 1, 0]
    ]
  },
  // Piece 4: U shape
  {
    id: 4,
    name: 'U',
    color: '#FFFF00',
    blocks: [
      [0, 0, 0],
      [2, 0, 0],
      [0, 1, 0],
      [2, 1, 0]
    ]
  },
  // Piece 5: V shape
  {
    id: 5,
    name: 'V',
    color: '#FF00FF',
    blocks: [
      [0, 0, 0],
      [1, 0, 0],
      [2, 0, 0],
      [0, 1, 0]
    ]
  },
  // Piece 6: W shape
  {
    id: 6,
    name: 'W',
    color: '#00FFFF',
    blocks: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0]
    ]
  },
  // Piece 7: P shape (3 blocks)
  {
    id: 7,
    name: 'P',
    color: '#FFA500',
    blocks: [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0]
    ]
  }
];

// Game constants
export const GRID_SIZE = 3;
export const CELL_SIZE = 1;
export const GRID_COLOR = '#CCCCCC';
export const GRID_OPACITY = 0.3;

// Camera settings
export const CAMERA_SETTINGS = {
  position: [5, 5, 5],
  fov: 75,
  near: 0.1,
  far: 1000
};

// Game state types
export const GAME_STATES = {
  IDLE: 'IDLE',
  SELECTING: 'SELECTING',
  PLACING: 'PLACING',
  COMPLETED: 'COMPLETED'
};
