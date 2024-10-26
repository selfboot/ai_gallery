"use client";

import { useRef, useEffect } from "react";
import * as THREE from 'three';

// 颜色配置
const FACE_COLORS = {
  up: "#FFFFFF",    // 白色
  front: "#FF0000", // 红色
  right: "#0000FF", // 蓝色
  back: "#FFA500",  // 橙色
  left: "#00FF00",  // 绿色
  down: "#FFFF00",  // 黄色
};

// 定义可能的移动
const MOVES = {
  U: { axis: "y", layer: 1, angle: Math.PI / 2 },  // 上层顺时针
  D: { axis: "y", layer: -1, angle: -Math.PI / 2 }, // 下层顺时针
  R: { axis: "x", layer: 1, angle: Math.PI / 2 },  // 右层顺时针
  L: { axis: "x", layer: -1, angle: -Math.PI / 2 }, // 左层顺时针
  F: { axis: "z", layer: 1, angle: Math.PI / 2 },  // 前层顺时针
  B: { axis: "z", layer: -1, angle: -Math.PI / 2 }, // 后层顺时针
};

const ANIMATION_DURATION = 200; // 动画持续时间（毫秒）

// 创建单个方块的材质
function createCubeMaterials(x, y, z) {
  return [
    // right
    new THREE.MeshBasicMaterial({
      color: x === 1 ? FACE_COLORS.right : "#000000",
      transparent: x !== 1,
      opacity: x === 1 ? 1 : 0,
    }),
    // left
    new THREE.MeshBasicMaterial({
      color: x === -1 ? FACE_COLORS.left : "#000000",
      transparent: x !== -1,
      opacity: x === -1 ? 1 : 0,
    }),
    // top
    new THREE.MeshBasicMaterial({
      color: y === 1 ? FACE_COLORS.up : "#000000",
      transparent: y !== 1,
      opacity: y === 1 ? 1 : 0,
    }),
    // bottom
    new THREE.MeshBasicMaterial({
      color: y === -1 ? FACE_COLORS.down : "#000000",
      transparent: y !== -1,
      opacity: y === -1 ? 1 : 0,
    }),
    // front
    new THREE.MeshBasicMaterial({
      color: z === 1 ? FACE_COLORS.front : "#000000",
      transparent: z !== 1,
      opacity: z === 1 ? 1 : 0,
    }),
    // back
    new THREE.MeshBasicMaterial({
      color: z === -1 ? FACE_COLORS.back : "#000000",
      transparent: z !== -1,
      opacity: z === -1 ? 1 : 0,
    }),
  ];
}

// 执行单个移动
function performMove(cubes, moveName) {
  const move = MOVES[moveName];
  if (!move) return;

  const rotationMatrix = new THREE.Matrix4();
  const angle = move.angle;

  cubes.forEach((cube) => {
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
        rotationMatrix.multiply(new THREE.Matrix4().makeRotationFromEuler(cube.rotation))
      );

      // 更新矩阵
      cube.updateMatrix();
    }
  });
}

// 打乱魔方
function scrambleCube(cubes, onComplete) {
  const moves = Object.keys(MOVES);
  const scrambleSequence = Array(20)
    .fill(0)
    .map(() => moves[Math.floor(Math.random() * moves.length)]);

  let moveIndex = 0;
  const scrambleInterval = setInterval(() => {
    if (moveIndex < scrambleSequence.length) {
      performMove(cubes, scrambleSequence[moveIndex]);
      moveIndex++;
    } else {
      clearInterval(scrambleInterval);
      if (onComplete) onComplete();
    }
  }, 100);

  return () => clearInterval(scrambleInterval);
}

// 重置魔方
function resetCube(cubes) {
  cubes.forEach((cube, index) => {
    const x = Math.floor(index / 9) - 1;
    const y = Math.floor((index % 9) / 3) - 1;
    const z = (index % 3) - 1;

    cube.position.set(x, y, z);
    cube.rotation.set(0, 0, 0);
    cube.updateMatrix();
  });
}

// 执行带动画的移动
function performMoveWithAnimation(cubes, moveName, onComplete) {
  const move = MOVES[moveName];
  if (!move) return;

  const startTime = Date.now();
  const targetAngle = move.angle;
  const rotationMatrix = new THREE.Matrix4();
  
  // 存储初始状态
  const initialStates = cubes.map(cube => ({
    position: cube.position.clone(),
    rotation: cube.rotation.clone(),
    shouldRotate: (move.axis === "x" && Math.abs(cube.position.x - move.layer) < 0.1) ||
                 (move.axis === "y" && Math.abs(cube.position.y - move.layer) < 0.1) ||
                 (move.axis === "z" && Math.abs(cube.position.z - move.layer) < 0.1)
  }));

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    
    // 使用缓动函数使动画更自然
    const easeProgress = 1 - Math.pow(1 - progress, 3); // 缓出效果
    const currentAngle = targetAngle * easeProgress;

    cubes.forEach((cube, index) => {
      if (initialStates[index].shouldRotate) {
        switch (move.axis) {
          case "x":
            rotationMatrix.makeRotationX(currentAngle);
            break;
          case "y":
            rotationMatrix.makeRotationY(currentAngle);
            break;
          case "z":
            rotationMatrix.makeRotationZ(currentAngle);
            break;
        }

        // 从初始位置开始应用旋转
        cube.position.copy(initialStates[index].position);
        cube.rotation.copy(initialStates[index].rotation);
        
        cube.position.applyMatrix4(rotationMatrix);
        cube.rotation.setFromRotationMatrix(
          rotationMatrix.multiply(new THREE.Matrix4().makeRotationFromEuler(initialStates[index].rotation))
        );

        cube.updateMatrix();
      }
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(animate);
}

// 确定移动方向的辅助函数
function determineMoveFromDrag(normal, deltaMove) {
  // 计算拖动的主要方向
  const absX = Math.abs(deltaMove.x);
  const absY = Math.abs(deltaMove.y);
  const dragDirection = absX > absY ? 
    (deltaMove.x > 0 ? 'right' : 'left') : 
    (deltaMove.y > 0 ? 'down' : 'up');

  console.log('确定移动方向:', {
    法线: normal,
    拖动方向: dragDirection,
    deltaX: deltaMove.x,
    deltaY: deltaMove.y
  });

  // 根据法线和拖动方向确定移动
  let move = null;
  if (Math.abs(normal.x) > 0.9) {
    // 右或左面
    move = dragDirection === 'up' ? 'U' : 
           dragDirection === 'down' ? 'D' : 
           dragDirection === 'left' ? 'B' : 'F';
    console.log('在右/左面上拖动');
  } else if (Math.abs(normal.y) > 0.9) {
    // 上或下面
    move = dragDirection === 'right' ? 'R' : 
           dragDirection === 'left' ? 'L' : 
           dragDirection === 'up' ? 'B' : 'F';
    console.log('在上/下面上拖动');
  } else if (Math.abs(normal.z) > 0.9) {
    // 前或后面
    move = dragDirection === 'up' ? 'U' : 
           dragDirection === 'down' ? 'D' : 
           dragDirection === 'right' ? 'R' : 'L';
    console.log('在前/后面上拖动');
  }
  
  console.log('最终决定的移动:', move);
  return move;
}

// 魔方控制钩子
function useCubeControl(groupRef, cubesRef) {
  useEffect(() => {
    // 获取相机和容器
    const camera = groupRef.current?.parent?.parent?.camera;
    if (!camera) {
      console.error('Camera not found');
      return;
    }

    // 使用 Canvas 的父容器
    const container = document.querySelector('.relative.bg-gradient-to-br');
    if (!container) {
      console.error('Container not found');
      return;
    }

    // 射线检测函数
    const checkIntersection = (event) => {
      // 获取 canvas 元素
      const canvas = container.querySelector('canvas');
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX) - rect.left) / rect.width * 2 - 1;
      const y = -((event.clientY) - rect.top) / rect.height * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      
      // 只检测魔方的小方块，不检测背景方块
      const cubes = cubesRef.current.filter(cube => cube !== null);
      const intersects = raycaster.intersectObjects(cubes);
      
      console.log('射线检测结果:', {
        x,
        y,
        intersects: intersects.length
      });

      return intersects[0];
    };

    // 鼠标移动事件处理
    const handleMouseMove = (event) => {
      const intersection = checkIntersection(event);
      if (intersection) {
        console.log('鼠标悬浮在魔方表面:', {
          position: intersection.object.position,
          point: intersection.point,
          normal: intersection.face.normal
        });
      }
    };

    // 鼠标点击事件处理
    const handleMouseDown = (event) => {
      const intersection = checkIntersection(event);
      if (intersection) {
        console.log('点击到魔方表面:', {
          position: intersection.object.position,
          point: intersection.point,
          normal: intersection.face.normal
        });
      }
    };

    // 添加事件监听
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);

    // 清理函数
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
    };
  }, [groupRef, cubesRef]);
}

// 主组件
export default function RubiksCube({ isScrambling, onScrambleComplete, onMoveComplete, isResetting, onResetComplete }) {
  const groupRef = useRef();
  const cubesRef = useRef([]);

  useCubeControl(groupRef, cubesRef);

  useEffect(() => {
    if (isScrambling) {
      const cleanup = scrambleCube(cubesRef.current, onScrambleComplete);
      return cleanup;
    }
  }, [isScrambling]);

  useEffect(() => {
    if (isResetting) {
      resetCube(cubesRef.current);
      onResetComplete();
    }
  }, [isResetting]);

  return (
    <>
      <group ref={groupRef}>
        {/* 背景方块 */}
        <mesh position={[0, 0, 0]} renderOrder={1}>
          <boxGeometry args={[3, 3, 3]} />
          <meshBasicMaterial color="#000000" depthWrite={false} />
        </mesh>

        {[...Array(27)].map((_, index) => {
          const x = Math.floor(index / 9) - 1;
          const y = Math.floor((index % 9) / 3) - 1;
          const z = (index % 3) - 1;

          return (
            <mesh
              key={index}
              ref={(el) => (cubesRef.current[index] = el)}
              position={[x, y, z]}
              renderOrder={2}
            >
              <boxGeometry args={[0.95, 0.95, 0.95]} />
              {createCubeMaterials(x, y, z).map((material, idx) => (
                <primitive key={idx} object={material} attach={`material-${idx}`} />
              ))}
            </mesh>
          );
        })}
      </group>
    </>
  );
}
