"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RubiksCube from "./RubiksCube";
import { useState } from "react";
import * as THREE from 'three';

export default function CubeGame() {
  const [currentMove, setCurrentMove] = useState(null);
  const [isScrambling, setIsScrambling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  return (
    <div className="w-full flex flex-col lg:flex-row">
      <div className="h-[70vh] lg:w-4/5 relative flex items-center justify-center">
        <div className="w-full lg:w-4/5 h-full relative bg-gradient-to-br rounded-lg shadow-inner border border-gray-400">
          <Canvas
            camera={{
              position: [6, 6, 6],
              fov: 40,
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              toneMapping: THREE.NoToneMapping,
              outputColorSpace: "srgb",
              preserveDrawingBuffer: true,
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          >
            <RubiksCube
              currentMove={currentMove}
              isScrambling={isScrambling}
              isResetting={isResetting}
              onMoveComplete={() => setCurrentMove(null)}
              onScrambleComplete={() => {
                setIsScrambling(false);
                setCurrentMove(null);
              }}
              onResetComplete={() => {
                setIsResetting(false);
                setCurrentMove(null);
              }}
            />
            <OrbitControls 
              makeDefault
              enablePan={false}
              enableZoom={false}
              enableRotate={true}
              minDistance={8}
              maxDistance={8}
              mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,  // 保持左键旋转
                MIDDLE: null,
                RIGHT: null
              }}
              touches={{
                ONE: THREE.TOUCH.ROTATE,
                TWO: null
              }}
            />
          </Canvas>
        </div>
      </div>

      <div className="lg:w-1/5 p-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
          <button
            className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            onClick={() => setIsScrambling(true)}
            disabled={isScrambling || isResetting || currentMove !== null}
          >
            随机打乱
          </button>
          <button
            className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            onClick={() => setIsResetting(true)}
            disabled={isScrambling || isResetting || currentMove !== null}
          >
            还原初始状态
          </button>
        </div>
      </div>
    </div>
  );
}
