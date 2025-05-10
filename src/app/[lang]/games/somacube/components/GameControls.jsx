'use client';

export default function GameControls({ pieces, selectedPiece, onPieceSelect, onPieceCancel, gameState }) {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4">索玛立方</h2>
      
      {/* Game Status */}
      <div className="mb-4">
        <div className="text-sm text-gray-600">
          状态: {gameState === 'COMPLETED' ? '完成!' : '进行中'}
        </div>
      </div>

      {/* Piece Selection */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">选择方块</h3>
        <div className="grid grid-cols-2 gap-2">
          {pieces.map((piece) => {
            const isPlaced = selectedPiece?.id === piece.id;
            return (
              <button
                key={piece.id}
                onClick={() => onPieceSelect(piece)}
                className={`p-2 rounded border ${
                  isPlaced
                    ? 'border-blue-500 bg-blue-100'
                    : 'border-gray-300 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 mr-2"
                    style={{ backgroundColor: piece.color }}
                  />
                  <span>{piece.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">操作说明:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>点击选择方块</li>
          <li>拖动放置方块</li>
          <li>按 X/Y/Z 键旋转方块</li>
          <li>使用鼠标滚轮旋转视角</li>
          <li>按住鼠标右键拖动旋转视角</li>
          <li>按 ESC 键取消选择</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 space-y-2">
        {selectedPiece && (
          <button
            className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            onClick={onPieceCancel}
          >
            取消选择
          </button>
        )}
        <button
          className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          onClick={() => window.location.reload()}
        >
          重新开始
        </button>
      </div>
    </div>
  );
} 