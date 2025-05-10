'use client';

import { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Edges } from '@react-three/drei';
import { SOMA_PIECES, GRID_SIZE, CELL_SIZE, CAMERA_SETTINGS } from '../content';
import SomaPiece from './SomaPiece';
import GameControls from './GameControls';
import * as THREE from 'three';

// Helper function to check if two pieces overlap
const checkOverlap = (piece1, piece2) => {
  const cells1 = new Set();
  const cells2 = new Set();

  // Convert piece1 blocks to absolute positions
  piece1.blocks.forEach(([x, y, z]) => {
    const absX = Math.round(x + piece1.position[0]);
    const absY = Math.round(y + piece1.position[1]);
    const absZ = Math.round(z + piece1.position[2]);
    cells1.add(`${absX},${absY},${absZ}`);
  });

  // Convert piece2 blocks to absolute positions
  piece2.blocks.forEach(([x, y, z]) => {
    const absX = Math.round(x + piece2.position[0]);
    const absY = Math.round(y + piece2.position[1]);
    const absZ = Math.round(z + piece2.position[2]);
    cells2.add(`${absX},${absY},${absZ}`);
  });

  // Check for any overlapping cells
  for (const cell of cells1) {
    if (cells2.has(cell)) return true;
  }
  return false;
};

// Helper function to check if a piece is within bounds
const isWithinBounds = (piece) => {
  return piece.blocks.every(([x, y, z]) => {
    const absX = Math.round(x + piece.position[0]);
    const absY = Math.round(y + piece.position[1]);
    const absZ = Math.round(z + piece.position[2]);
    return (
      absX >= 0 && absX < GRID_SIZE &&
      absY >= 0 && absY < GRID_SIZE &&
      absZ >= 0 && absZ < GRID_SIZE
    );
  });
};

// Component to display grid cells
const GridCells = ({ placedPieces }) => {
  // Create a set of filled positions
  const filledPositions = new Set();
  placedPieces.forEach(piece => {
    piece.blocks.forEach(([x, y, z]) => {
      const absX = Math.round(x + piece.position[0]);
      const absY = Math.round(y + piece.position[1]);
      const absZ = Math.round(z + piece.position[2]);
      filledPositions.add(`${absX},${absY},${absZ}`);
    });
  });

  // Generate all 27 cell positions
  const cells = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let z = 0; z < GRID_SIZE; z++) {
        if (!filledPositions.has(`${x},${y},${z}`)) {
          cells.push([x, y, z]);
        }
      }
    }
  }

  return (
    <group>
      {cells.map((pos, idx) => (
        <mesh key={idx} position={pos}>
          <boxGeometry args={[CELL_SIZE * 0.95, CELL_SIZE * 0.95, CELL_SIZE * 0.95]} />
          <meshStandardMaterial 
            color="#ffffff"
            transparent={true}
            opacity={0.1}
          />
          <Edges 
            color="#888888" 
            threshold={15} // display edges only if face normals differ by this amount of degrees
            scale={1.01}
          />
        </mesh>
      ))}
    </group>
  );
};

// Component to display coordinate axes for reference
const CoordinateAxes = () => {
  return (
    <group>
      {/* X axis */}
      <mesh position={[GRID_SIZE/2, -0.5, -0.5]}>
        <boxGeometry args={[GRID_SIZE, 0.05, 0.05]} />
        <meshStandardMaterial color="red" />
      </mesh>
      
      {/* Y axis */}
      <mesh position={[-0.5, GRID_SIZE/2, -0.5]}>
        <boxGeometry args={[0.05, GRID_SIZE, 0.05]} />
        <meshStandardMaterial color="green" />
      </mesh>
      
      {/* Z axis */}
      <mesh position={[-0.5, -0.5, GRID_SIZE/2]}>
        <boxGeometry args={[0.05, 0.05, GRID_SIZE]} />
        <meshStandardMaterial color="blue" />
      </mesh>
    </group>
  );
};

export default function SomaCube() {
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [hoveredPosition, setHoveredPosition] = useState([0, 0, 0]);
  const [placedPieces, setPlacedPieces] = useState([]);
  const [isValidPlacement, setIsValidPlacement] = useState(true);
  const [gameState, setGameState] = useState('IDLE');
  const [showAllCells, setShowAllCells] = useState(true);
  const gridRef = useRef();
  const orbitControlsRef = useRef();

  // Check if a position is valid for the current selected piece
  const checkValidPlacement = (position, pieceToCheck = selectedPiece) => {
    if (!pieceToCheck) return false;
    
    const testPiece = {
      ...pieceToCheck,
      position
    };
    
    // Check if piece is within bounds
    const withinBounds = isWithinBounds(testPiece);
    
    // Check for collisions with placed pieces
    const hasCollision = placedPieces.some(placedPiece => 
      checkOverlap(testPiece, placedPiece)
    );
    
    return withinBounds && !hasCollision;
  };

  // Update hovered position and placement validity
  useEffect(() => {
    if (selectedPiece) {
      setIsValidPlacement(checkValidPlacement(hoveredPosition));
    }
  }, [selectedPiece, hoveredPosition, placedPieces]);

  const handlePieceSelect = (piece) => {
    // If selecting the same piece, do nothing
    if (selectedPiece?.id === piece.id) return;

    // Create a new piece instance with initial position
    const newPiece = {
      ...piece,
      position: [1, 1, 1], // Start in the middle of the grid
      rotation: [0, 0, 0]
    };
    setSelectedPiece(newPiece);
    setGameState('SELECTING');
  };

  const handlePiecePlace = (position, rotation) => {
    if (!selectedPiece) return;

    const newPiece = {
      ...selectedPiece,
      position,
      rotation
    };

    // Final check before placement
    if (checkValidPlacement(position)) {
      setPlacedPieces([...placedPieces, newPiece]);
      setSelectedPiece(null);
      setGameState('IDLE');
    }
  };

  const handlePieceCancel = () => {
    setSelectedPiece(null);
    setGameState('IDLE');
  };
  
  const handleHoveredPositionChange = (position) => {
    setHoveredPosition(position);
    
    if (selectedPiece) {
      setSelectedPiece({
        ...selectedPiece,
        position
      });
    }
  };

  const checkCompletion = () => {
    // Check if all 27 cells are filled
    const filledCells = new Set();
    placedPieces.forEach(piece => {
      piece.blocks.forEach(([x, y, z]) => {
        const absX = Math.round(x + piece.position[0]);
        const absY = Math.round(y + piece.position[1]);
        const absZ = Math.round(z + piece.position[2]);
        filledCells.add(`${absX},${absY},${absZ}`);
      });
    });

    return filledCells.size === GRID_SIZE * GRID_SIZE * GRID_SIZE;
  };

  useEffect(() => {
    if (checkCompletion()) {
      setGameState('COMPLETED');
    }
  }, [placedPieces]);

  return (
    <div className="w-full h-screen bg-gray-100">
      <div className="flex h-full">
        {/* 3D View */}
        <div className="flex-1 relative">
          <Canvas>
            <PerspectiveCamera
              makeDefault
              position={[6, 6, 6]}
              fov={45}
              near={0.1}
              far={1000}
            />
            <ambientLight intensity={0.7} />
            <pointLight position={[10, 10, 10]} intensity={0.5} />
            <pointLight position={[-10, -10, -10]} intensity={0.3} />
            
            {/* Empty cell visualization */}
            {showAllCells && (
              <GridCells placedPieces={placedPieces} />
            )}
            
            {/* Coordinate axes for reference */}
            <CoordinateAxes />
            
            {/* Placed Pieces */}
            {placedPieces.map((piece, index) => (
              <SomaPiece
                key={`placed-${index}`}
                piece={piece}
                isPlaced={true}
                onUpdatePosition={() => {}}
              />
            ))}

            {/* Selected Piece */}
            {selectedPiece && (
              <SomaPiece
                piece={selectedPiece}
                isPlaced={false}
                onPlace={handlePiecePlace}
                onCancel={handlePieceCancel}
                onUpdatePosition={handleHoveredPositionChange}
                isValid={isValidPlacement}
              />
            )}

            <OrbitControls
              ref={orbitControlsRef}
              enablePan={true}
              enableZoom={true}
              enableRotate={true}
              minDistance={5}
              maxDistance={20}
              minPolarAngle={0}
              maxPolarAngle={Math.PI}
            />
          </Canvas>
          
          {/* Interface Layer */}
          {selectedPiece && !isValidPlacement && (
            <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-2 rounded-md shadow-md">
              无效位置 - 请尝试其他位置
            </div>
          )}
          
          {/* Toggle grid cells button */}
          <button 
            className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-md shadow-md"
            onClick={() => setShowAllCells(!showAllCells)}
          >
            {showAllCells ? '隐藏网格' : '显示网格'}
          </button>
          
          {gameState === 'COMPLETED' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white p-8 rounded-lg shadow-xl text-center">
                <h2 className="text-3xl font-bold text-green-600 mb-4">恭喜!</h2>
                <p className="text-xl mb-6">您已成功完成索玛立方体!</p>
                <button
                  className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  onClick={() => window.location.reload()}
                >
                  再玩一次
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="w-64 bg-white p-4 shadow-lg">
          <GameControls
            pieces={SOMA_PIECES}
            selectedPiece={selectedPiece}
            onPieceSelect={handlePieceSelect}
            onPieceCancel={handlePieceCancel}
            gameState={gameState}
          />
          
          {/* Placement Instructions */}
          {selectedPiece && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm text-blue-700">
                将鼠标移动到立方体中的任意位置。点击放置方块，按ESC取消。按X/Y/Z键旋转方块。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 