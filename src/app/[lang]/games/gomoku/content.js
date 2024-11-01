"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/app/i18n/client";
import Modal from "@/app/components/Modal";
import { checkWin, checkDoubleThree, checkOverline, checkDoubleFours, boardSize } from "./move";
import { CustomListbox } from "@/app/components/ListBox";
import { useSearchParams } from "next/navigation";
import usePersistentState from '@/app/components/PersistentState';
import { useErrorHandler } from '@/app/components/ErrorHandler';
import { fetchWithError} from '@/app/utils/api';
import { Room } from './types';
import { ApiError } from '@/app/utils/api';
const GomokuGame = () => {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [gameBoard, setGameBoard] = useState(() =>
    Array(boardSize)
      .fill()
      .map(() => Array(boardSize).fill(''))
  );
  const [currentPlayer, setCurrentPlayer] = useState('black');
  const [status, setStatus] = useState(() => t('black_turn'));
  const [gameOver, setGameOver] = useState(false);
  const [firstMove, setFirstMove] = useState('black');
  const [hoverPosition, setHoverPosition] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [undoCount, setUndoCount] = useState({ black: 3, white: 3 });
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [forbiddenPositions, setForbiddenPositions] = useState([]);
  const [forbiddenRules, setForbiddenRules] = useState(['noRestriction']);
  const [gameMode, setGameMode] = useState('local');
  const [roomId, setRoomId] = useState(null);
  const [roomStatus, setRoomStatus] = useState({
    players: 0,
    spectators: 0,
    started: false,
  });
  const [playerName, setPlayerName] = usePersistentState('gomoku_player_name', null, 7 * 24 * 60 * 60 * 1000);
  const [savedRoomId, setSavedRoomId, clearSavedRoomId] = usePersistentState(
    'gomoku_room',
    null,
    7 * 24 * 60 * 60 * 1000
  );
  const [playerColor, setPlayerColor] = useState(null);
  const { handleError, errorModal } = useErrorHandler();
  const [ws, setWs] = useState(null);

  const resetGame = useCallback(() => {
    setGameBoard(
      Array(boardSize)
        .fill()
        .map(() => Array(boardSize).fill(''))
    );
    setCurrentPlayer(firstMove);
    setStatus(firstMove === 'black' ? t('black_turn') : t('white_turn'));
    setGameOver(false);
    setMoveHistory([]);
    setUndoCount({ black: 3, white: 3 });
  }, [t, boardSize, firstMove]);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    const room = searchParams.get('room');
    if (room) {
      setGameMode('online');
      setRoomId(room);
      initWebSocket(room);
    }
  }, []);

  const handleFirstMoveChange = (value) => {
    setFirstMove(value === t('black') ? 'black' : 'white');
  };

  const placePiece = (row, col) => {
    if (gameBoard[row][col] !== '' || gameOver) return;

    if (gameMode === 'online' && currentPlayer !== playerColor) return;

    const newBoard = [...gameBoard];
    newBoard[row][col] = currentPlayer;

    if (currentPlayer === firstMove && forbiddenRules.length > 0 && !forbiddenRules.includes('noRestriction')) {
      if (forbiddenRules.includes('threeThree')) {
        const { isForbidden, forbiddenPositions } = checkDoubleThree(newBoard, row, col, currentPlayer);
        if (isForbidden) {
          setForbiddenPositions(forbiddenPositions);
          setModalMessage(t('three_three_forbidden', { player: t(currentPlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }

      if (forbiddenRules.includes('longConnection')) {
        const overlines = checkOverline(newBoard, row, col, currentPlayer);
        if (overlines.length > 0) {
          setForbiddenPositions(overlines.flat());
          setModalMessage(t('long_connection_forbidden', { player: t(currentPlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }

      if (forbiddenRules.includes('fourFour')) {
        const { isDoubleFour, forbiddenPositions } = checkDoubleFours(newBoard, row, col, currentPlayer);
        if (isDoubleFour) {
          setForbiddenPositions(forbiddenPositions);
          setModalMessage(t('four_four_forbidden', { player: t(currentPlayer) }));
          setShowModal(true);
          setGameOver(true);
          return;
        }
      }
    }

    setGameBoard(newBoard);
    setMoveHistory([...moveHistory, { row, col, player: currentPlayer }]);
    setForbiddenPositions([]);

    if (gameMode === 'online') {
      fetch(`https://api.selfboot.cn/gomoku/rooms/${roomId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ row, col }),
      });
    }

    if (checkWin(gameBoard, row, col, currentPlayer)) {
      const winMessage = currentPlayer === 'black' ? t('black_win') : t('white_win');
      setModalMessage(winMessage);
      setShowModal(true);
      setGameOver(true);
    } else {
      setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
      setStatus(currentPlayer === 'black' ? t('white_turn') : t('black_turn'));
    }
  };

  const renderIntersection = (row, col) => {
    const stone = gameBoard[row][col];
    const isSpecialPoint =
      (row === 3 && col === 3) ||
      (row === 3 && col === 11) ||
      (row === 7 && col === 7) ||
      (row === 11 && col === 3) ||
      (row === 11 && col === 11);
    const isHovered = hoverPosition && hoverPosition.row === row && hoverPosition.col === col;
    const isForbidden = forbiddenPositions.some(([r, c]) => r === row && c === col);

    return (
      <div
        key={`${row}-${col}`}
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${((col + 1) * 100) / 16}%`,
          top: `${((row + 1) * 100) / 16}%`,
          width: `${100 / 16}%`,
          height: `${100 / 16}%`,
        }}
        onMouseEnter={() => setHoverPosition({ row, col })}
        onMouseLeave={() => setHoverPosition(null)}
      >
        {stone && (
          <div
            className={`rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] ${
              stone === 'black' ? 'bg-black' : 'bg-white border border-black'
            } ${isForbidden ? 'ring-2 ring-red-500' : ''}`}
          >
            {isForbidden && (
              <div className="absolute inset-0 flex items-center justify-center text-red-500 w-full h-full">
                <svg viewBox="0 0 24 24" className="w-3/4 h-3/4 fill-current">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </div>
            )}
          </div>
        )}
        {isHovered && !stone && (
          <div
            className={`rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] ${
              currentPlayer === 'black' ? 'bg-black' : 'bg-white border border-black'
            } opacity-50`}
          />
        )}
        {isSpecialPoint && !stone && (
          <div className="bg-black rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[20%] h-[20%]" />
        )}
        <button className="w-full h-full opacity-0" onClick={() => placePiece(row, col)} />
      </div>
    );
  };

  const undoMove = (player) => {
    if (moveHistory.length === 0 || gameOver) return;

    const lastMove = moveHistory[moveHistory.length - 1];
    if (lastMove.player !== player) {
      setModalMessage(t('not_your_turn'));
      setShowModal(true);
      return;
    }

    if (undoCount[player] > 0) {
      const newBoard = [...gameBoard];
      newBoard[lastMove.row][lastMove.col] = '';
      setGameBoard(newBoard);

      setMoveHistory(moveHistory.slice(0, -1));
      setCurrentPlayer(player);
      setStatus(player === 'black' ? t('black_turn') : t('white_turn'));

      setUndoCount({
        ...undoCount,
        [player]: undoCount[player] - 1,
      });
    } else {
      setModalMessage(t('no_undo_left'));
      setShowModal(true);
    }
  };

  const handleForbiddenRulesChange = (rule) => {
    setForbiddenRules((prevRules) => {
      if (rule === 'noRestriction') {
        return ['noRestriction'];
      } else {
        const newRules = prevRules.filter((r) => r !== 'noRestriction');
        if (newRules.includes(rule)) {
          return newRules.filter((r) => r !== rule);
        } else {
          return [...newRules, rule];
        }
      }
    });
  };

  // 检查房间状态
  const checkRoom = async (roomId) => {
    try {
      const data = await fetchWithError(`https://api.selfboot.cn/gomoku/rooms/${roomId}`);

      if (data.room) {
        const { black, white } = data.room.players;
        if (black?.name === playerName) {
          setPlayerColor('black');
          return true;
        }
        if (white?.name === playerName) {
          setPlayerColor('white');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Check room error:', error);
      handleError(error);
      return false;
    }
  };

  // 创建新房间
  const createNewRoom = async () => {
    let name = playerName;

    if (!name) {
      name = `Player_${Math.random().toString(36).slice(2, 8)}`;
      setPlayerName(name);
    }

    try {
      const data = await fetchWithError('https://api.selfboot.cn/gomoku/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player_name: name }),
      });

      if (!data || !data.room) {
        throw new ApiError('Invalid response: missing room data', 500);
      }

      const room = Room.fromJSON(data.room);
      if (!room) {
        throw new ApiError('Failed to parse room data', 500);
      }

      setRoomId(room.code);
      setSavedRoomId(room.code);
      initWebSocket(room.code);
    } catch (error) {
      handleError(error);
    }
  };

  // 游戏模式变更
  const handleGameModeChange = async (value) => {
    const newMode = value === t('local_mode') ? 'local' : 'online';
    setGameMode(newMode);

    if (newMode === 'online') {
      if (savedRoomId) {
        const isValid = await checkRoom(savedRoomId);
        if (isValid) {
          setRoomId(savedRoomId);
          initWebSocket(savedRoomId);
          return;
        } else {
          clearSavedRoomId();
        }
      }
      await createNewRoom();
    } else {
      if (ws) {
        ws.close();
        setWs(null);
      }
      setRoomId(null);
      setPlayerColor(null);
      resetGame();
    }
  };

  // 初始化 WebSocket 连接
  const initWebSocket = (roomId) => {
    const newWs = new WebSocket(`wss://api.selfboot.cn/gomoku/ws/${roomId}`);
    
    newWs.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.debug('WebSocket recv', data);
      if (data.type === 'ROOM_STATUS') {
        setRoomStatus(data.status);
      } else if (data.type === 'MOVE') {
        const { row, col } = data.position;
        handleRemoteMove(row, col);
      }
    };

    setWs(newWs);
  };

  // 处理远程玩家的移动
  const handleRemoteMove = (row, col) => {
    placePiece(row, col);
  };

  // 在组件卸载时清理
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return (
    <div className="container mx-auto">
      <div className="lg:flex lg:items-start lg:space-x-8">
        <div className="lg:w-4/5 flex flex-col items-center">
          <div className="text-center mb-4">
            <p className="text-lg font-bold">{status}</p>
          </div>
          <div className="bg-[#E6B771] p-1 max-w-full overflow-auto relative w-[350px] md:w-[500px] lg:w-[600px] aspect-square">
            <div className="relative w-full h-full">
              {/* 横线 */}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`h${i}`}
                  className="absolute bg-black"
                  style={{
                    left: `${100 / 16}%`,
                    top: `${((i + 1) * 100) / 16}%`,
                    width: `${(100 * 14) / 16}%`,
                    height: '1px',
                  }}
                />
              ))}
              {/* 竖线 */}
              {[...Array(15)].map((_, i) => (
                <div
                  key={`v${i}`}
                  className="absolute bg-black"
                  style={{
                    top: `${100 / 16}%`,
                    left: `${((i + 1) * 100) / 16}%`,
                    width: '1px',
                    height: `${(100 * 14) / 16}%`,
                  }}
                />
              ))}
              {gameBoard.map((row, rowIndex) => row.map((_, colIndex) => renderIntersection(rowIndex, colIndex)))}
            </div>
          </div>
        </div>
        <div className="lg:w-1/5 mt-8 lg:mt-0">
          <h2 className="text-xl font-bold mb-4">{t('settings')}</h2>
          <div className="mb-4">
            <div className="flex items-center w-full">
              <label className="text-gray-700 mr-4 shrink-0">{t('game_mode')}:</label>
              <div className="flex-1">
                <CustomListbox
                  value={gameMode === 'local' ? t('local_mode') : t('online_mode')}
                  onChange={handleGameModeChange}
                  options={[t('local_mode'), t('online_mode')]}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {roomId && (
            <div className="mb-4 p-4 bg-gray-100 rounded">
              <p className="mb-2">
                {t('room_status')}: {t('players')}: {roomStatus.players}/2,
                {t('spectators')}: {roomStatus.spectators}
              </p>
              <p className="mb-2">
                {t('your_role')}: {playerColor ? t(playerColor) : t('spectator')}
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}?room=${roomId}`}
                  readOnly
                  className="flex-1 p-2 border rounded"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {t('copy_link')}
                </button>
              </div>
            </div>
          )}
          <div className="mb-4">
            <div className="flex items-center w-full">
              <label className="text-gray-700 mr-4 shrink-0">{t('first_move')}:</label>
              <div className="flex-1">
                <CustomListbox
                  value={firstMove === 'black' ? t('black') : t('white')}
                  onChange={handleFirstMoveChange}
                  options={[t('black'), t('white')]}
                  className="w-full"
                />
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-gray-700 block mb-2">{t('forbidden_rules')}:</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes('noRestriction')}
                  onChange={() => handleForbiddenRulesChange('noRestriction')}
                  className="mr-2"
                />
                {t('no_restriction')}
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes('threeThree')}
                  onChange={() => handleForbiddenRulesChange('threeThree')}
                  className="mr-2"
                />
                {t('three_three')}
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes('longConnection')}
                  onChange={() => handleForbiddenRulesChange('longConnection')}
                  className="mr-2"
                />
                {t('long_connection')}
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={forbiddenRules.includes('fourFour')}
                  onChange={() => handleForbiddenRulesChange('fourFour')}
                  className="mr-2"
                />
                {t('four_four')}
              </label>
            </div>
          </div>
          <button
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded mb-2"
            onClick={() => undoMove('black')}
            disabled={undoCount.black === 0 || gameOver || moveHistory.length === 0}
          >
            {t('undo_black')} ({undoCount.black})
          </button>
          <button
            className="w-full px-4 py-2 bg-white text-gray-800 rounded hover:bg-gray-100 border border-gray-300 mb-2"
            onClick={() => undoMove('white')}
            disabled={undoCount.white === 0 || gameOver || moveHistory.length === 0}
          >
            {t('undo_white')} ({undoCount.white})
          </button>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mb-2"
            onClick={resetGame}
          >
            {t('restart_game')}
          </button>
        </div>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <p>{modalMessage}</p>
      </Modal>
      {errorModal}
    </div>
  );
};

export default GomokuGame;