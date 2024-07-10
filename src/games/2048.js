import { useState, useEffect, useCallback } from "react";
import { Frown, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";

function Tile({ number }) {
  const tileColor = {
    2: { bg: "bg-[#eee4da]", text: "text-black" }, // 浅棕色
    4: { bg: "bg-[#ede0c8]", text: "text-black" }, // 米色
    8: { bg: "bg-[#edcf72]", text: "text-white" }, // 黄色
    16: { bg: "bg-[#edcc61]", text: "text-white" }, // 黄色
    32: { bg: "bg-[#edc850]", text: "text-white" }, // 黄色
    64: { bg: "bg-[#edc53f]", text: "text-white" }, // 黄色
    128: { bg: "bg-[#edc22e]", text: "text-white" }, // 黄色

    256: { bg: "bg-[#f2b179]", text: "text-white" }, // 橙色
    512: { bg: "bg-[#f59563]", text: "text-white" }, // 深橙色
    1024: { bg: "bg-[#f67c5f]", text: "text-white" }, // 赤橙色
    2048: { bg: "bg-[#f65e3b]", text: "text-white" }, // 红橙色
  };

  const defaultBg = "bg-[#cdc1b4]"; // 深灰色背景
  const defaultText = "text-black"; // 默认黑色文字

  const bgClass = tileColor[number] ? tileColor[number].bg : defaultBg;
  const textClass = tileColor[number] ? tileColor[number].text : defaultText;

  return (
    <div
      className={`tile ${bgClass} ${textClass} text-center p-4 rounded shadow-md w-24 h-24 flex items-center justify-center text-3xl font-bold`}
    >
      {number > 0 ? number : ""}
    </div>
  );
}

function Board({ tiles }) {
  return (
    <div className="flex items-center justify-center">
      <div className="grid grid-cols-4 gap-2 p-4 bg-[#bbada0] rounded-lg shadow-xl">
        {tiles.map((row, rowIndex) =>
          row.map((number, colIndex) => <Tile key={`${rowIndex}-${colIndex}`} number={number} />)
        )}
      </div>
    </div>
  );
}

const randomMatrix = () => {
  let newTiles = Array(4)
    .fill(null)
    .map(() => Array(4).fill(0));

  let count = 0;
  while (count < 2) {
    let rowIndex = Math.floor(Math.random() * 4);
    let colIndex = Math.floor(Math.random() * 4);
    if (newTiles[rowIndex][colIndex] === 0) {
      newTiles[rowIndex][colIndex] = 2;
      count++;
    }
  }
  return newTiles;
};

function GameOverModal({ open, onClose, isSuccess }) {
  const { t } = useTranslation();
  if (!open) return null;

  const icon = isSuccess ? <Smile className="text-green-500 text-6xl" /> : <Frown className="text-red-500 text-6xl" />;
  const message = isSuccess ? t("congratulations") : t("game_over");

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-10">
      <div className="bg-white p-4 rounded-lg flex flex-col items-center z-20">
        {icon}
        <p className="text-xl mt-2">{message}</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          {t("restart_game")}
        </button>
      </div>
    </div>
  );
}

function useGameLogic() {
  const [tiles, setTiles] = useState(randomMatrix());
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const checkForWin = useCallback((tiles) => {
    for (let row of tiles) {
      if (row.some((value) => value === 2048)) {
        return true;
      }
    }
    return false;
  }, []);

  const canMove = useCallback((tiles) => {
    for (let r = 0; r < tiles.length; r++) {
      for (let c = 0; c < tiles[r].length; c++) {
        if (tiles[r][c] === 0) return true;
        if (c < tiles[r].length - 1 && tiles[r][c] === tiles[r][c + 1]) return true;
        if (r < tiles.length - 1 && tiles[r][c] === tiles[r + 1][c]) return true;
      }
    }
    return false;
  }, []);

  const addRandomTile = useCallback((tiles) => {
    let empty = [];
    tiles.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === 0) empty.push([r, c]);
      });
    });
    if (empty.length === 0) return;
    let [r, c] = empty[Math.floor(Math.random() * empty.length)];
    tiles[r][c] = Math.random() < 0.9 ? 2 : 4;
  }, []);

  function moveLeft(row) {
    // 2 2 0 2 -> 2 2 2
    let filtered = row.filter((x) => x !== 0); // 去除所有0
    let result = [];

    for (let i = 0; i < filtered.length; i++) {
      if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
        if (i + 2 < filtered.length && filtered[i] === filtered[i + 2]) {
          // 2 2 2 -> 4 2
          result.push(filtered[i + 1] + filtered[i + 2]);
          result.push(filtered[i]);
          i += 2;
        } else {
          // 2 2 -> 4
          result.push(filtered[i] + filtered[i + 1]);
          i++;
        }
      } else {
        result.push(filtered[i]);
      }
    }

    while (result.length < row.length) {
      result.push(0); // 2 4 8 ->  2 4 8 0
    }
    return result;
  }
  
  const transpose = useCallback((matrix) => {
    return matrix[0].map((col, i) => matrix.map((row) => row[i]));
  }, []);

  const moveTiles = useCallback(
    (tiles, direction) => {
      let newTiles = [];

      switch (direction) {
        case "left":
          // remove left for each row
          newTiles = tiles.map((row) => moveLeft(row));
          break;
        case "right":
          // move right: reverse each row, apply moveLeft, then reverse again
          newTiles = tiles.map((row) => moveLeft(row.reverse()).reverse());
          break;
        case "up":
          // move up: transpose matrix, move left, then transpose back
          newTiles = transpose(tiles).map((row) => moveLeft(row));
          newTiles = transpose(newTiles);
          break;
        case "down":
          // move down: transpose matrix, move right, then transpose back
          newTiles = transpose(tiles).map((row) => moveLeft(row.reverse()).reverse());
          newTiles = transpose(newTiles);
          break;
        default:
          break;
      }
      return newTiles;
    },
    [transpose]
  );

  useEffect(() => {
    function handleKeyPress(event) {
      if (!canMove(tiles)) {
        setGameOver(true);
        return;
      }

      const direction = event.key.replace("Arrow", "").toLowerCase();
      // check if the key pressed is a valid direction
      if (!["up", "down", "left", "right"].includes(direction)) {
        return;
      }

      event.preventDefault();
      let newTiles = moveTiles(tiles, direction);

      if (checkForWin(newTiles)) {
        setTiles(newTiles);
        setGameWon(true);
      } else {
        setTiles(newTiles);
        addRandomTile(newTiles);
      }
    }

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [tiles, moveTiles, canMove, addRandomTile, checkForWin]);

  return [tiles, setTiles, gameOver, setGameOver, gameWon, setGameWon];
}

function Game2048() {
  const { t } = useTranslation();

  const [tiles, setTiles, gameOver, setGameOver, gameWon, setGameWon] = useGameLogic();
  const resetGame = () => {
    setTiles(randomMatrix());
    setGameOver(false);
    setGameWon(false);
  };

  const loadPresetWin = () => {
    setTiles([
      [2, 4, 8, 256],
      [4, 64, 16, 512],
      [8, 0, 32, 1024],
      [16, 0, 128, 1024],
    ]);
    setGameOver(false);
    setGameWon(false);
  };

  const loadPresetLose = () => {
    setTiles([
      [2, 4, 16, 4],
      [8, 16, 32, 16],
      [16, 64, 16, 2],
      [2, 16, 2, 32],
    ]);
    setGameOver(false);
    setGameWon(false);
  };

  return (
    <>
      <Board tiles={tiles} />
      <div className="flex justify-center space-x-4 mt-8">
        <button onClick={resetGame} className="px-4 py-2 bg-blue-500 text-white rounded">
          {t("reset")}
        </button>
        <button onClick={loadPresetWin} className="px-4 py-2 bg-green-500 text-white rounded">
          {t("one_step_win")}
        </button>
        <button onClick={loadPresetLose} className="px-4 py-2 bg-red-500 text-white rounded">
          {t("one_step_fail")}
        </button>
      </div>
      <GameOverModal open={gameOver || gameWon} onClose={resetGame} isSuccess={gameWon} />
    </>
  );
}
export default Game2048;
