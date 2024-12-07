"use client";
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import Modal from '@/app/components/Modal';
import { useI18n } from "@/app/i18n/client";

// Helper function to check if placing a number in a given position is valid
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

// Helper function to generate a complete Sudoku solution
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

// Helper function to generate a Sudoku puzzle from a solution
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

const isRelatedCell = (selectedRow, selectedCol, currentRow, currentCol) => {
  // Same row or same column
  if (selectedRow === currentRow || selectedCol === currentCol) {
    return true;
  }
  // Same 3x3 block
  const blockRow = Math.floor(selectedRow / 3);
  const blockCol = Math.floor(selectedCol / 3);
  const currentBlockRow = Math.floor(currentRow / 3);
  const currentBlockCol = Math.floor(currentCol / 3);
  return blockRow === currentBlockRow && blockCol === currentBlockCol;
};

const SudokuGame = () => {
  const { t } = useI18n();
  
  const [board, setBoard] = useState(Array(9).fill().map(() => Array(9).fill(0)));
  const [solution, setSolution] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [showHints, setShowHints] = useState(false);
  const [difficulty, setDifficulty] = useState(t('easy'));
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [errorCells, setErrorCells] = useState([]);
  const [lastErrorCell, setLastErrorCell] = useState(null);
  
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedCell]);

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
    setHistory([]);     // Reset history
    setErrorCells([]);  // Reset error cells
    setSelectedCell(null);  // Reset selected cell
    setLastErrorCell(null);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCellClick = (row, col) => {
    if (lastErrorCell) {
      // If there is an error cell, only allow selecting that cell
      if (lastErrorCell.row === row && lastErrorCell.col === col) {
        console.log("Error cell selected:", row, col);
        setSelectedCell({ row, col });
      }
    } else if (board[row][col] === 0) {
      console.log("Cell selected:", row, col);
      setSelectedCell({ row, col });
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const lastMove = history[history.length - 1];
      const newBoard = [...board];
      newBoard[lastMove.row][lastMove.col] = lastMove.prevValue;
      setBoard(newBoard);
      setHistory(history.slice(0, -1));
      const newErrorCells = findAllErrorCells(newBoard);
      setErrorCells(newErrorCells);
      
      // If the last move was an error cell, clear lastErrorCell
      if (lastErrorCell && lastErrorCell.row === lastMove.row && lastErrorCell.col === lastMove.col) {
        setLastErrorCell(null);
      }
    }
  };

  const findAllErrorCells = (board) => {
    const errors = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] !== 0 && board[row][col] !== solution[row][col]) {
          errors.push(...findConflictingCells(board, row, col, board[row][col]));
        }
      }
    }
    return errors;
  };

  const handleNumberInput = (number) => {
    if (selectedCell) {
      const { row, col } = selectedCell;
      if (board[row][col] === 0 || (lastErrorCell && lastErrorCell.row === row && lastErrorCell.col === col)) {
        const newBoard = [...board];
        const prevValue = newBoard[row][col];
        newBoard[row][col] = parseInt(number);
        setBoard(newBoard);
        setHistory([...history, { row, col, prevValue: 0, newValue: number }]);
        
        // Cancel hint after filling the blank
        setShowHints(false);
        
        if (parseInt(number) !== solution[row][col]) {
          if (prevValue === 0) {  // Only increase mistake count when a new number is entered
            setMistakes(mistakes + 1);
          }
          const newErrorCells = findAllErrorCells(newBoard);
          setErrorCells(newErrorCells);
          setLastErrorCell({ row, col }); 
          
          if (mistakes + 1 >= 3) {
            setIsRunning(false);
            setModalMessage("gameOver");
            setIsModalOpen(true);
          }
        } else {
          const newErrorCells = findAllErrorCells(newBoard);
          setErrorCells(newErrorCells);
          setLastErrorCell(null);
        }
        
        if (JSON.stringify(newBoard) === JSON.stringify(solution)) {
          setIsRunning(false);
          setModalMessage("congratulations_sudo");
          setIsModalOpen(true);
        }
      }
    }
  };

  const handleInputChange = (event) => {
    const input = event.target.value;
    if (input >= '1' && input <= '9') {
      handleNumberInput(parseInt(input));
    }
    event.target.value = ''; // Clear input field
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

  const findConflictingCells = (board, row, col, num) => {
    const conflictingCells = [];
    
    for (let i = 0; i < 9; i++) {
      if (i !== col && board[row][i] === num) {
        conflictingCells.push({ row, col: i });
      }
    }
    
    for (let i = 0; i < 9; i++) {
      if (i !== row && board[i][col] === num) {
        conflictingCells.push({ row: i, col });
      }
    }
    
    const blockRow = Math.floor(row / 3) * 3;
    const blockCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const currentRow = blockRow + i;
        const currentCol = blockCol + j;
        if ((currentRow !== row || currentCol !== col) && board[currentRow][currentCol] === num) {
          conflictingCells.push({ row: currentRow, col: currentCol });
        }
      }
    }
    
    conflictingCells.push({ row, col });
    return conflictingCells;
  };

  const renderBoard = () => {
    const cellSize = 'w-12 h-12 md:w-16 md:h-16';
    return board.map((row, rowIndex) => (
      <div key={rowIndex} className="flex">
        {row.map((cell, colIndex) => {
          const possibleNumbers = getPossibleNumbers(rowIndex, colIndex);
          const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
          const isRelated = selectedCell && isRelatedCell(selectedCell.row, selectedCell.col, rowIndex, colIndex);
          const isError = errorCells.some(errorCell => errorCell.row === rowIndex && errorCell.col === colIndex);
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`${cellSize} border border-gray-300 flex items-center justify-center cursor-pointer
                ${isSelected ? 'bg-blue-200' : ''}
                ${!isSelected && isRelated ? 'bg-gray-100' : ''}
                ${rowIndex === 0 ? 'border-t-2 border-t-black' : ''}
                ${colIndex === 0 ? 'border-l-2 border-l-black' : ''}
                ${(rowIndex + 1) % 3 === 0 ? 'border-b-2 border-b-black' : ''}
                ${(colIndex + 1) % 3 === 0 ? 'border-r-2 border-r-black' : ''}
                ${board[rowIndex][colIndex] !== 0 && solution[rowIndex][colIndex] === board[rowIndex][colIndex] ? 'text-blue-600' : ''}
                ${isError ? 'bg-red-200 text-red-600' : ''}`}
              onClick={() => handleCellClick(rowIndex, colIndex)}
            >
              {cell !== 0 ? (
                <span className="text-lg">{cell}</span>
              ) : (
                showHints && (
                  <div className="grid grid-cols-3 gap-0 w-full h-full p-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                      <span key={num} className={`flex items-center justify-center text-[8px] md:text-[10px] ${possibleNumbers.includes(num) ? '' : 'invisible'}`}>
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

  const difficulties = {
    [t('easy')]: 65,
    [t('medium')]: 50,
    [t('hard')]: 35,
    [t('expert')]: 20
  };

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="w-full lg:w-4/5 mb-6 lg:mb-0 lg:pr-6 flex flex-col items-center">
        <input
          ref={inputRef}
          type="text"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          onChange={handleInputChange}
        />
        <div className="flex justify-center items-center w-full mb-4 text-sm">
          <div className="flex space-x-4">
            <span>{t('mistakes')}: {mistakes}/3</span>
            <span>{t('time')}: {formatTime(timer)}</span>
          </div>
        </div>
        <div className="overflow-x-auto w-full relative flex justify-center">
          <div className="inline-block min-w-max">
            <div className="mb-4">{renderBoard()}</div>
            <div className="grid grid-cols-9 gap-1 items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num)}
                  className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm sm:text-base md:text-lg font-bold"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="w-full lg:w-1/5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">{t('selectDifficulty')}</h3>
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
            {t('newGame')}
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
            {t('undo')}
          </button>
          <button 
            onClick={toggleHints} 
            className={`flex items-center justify-center px-3 py-2 rounded transition-colors ${
              showHints ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {showHints ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showHints ? t('hideHints') : t('showHints')}
          </button>
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <p>{t(modalMessage)}</p>
      </Modal>
    </div>
  );
};

export default SudokuGame;