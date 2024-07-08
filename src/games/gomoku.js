import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';

const GomokuGame = () => {
  const { t } = useTranslation();
  const boardSize = 20;
  const [gameBoard, setGameBoard] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('black');
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const createBoard = useCallback(() => {
    const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
    setGameBoard(newBoard);
  }, [boardSize]);

  const resetGame = useCallback(() => {
    createBoard();
    setCurrentPlayer('black');
    setStatus(t('black_turn'));
    setGameOver(false);
  }, [createBoard, t]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);  // 将 resetGame 添加到依赖数组中

  const placePiece = (row, col) => {
    if (gameBoard[row][col] !== '' || gameOver) return;

    const newBoard = [...gameBoard];
    newBoard[row][col] = currentPlayer;
    setGameBoard(newBoard);

    if (checkWin(row, col)) {
      setStatus(currentPlayer === 'black' ? t('black_win') : t('white_win'));
      setGameOver(true);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    } else {
      setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
      setStatus(currentPlayer === 'black' ? t('white_turn') : t('black_turn'));
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

    <div className="flex flex-col items-center bg-gray-100">
      <div className="text-center">
      <p className="text-lg mb-4 font-bold">{status}</p>
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
        <div>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={resetGame}
          >
            {t('restart_game')}
          </button>
        </div>

      </div>
      {showCelebration && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <FontAwesomeIcon icon={faTrophy} className="text-yellow-400 text-6xl" />
            <p className="text-xl font-bold mt-2">{status}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GomokuGame;
