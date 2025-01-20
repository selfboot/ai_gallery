"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import RubiksCube from "./RubiksCube";
import { useState } from "react";
import * as THREE from 'three';
import { useI18n } from "@/app/i18n/client";
import { SideAdComponent } from "@/app/components/AdComponent";

export default function CubeGame() {
  const [currentMove, setCurrentMove] = useState(null);
  const [isScrambling, setIsScrambling] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [enableOrbitControls, setEnableOrbitControls] = useState(true);
  const { t } = useI18n();

  return (
    <div className="w-full flex flex-col lg:flex-row">
      <div className="h-[70vh] lg:w-4/5 relative flex items-center justify-center">
        <div className="w-full lg:w-4/5 h-full relative bg-gradient-to-br rounded-lg shadow-inner border border-gray-400 bg-gray-200">
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
              onScrambleComplete={() => {
                setIsScrambling(false);
                setCurrentMove(null);
              }}
              onResetComplete={() => {
                setIsResetting(false);
                setCurrentMove(null);
              }}
              setEnableOrbitControls={setEnableOrbitControls}
            />
            <OrbitControls 
              makeDefault
              enablePan={false}
              enableZoom={false}
              enableRotate={enableOrbitControls}
              minDistance={8}
              maxDistance={8}
              enableDamping={true}
              dampingFactor={0.05}
              mouseButtons={{
                LEFT: THREE.MOUSE.ROTATE,
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
            {t('scramble')}
          </button>
          <button
            className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            onClick={() => setIsResetting(true)}
            disabled={isScrambling || isResetting || currentMove !== null}
          >
            {t('reset')}
          </button>
          <div className="hidden mt-4 md:relative md:block w-full bg-gray-100">
            <SideAdComponent format='vertical'/>
          </div>
        </div>
      </div>
    </div>
  );
}
