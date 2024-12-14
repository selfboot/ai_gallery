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

// Render a single cell
const Cell = ({ x, y, cell, onCellClick }) => {
  const isBlack = cell.flags & CellFlags.BLACK
  const isLight = cell.flags & CellFlags.LIGHT
  const isLit = cell.lights > 0
  
  // 确定格子内容
  let content = null
  if (isBlack) {
    console.log("isBlack", x,y, cell.lights);
    content = (
      <>
        <div className="absolute w-full h-full bg-gray-800" />
        {cell.lights > 0 && (
          <span className="relative z-10 text-white font-bold">
            {cell.lights}
          </span>
        )}
      </>
    )
  } else if (isLight) {
    content = <div className="w-6 h-6 rounded-full bg-yellow-500 shadow-lg" />
  }
  
  return (
    <div 
      className={`
        w-10 h-10 border border-gray-300
        flex items-center justify-center
        cursor-pointer
        relative
        ${!isBlack && isLight ? 'bg-yellow-400' : ''}
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
const GameBoard = ({ width = 7, height = 7 }) => {
  const [gameState, setGameState] = useState(null)
  const [completed, setCompleted] = useState(false)

  // 生成新游戏
  const generateNewGame = () => {
    const state = new GameState(width, height)

    cleanBoard(state, false)
    setBlacks(state, {
      w: width,
      h: height,
      blackpc: 20,
      symm: 1 // 使用2路旋转对称
    })
    placeLights(state)
    placeNumbers(state)
    return state
  }

  useEffect(() => {
    const newState = generateNewGame()
    setGameState(newState)
    setCompleted(false)
  }, [width, height])

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
