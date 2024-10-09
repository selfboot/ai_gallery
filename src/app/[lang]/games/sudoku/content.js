"use client";
import React, { useState, useEffect } from 'react';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';

// 辅助函数：检查在给定位置放置数字是否有效
const isValid = (board, row, col, num) => {
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num || board[x][col] === num) return false;
  }
  
  let boxRow = Math.floor(row / 3) * 3;
  let boxCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[boxRow + i][boxCol + j] === num) return false;
    }
  }
  
  return true;
};

// 生成完整的数独解
const generateSolution = (board) => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        for (let num = 1; num <= 9; num++) {
          if (isValid(board, row, col, num)) {
            board[row][col] = num;
            if (generateSolution(board)) {
              return true;
            }
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

// 从解中移除数字来创建谜题
const generatePuzzle = (solution, difficulty = 40) => {
  let puzzle = JSON.parse(JSON.stringify(solution));
  let positions = Array(81).fill().map((_, idx) => idx);
  
  while (positions.length > difficulty) {
    let index = Math.floor(Math.random() * positions.length);
    let position = positions[index];
    let row = Math.floor(position / 9);
    let col = position % 9;
    
    positions.splice(index, 1);
    puzzle[row][col] = 0;
  }
  
  return puzzle;
};

const difficulties = {
  简单: 65,
  中等: 50,
  困难: 35,
  专家: 20
};

const SudokuGame = () => {
  const [board, setBoard] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [difficulty, setDifficulty] = useState('简单');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    initializeGame();
  }, [difficulty]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const initializeGame = () => {
    let newSolution = Array(9).fill().map(() => Array(9).fill(0));
    generateSolution(newSolution);
    setSolution(newSolution);
    let newPuzzle = generatePuzzle(newSolution, difficulties[difficulty]);
    setBoard(newPuzzle);
    setMistakes(0);
    setTimer(0);
    setIsRunning(true);
    setShowHints(false);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCellClick = (row, col) => {
    if (board[row][col] === 0) {
      setSelectedCell({ row, col });
    }
  };

  const handleNumberInput = (number) => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      if (board[row][col] === 0) {
        const newBoard = [...board];
        newBoard[row][col] = number;
        setBoard(newBoard);
        
        // 记录这次操作
        setHistory([...history, { row, col, prevValue: 0, newValue: number }]);
        
        if (number !== solution[row][col]) {
          setMistakes(mistakes + 1);
          if (mistakes + 1 >= 3) {
            setIsRunning(false);
            alert("游戏结束！错误次数超过3次。");
          }
        }
        
        if (JSON.stringify(newBoard) === JSON.stringify(solution)) {
          setIsRunning(false);
          alert("恭喜！你已经完成了数独谜题！");
        }
      }
    }
  };

  const getPossibleNumbers = (row, col) => {
    if (board[row][col] !== 0) return [];
    let possible = [];
    for (let num = 1; num <= 9; num++) {
      if (isValid(board, row, col, num)) {
        possible.push(num);
      }
    }
    return possible;
  };

  const toggleHints = () => {
    setShowHints(!showHints);
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const lastAction = history[history.length - 1];
      const newBoard = [...board];
      newBoard[lastAction.row][lastAction.col] = lastAction.prevValue;
      setBoard(newBoard);
      setHistory(history.slice(0, -1));
      
      // 如果撤销的是错误的操作，减少错误计数
      if (lastAction.newValue !== solution[lastAction.row][lastAction.col]) {
        setMistakes(mistakes - 1);
      }
    }
  };

  const renderBoard = () => {
    return board.map((row, rowIndex) => (
      <div key={rowIndex} className="flex">
        {row.map((cell, colIndex) => {
          const possibleNumbers = getPossibleNumbers(rowIndex, colIndex);
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`w-12 h-12 border border-gray-300 flex items-center justify-center cursor-pointer
                ${selectedCell?.row === rowIndex && selectedCell?.col === colIndex ? 'bg-blue-200' : ''}
                ${(rowIndex + 1) % 3 === 0 ? 'border-b-2 border-b-black' : ''}
                ${(colIndex + 1) % 3 === 0 ? 'border-r-2 border-r-black' : ''}
                ${board[rowIndex][colIndex] !== 0 && solution[rowIndex][colIndex] === board[rowIndex][colIndex] ? 'text-blue-600' : ''}
                ${board[rowIndex][colIndex] !== 0 && solution[rowIndex][colIndex] !== board[rowIndex][colIndex] ? 'text-red-600' : ''}`}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            >
              {cell !== 0 ? (
                <span className="text-lg">{cell}</span>
              ) : (
                showHints && (
                  <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <span key={num} className={`flex items-center justify-center text-[8px] ${possibleNumbers.includes(num) ? '' : 'invisible'}`}>
                        {num}
                      </span>
                    ))}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="flex flex-col md:flex-row">
      <div className="md:w-4/5 mb-6 md:mb-0 md:pr-6 flex flex-col items-center">
        <div className="flex justify-between w-full mb-4 text-sm">
          <span>{difficulty}</span>
          <span>错误: {mistakes}/3</span>
          <span>{formatTime(timer)}</span>
        </div>
        <div className="mb-4">{renderBoard()}</div>
        <div className="grid grid-cols-9 gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              onClick={() => handleNumberInput(num)} 
              className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-lg font-bold"
            >
              {num}
            </button>
          ))}
        </div>
      </div>
      
      <div className="md:w-1/5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">难度选择</h3>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {Object.keys(difficulties).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-2">
          <button onClick={initializeGame} className="flex items-center justify-center px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
            <RefreshCw className="w-4 h-4 mr-1" />
            新游戏
          </button>
          <button
            onClick={handleUndo}
            className="flex items-center justify-center px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            disabled={history.length === 0}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 9H16.5C18.9853 9 21 11.0147 21 13.5C21 15.9853 18.9853 18 16.5 18H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 5L3 9L7 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            撤销
          </button>
          <button onClick={toggleHints} className="flex items-center justify-center px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors">
            {showHints ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showHints ? '隐藏提示' : '显示提示'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SudokuGame;