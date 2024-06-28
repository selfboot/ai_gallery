import React, { useState, useEffect, useCallback } from 'react';

const GomokuGame = () => {
  const boardSize = 15;
  const [gameBoard, setGameBoard] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('black');
  const [status, setStatus] = useState('黑方回合');
  const [gameOver, setGameOver] = useState(false);

  const createBoard = useCallback(() => {
    const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
    setGameBoard(newBoard);
  }, [boardSize]);

  const resetGame = useCallback(() => {
    createBoard();
    setCurrentPlayer('black');
    setStatus('黑方回合');
    setGameOver(false);
  }, [createBoard]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);  // 将 resetGame 添加到依赖数组中

  const placePiece = (row, col) => {
    if (gameBoard[row][col] !== '' || gameOver) return;

    const newBoard = [...gameBoard];
    newBoard[row][col] = currentPlayer;
    setGameBoard(newBoard);

    if (checkWin(row, col)) {
      setStatus(`${currentPlayer === 'black' ? '黑' : '白'}方获胜！`);
      setGameOver(true);
    } else {
      setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
      setStatus(`${currentPlayer === 'black' ? '白' : '黑'}方回合`);
    }
  };

  const checkWin = (row, col) => {
    const directions = [
      [1, 0], [0, 1], [1, 1], [1, -1]
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      count += countDirection(row, col, dx, dy);
      count += countDirection(row, col, -dx, -dy);

      if (count >= 5) return true;
    }

    return false;
  };

  const countDirection = (row, col, dx, dy) => {
    let count = 0;
    let x = row + dx;
    let y = col + dy;

    while (x >= 0 && x < boardSize && y >= 0 && y < boardSize && gameBoard[x][y] === currentPlayer) {
      count++;
      x += dx;
      y += dy;
    }

    return count;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">五子棋游戏</h1>
        <div className="inline-block bg-amber-200 p-2 border-2 border-amber-700">
          {gameBoard.map((row, rowIndex) => (
            <div key={rowIndex} className="flex">
              {row.map((cell, colIndex) => (
                <div
                  key={colIndex}
                  className="w-8 h-8 border border-black flex items-center justify-center cursor-pointer"
                  onClick={() => placePiece(rowIndex, colIndex)}
                >
                  {cell && (
                    <div className={`w-7 h-7 rounded-full ${cell === 'black' ? 'bg-black' : 'bg-white'}`} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-4 text-lg">{status}</p>
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={resetGame}
        >
          重新开始
        </button>
      </div>
    </div>
  );
};

export default GomokuGame;
