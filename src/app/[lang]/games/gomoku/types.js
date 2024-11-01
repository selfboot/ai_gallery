export const PLAYER_COLORS = ['black', 'white'];

export class Player {
  constructor(name, role, color) {
    this.name = name;
    this.role = role;
    this.color = color;
  }

  static fromJSON(json) {
    if (!json) return null;
    return new Player(json.name, json.role, json.color);
  }
}

export class Room {
  constructor(code, status, board, currentTurn, players, spectators, winner) {
    this.code = code;
    this.status = status;
    this.board = board;
    this.currentTurn = currentTurn;
    this.players = {
      black: Player.fromJSON(players.black),
      white: Player.fromJSON(players.white)
    };
    this.spectators = spectators;
    this.winner = winner;
  }

  static fromJSON(json) {
    if (!json) return null;
    return new Room(
      json.code,
      json.status,
      json.board,
      json.current_turn,
      json.players,
      json.spectators,
      json.winner
    );
  }

  // 辅助方法
  isPlayerInRoom(playerName) {
    return (
      (this.players.black && this.players.black.name === playerName) ||
      (this.players.white && this.players.white.name === playerName)
    );
  }

  getPlayerColor(playerName) {
    if (this.players.black && this.players.black.name === playerName) return 'black';
    if (this.players.white && this.players.white.name === playerName) return 'white';
    return null;
  }

  isFull() {
    return this.players.black && this.players.white;
  }
}
