"use client";

import { useRef, useEffect } from "react";
import { MeshStandardMaterial, Matrix4 } from "three";

// 定义可能的移动
const MOVES = {
  U: { axis: "y", layer: 1, angle: Math.PI / 2 }, // 上层顺时针
  D: { axis: "y", layer: -1, angle: -Math.PI / 2 }, // 下层顺时针
  R: { axis: "x", layer: 1, angle: Math.PI / 2 }, // 右层顺时针
  L: { axis: "x", layer: -1, angle: -Math.PI / 2 }, // 左层顺时针
  F: { axis: "z", layer: 1, angle: Math.PI / 2 }, // 前层顺时针
  B: { axis: "z", layer: -1, angle: -Math.PI / 2 }, // 后层顺时针
};

// 更新颜色配置
const FACE_COLORS = {
  up: "#FFFFFF", // 白色
  front: "#FF0000", // 红色
  right: "#0000FF", // 蓝色
  back: "#FFA500", // 橙色
  left: "#00FF00", // 绿色
  down: "#FFFF00", // 黄色
};

export default function RubiksCube({ isScrambling, onScrambleComplete, onMoveComplete, isResetting, onResetComplete }) {
  const groupRef = useRef();
  const cubesRef = useRef([]);

  // 执行单个移动
  const performMove = (moveName) => {
    const move = MOVES[moveName];
    if (!move) return;

    const rotationMatrix = new Matrix4();
    const angle = move.angle;

    cubesRef.current.forEach((cube) => {
      const pos = cube.position;
      const shouldRotate =
        (move.axis === "x" && Math.abs(pos.x - move.layer) < 0.1) ||
        (move.axis === "y" && Math.abs(pos.y - move.layer) < 0.1) ||
        (move.axis === "z" && Math.abs(pos.z - move.layer) < 0.1);

      if (shouldRotate) {
        switch (move.axis) {
          case "x":
            rotationMatrix.makeRotationX(angle);
            break;
          case "y":
            rotationMatrix.makeRotationY(angle);
            break;
          case "z":
            rotationMatrix.makeRotationZ(angle);
            break;
        }

        // 更新位置
        cube.position.applyMatrix4(rotationMatrix);

        // 更新旋转
        cube.rotation.setFromRotationMatrix(
          rotationMatrix.multiply(new Matrix4().makeRotationFromEuler(cube.rotation))
        );

        // 更新矩阵
        cube.updateMatrix();
      }
    });
  };

  // 处理打乱
  useEffect(() => {
    if (isScrambling) {
      const moves = Object.keys(MOVES);
      const scrambleSequence = Array(20)
        .fill(0)
        .map(() => moves[Math.floor(Math.random() * moves.length)]);

      let moveIndex = 0;
      const scrambleInterval = setInterval(() => {
        if (moveIndex < scrambleSequence.length) {
          performMove(scrambleSequence[moveIndex]);
          moveIndex++;
        } else {
          clearInterval(scrambleInterval);
          onScrambleComplete(); // 确保这里被调用
        }
      }, 100);

      return () => clearInterval(scrambleInterval);
    }
  }, [isScrambling]);

  // 处理重置
  useEffect(() => {
    if (isResetting) {
      // 重置所有方块到初始位置和旋转
      cubesRef.current.forEach((cube, index) => {
        const x = Math.floor(index / 9) - 1;
        const y = Math.floor((index % 9) / 3) - 1;
        const z = (index % 3) - 1;

        cube.position.set(x, y, z);
        cube.rotation.set(0, 0, 0);
        cube.updateMatrix();
      });

      // 调用重置完成回调
      onResetComplete();
    }
  }, [isResetting]);

  return (
    <group ref={groupRef}>
      {/* 先渲染黑色背景 */}
      <mesh position={[0, 0, 0]} renderOrder={1}>
        <boxGeometry args={[3, 3, 3]} />
        <meshBasicMaterial color="#000000" depthWrite={false} />
      </mesh>

      {/* 再渲染彩色方块 */}
      {[...Array(27)].map((_, index) => {
        const x = Math.floor(index / 9) - 1;
        const y = Math.floor((index % 9) / 3) - 1;
        const z = (index % 3) - 1;

        return (
          <mesh
            key={index}
            ref={(el) => (cubesRef.current[index] = el)}
            position={[x, y, z]}
            renderOrder={2} // renderOrder 设置在 mesh 上
          >
            <boxGeometry args={[0.95, 0.95, 0.95]} />
            {[
              // right
              new MeshStandardMaterial({
                color: x === 1 ? FACE_COLORS.right : "#000000",
                transparent: x !== 1,
                opacity: x === 1 ? 1 : 0,
                depthTest: true,
                depthWrite: true,
              }),
              // left
              new MeshStandardMaterial({
                color: x === -1 ? FACE_COLORS.left : "#000000",
                transparent: x !== -1,
                opacity: x === -1 ? 1 : 0,
                depthTest: true,
                depthWrite: true,
              }),
              // top
              new MeshStandardMaterial({
                color: y === 1 ? FACE_COLORS.up : "#000000",
                transparent: y !== 1,
                opacity: y === 1 ? 1 : 0,
                depthTest: true,
                depthWrite: true,
              }),
              // bottom
              new MeshStandardMaterial({
                color: y === -1 ? FACE_COLORS.down : "#000000",
                transparent: y !== -1,
                opacity: y === -1 ? 1 : 0,
                depthTest: true,
                depthWrite: true,
              }),
              // front
              new MeshStandardMaterial({
                color: z === 1 ? FACE_COLORS.front : "#000000",
                transparent: z !== 1,
                opacity: z === 1 ? 1 : 0,
                depthTest: true,
                depthWrite: true,
              }),
              // back
              new MeshStandardMaterial({
                color: z === -1 ? FACE_COLORS.back : "#000000",
                transparent: z !== -1,
                opacity: z === -1 ? 1 : 0,
                depthTest: true,
                depthWrite: true,
              }),
            ].map((material, idx) => (
              <primitive key={idx} object={material} attach={`material-${idx}`} />
            ))}
          </mesh>
        );
      })}
    </group>
  );
}
