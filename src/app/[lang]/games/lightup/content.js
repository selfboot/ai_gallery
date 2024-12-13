'use client'
import { useState, useEffect } from 'react'
import { 
  GameState, 
  CellFlags, 
  setLight, 
  isGameComplete,
  setBlacks,
  placeLights,
  placeNumbers,
  cleanBoard,
  debugPrintState
} from './lightup'

// 单个格子组件
const Cell = ({ x, y, cell, onCellClick }) => {
  const isBlack = cell.flags & CellFlags.BLACK
  const isLight = cell.flags & CellFlags.LIGHT
  const isLit = cell.lights > 0
  
  // 确定格子内容
  let content = null
  if (isBlack && cell.lights > 0) {
    content = <span className="text-white font-bold">{cell.lights}</span>
  } else if (isLight) {
    content = <div className="w-6 h-6 rounded-full bg-yellow-500 shadow-lg" />
  }
  
  return (
    <div 
      className={`
        w-10 h-10 border border-gray-300
        flex items-center justify-center
        cursor-pointer
        ${isBlack ? 'bg-gray-800' : ''}
        ${isLight ? 'bg-yellow-400' : ''}
        ${!isBlack && !isLight && isLit ? 'bg-yellow-100' : ''}
        ${!isBlack && !isLight && !isLit ? 'bg-white' : ''}
      `}
      onClick={() => onCellClick(x, y)}
    >
      {content}
    </div>
  )
}

// 游戏面板组件
const GameBoard = ({ width = 4, height = 4 }) => {
  const [gameState, setGameState] = useState(null)
  const [completed, setCompleted] = useState(false)

  // 生成新游戏
  const generateNewGame = () => {
    const state = new GameState(width, height)
    
    // 1. 清理游戏板
    cleanBoard(state, false)
    
    // 2. 随机生成黑色墙壁
    setBlacks(state, {
      w: width,
      h: height,
      blackpc: 20, // 20%的格子是黑色的
      symm: 1 // 使用2路旋转对称
    })
    console.log("生成黑色墙壁后:");
    debugPrintState(state);
    // 3. 生成一个有效解
    placeLights(state)
    console.log("生成灯泡后:");
    debugPrintState(state);
    // 4. 根据解生成数字提示
    placeNumbers(state)
    console.log("生成数字后:");
    debugPrintState(state);
    // 5. 清除所有灯泡,只保留墙壁和数字
    cleanBoard(state, true)
    
    return state
  }

  // 初始化游戏状态
  useEffect(() => {
    const newState = generateNewGame()
    setGameState(newState)
    setCompleted(false)
  }, [width, height])

  // 处理格子点击
  const handleCellClick = (x, y) => {
    if (!gameState) return
    
    const newState = gameState.clone()
    const cell = newState.getCell(x, y)
    
    // 如果是黑色方块则不响应点击
    if (cell.flags & CellFlags.BLACK) return
    
    // 切换灯泡状态
    setLight(newState, x, y, !(cell.flags & CellFlags.LIGHT))
    
    // 检查游戏是否完成
    const isComplete = isGameComplete(newState)
    setCompleted(isComplete)
    
    setGameState(newState)
  }

  if (!gameState) return <div>加载中...</div>

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid gap-0.5 bg-gray-300 p-0.5"
           style={{
             gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`
           }}>
        {Array.from({ length: height }, (_, y) => (
          Array.from({ length: width }, (_, x) => (
            <Cell
              key={`${x}-${y}`}
              x={x}
              y={y}
              cell={gameState.getCell(x, y)}
              onCellClick={handleCellClick}
            />
          ))
        )).flat()}
      </div>
      
      {completed && (
        <div className="text-green-600 font-bold text-xl">
          恭喜! 你完成了游戏!
        </div>
      )}
      
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => {
          const newState = generateNewGame()
          setGameState(newState)
          setCompleted(false)
        }}
      >
        重新开始
      </button>
    </div>
  )
}

export default function LightUpGame() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8">Light Up 游戏</h1>
      <GameBoard />
    </div>
  )
}
