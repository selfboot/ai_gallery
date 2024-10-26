"use client";

import { useRef, useEffect } from "react";
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';  // 添加这行

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
  // 整层旋转
  U: { axis: "y", layer: 1, angle: Math.PI / 2 },     // 上层顺时针
  UP: { axis: "y", layer: 1, angle: -Math.PI / 2 },   // 上层逆时针
  D: { axis: "y", layer: -1, angle: -Math.PI / 2 },   // 下层逆时针
  R: { axis: "x", layer: 1, angle: Math.PI / 2 },     // 右层顺时针
  L: { axis: "x", layer: -1, angle: -Math.PI / 2 },   // 左层逆时针
  F: { axis: "z", layer: 1, angle: Math.PI / 2 },     // 前层顺时针
  B: { axis: "z", layer: -1, angle: -Math.PI / 2 },   // 后层逆时针

  // 前面的行移动（从上到下：上、中、下）
  FU: { axis: "z", layer: 1, row: 1, angle: -Math.PI / 2 },    // 前面上层向左
  FM: { axis: "z", layer: 1, row: 0, angle: -Math.PI / 2 },    // 前面中层向左
  FD: { axis: "z", layer: 1, row: -1, angle: -Math.PI / 2 },   // 前面下层向左
  
  // 前面的列移动（从左到右：左、中、右）
  FL: { axis: "z", layer: 1, col: -1, angle: Math.PI / 2 },    // 前面左列向上
  FC: { axis: "z", layer: 1, col: 0, angle: Math.PI / 2 },     // 前面中列向上
  FR: { axis: "z", layer: 1, col: 1, angle: Math.PI / 2 },     // 前面右列向上
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
    const shouldRotate = Math.abs(pos[move.axis] - move.layer) < 0.1;

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

      cube.position.applyMatrix4(rotationMatrix);
      cube.rotation.setFromRotationMatrix(
        rotationMatrix.multiply(new THREE.Matrix4().makeRotationFromEuler(cube.rotation))
      );
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

// 根据拖动确定移动方向
function determineMoveFromDrag(faceNormal, deltaMove, position) {
  const normal = [
    Math.round(faceNormal.x),
    Math.round(faceNormal.y),
    Math.round(faceNormal.z)
  ];
  
  const pos = {
    x: Math.round(position.x),
    y: Math.round(position.y),
    z: Math.round(position.z)
  };

  const isHorizontal = Math.abs(deltaMove.x) > Math.abs(deltaMove.y);
  const moveDirection = isHorizontal ? 
    (deltaMove.x > 0 ? 'right' : 'left') : 
    (deltaMove.y > 0 ? 'down' : 'up');

  // 首先判断是否在顶层（y = 1）
  if (pos.y === 1) {
    if (isHorizontal) {
      // 向右拖动时顺时针(U)，向左拖动时逆时针(U')
      return moveDirection === 'right' ? 'U' : 'UP'; 
    }
  }

  // 其他情况保持原有逻辑
  if (normal[2] === 1) { // 前面
    if (isHorizontal) {
      if (pos.y === 0) return 'FM';  // 中行
      else if (pos.y === -1) return 'FD'; // 下行
    } else {
      if (pos.x === -1) return 'FL';  // 左列
      else if (pos.x === 0) return 'FC';  // 中列
      else if (pos.x === 1) return 'FR';  // 右列
    }
  }

  return null;
}

// 动画版本的执行移动
function animateMove(cubes, moveName, onComplete) {
  const move = MOVES[moveName];
  if (!move) return;

  const startTime = Date.now();
  const rotationMatrix = new THREE.Matrix4();
  const targetAngle = move.angle;
  
  // 找出需要旋转的方块
  const rotatingCubes = cubes.filter(cube => {
    const pos = cube.position;
    return (move.axis === "x" && Math.abs(pos.x - move.layer) < 0.1) ||
           (move.axis === "y" && Math.abs(pos.y - move.layer) < 0.1) ||
           (move.axis === "z" && Math.abs(pos.z - move.layer) < 0.1);
  });

  // 动画函数
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    
    // 使用缓动函数使动画更平滑
    const easeProgress = progress * (2 - progress);
    const currentAngle = targetAngle * easeProgress;

    // 为每个需要旋转的方块应用旋转
    rotatingCubes.forEach(cube => {
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

      // 计算新位置
      cube.position.copy(cube.userData.startPosition)
        .applyMatrix4(rotationMatrix);

      // 更新旋转
      cube.rotation.setFromRotationMatrix(
        rotationMatrix.multiply(
          new THREE.Matrix4().makeRotationFromEuler(cube.userData.startRotation)
        )
      );
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画完成后更新最终状态
      rotatingCubes.forEach(cube => {
        cube.updateMatrix();
        delete cube.userData.startPosition;
        delete cube.userData.startRotation;
      });
      if (onComplete) onComplete();
    }
  }

  // 保存初始状态
  rotatingCubes.forEach(cube => {
    cube.userData.startPosition = cube.position.clone();
    cube.userData.startRotation = cube.rotation.clone();
  });

  // 开始动画
  requestAnimationFrame(animate);
}

// 魔方控制钩子
function useCubeControl(groupRef, cubesRef, setEnableOrbitControls) {
  const { camera, gl } = useThree();
  const dragInfo = useRef({
    isDragging: false,
    startPoint: null,
    startIntersection: null
  });

  useEffect(() => {
    if (!groupRef.current) return;

    const container = gl.domElement;
    
    // 射线检测函数
    const checkIntersection = (event) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX) - rect.left) / rect.width * 2 - 1;
      const y = -((event.clientY) - rect.top) / rect.height * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      
      const cubes = cubesRef.current.filter(cube => cube !== null);
      const intersects = raycaster.intersectObjects(cubes);
      
      return intersects[0];
    };

    // 鼠标按下事件处理
    const handleMouseDown = (event) => {
      const intersection = checkIntersection(event);
      if (intersection) {
        setEnableOrbitControls(false);
        dragInfo.current = {
          isDragging: true,
          startPoint: { x: event.clientX, y: event.clientY },
          startIntersection: intersection
        };
        console.log('开始拖动:', {
          position: intersection.object.position,
          normal: intersection.face.normal
        });
      }
    };

    // 鼠标移动事件处理
    const handleMouseMove = (event) => {
      const intersection = checkIntersection(event);
      setEnableOrbitControls(!intersection);

      if (dragInfo.current.isDragging) {
        const deltaMove = {
          x: event.clientX - dragInfo.current.startPoint.x,
          y: event.clientY - dragInfo.current.startPoint.y
        };

        if (Math.abs(deltaMove.x) > 10 || Math.abs(deltaMove.y) > 10) {
          // 判断移动方向
          const isHorizontal = Math.abs(deltaMove.x) > Math.abs(deltaMove.y);
          const moveDirection = isHorizontal ? 
            (deltaMove.x > 0 ? 'right' : 'left') : 
            (deltaMove.y > 0 ? 'down' : 'up');

          // 获取点击的方块位置和法线
          const position = dragInfo.current.startIntersection.object.position;
          const normal = dragInfo.current.startIntersection.face.normal;

          console.log('拖动信息:', {
            position: {
              x: Math.round(position.x),
              y: Math.round(position.y),
              z: Math.round(position.z)
            },
            normal: {
              x: Math.round(normal.x),
              y: Math.round(normal.y),
              z: Math.round(normal.z)
            },
            moveDirection,
            delta: deltaMove
          });

          const move = determineMoveFromDrag(
            dragInfo.current.startIntersection.face.normal,
            deltaMove,
            dragInfo.current.startIntersection.object.position
          );
          
          if (move) {
            console.log('决定的移动:', move);
            dragInfo.current.isDragging = false;
            animateMove(cubesRef.current, move, () => {
              console.log('动画完成');
            });
          }
        }
      }
    };

    // 鼠标抬起事件处理
    const handleMouseUp = () => {
      dragInfo.current = {
        isDragging: false,
        startPoint: null,
        startIntersection: null
      };
      setEnableOrbitControls(true);
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [camera, gl, groupRef, cubesRef, setEnableOrbitControls]);
}

// 主组件
export default function RubiksCube({ 
  isScrambling, 
  onScrambleComplete, 
  onMoveComplete, 
  isResetting, 
  onResetComplete,
  setEnableOrbitControls 
}) {
  const groupRef = useRef();
  const cubesRef = useRef([]);

  useCubeControl(groupRef, cubesRef, setEnableOrbitControls);

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
