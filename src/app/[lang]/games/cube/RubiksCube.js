'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber'; // 添加这行

// 颜色配置
const FACE_COLORS = {
  up: '#FFFFFF', // 白色
  front: '#FF0000', // 红色
  right: '#0000FF', // 蓝色
  back: '#FFA500', // 橙色
  left: '#00FF00', // 绿色
  down: '#FFFF00', // 黄色
};

// 定义可能的移动
const MOVES = {
  // 水平层旋转（Y轴，6种）
  UR: { axis: 'y', layer: 1, angle: Math.PI / 2 }, // 上层顺时针
  UL: { axis: 'y', layer: 1, angle: -Math.PI / 2 }, // 上层逆时针
  MR: { axis: 'y', layer: 0, angle: Math.PI / 2 }, // 中层顺时针
  ML: { axis: 'y', layer: 0, angle: -Math.PI / 2 }, // 中层逆时针
  DR: { axis: 'y', layer: -1, angle: Math.PI / 2 }, // 下层顺时针
  DL: { axis: 'y', layer: -1, angle: -Math.PI / 2 }, // 下层逆时针

  // 垂直列旋转（Z轴，6种）
  FU: { axis: 'z', layer: 1, angle: -Math.PI / 2 }, // 前列向上
  FD: { axis: 'z', layer: 1, angle: Math.PI / 2 }, // 前列向下
  CU: { axis: 'z', layer: 0, angle: -Math.PI / 2 }, // 中列向上
  CD: { axis: 'z', layer: 0, angle: Math.PI / 2 }, // 中列向下
  BU: { axis: 'z', layer: -1, angle: -Math.PI / 2 }, // 后列向上
  BD: { axis: 'z', layer: -1, angle: Math.PI / 2 }, // 后列向下

  // 沿 X 轴旋转（6种）
  RU: { axis: 'x', layer: 1, angle: -Math.PI / 2 }, // 右列向上
  RD: { axis: 'x', layer: 1, angle: Math.PI / 2 }, // 右列向下
  MU: { axis: 'x', layer: 0, angle: -Math.PI / 2 }, // 中列向上
  MD: { axis: 'x', layer: 0, angle: Math.PI / 2 }, // 中列向下
  LU: { axis: 'x', layer: -1, angle: -Math.PI / 2 }, // 左列向上
  LD: { axis: 'x', layer: -1, angle: Math.PI / 2 }, // 左列向下
};

// 添加旋转映射常量
const ROTATION_MAPS = {
  x: {
    up: { 1: 'RU', 0: 'MU', '-1': 'LU' },
    down: { 1: 'RD', 0: 'MD', '-1': 'LD' },
  },
  y: {
    right: { 1: 'UR', 0: 'MR', '-1': 'DR' },
    left: { 1: 'UL', 0: 'ML', '-1': 'DL' },
  },
  z: {
    up: { 1: 'FU', 0: 'CU', '-1': 'BU' },
    down: { 1: 'FD', 0: 'CD', '-1': 'BD' },
  },
};

// 获取基于视角的移动映射
const VIEW_MOVE_MAPS = {
  front: {
    right: {
      up: { axis: 'x', isUp: true },
      down: { axis: 'z', isUp: true },
    },
    left: {
      up: { axis: 'z', isUp: false },
      down: { axis: 'x', isUp: false },
    },
  },
  right: {
    right: {
      up: { axis: 'z', isUp: false },
      down: { axis: 'x', isUp: true },
    },
    left: {
      up: { axis: 'x', isUp: false },
      down: { axis: 'z', isUp: true },
    },
  },
  back: {
    right: {
      up: { axis: 'x', isUp: false },
      down: { axis: 'z', isUp: false },
    },
    left: {
      up: { axis: 'z', isUp: true },
      down: { axis: 'x', isUp: true },
    },
  },
  left: {
    right: {
      up: { axis: 'z', isUp: true },
      down: { axis: 'x', isUp: false },
    },
    left: {
      up: { axis: 'x', isUp: true },
      down: { axis: 'z', isUp: false },
    },
  },
};

const ANIMATION_DURATION = 200; // 动画持续时间（毫秒）

// 添加初始相机状态常量
const INITIAL_CAMERA_POSITION = new THREE.Vector3(4, 4, 4);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

// 创建单个方块的材质
function createCubeMaterials(x, y, z) {
  return [
    // right
    new THREE.MeshBasicMaterial({
      color: x === 1 ? FACE_COLORS.right : '#000000',
      transparent: x !== 1,
      opacity: x === 1 ? 1 : 0,
    }),
    // left
    new THREE.MeshBasicMaterial({
      color: x === -1 ? FACE_COLORS.left : '#000000',
      transparent: x !== -1,
      opacity: x === -1 ? 1 : 0,
    }),
    // top
    new THREE.MeshBasicMaterial({
      color: y === 1 ? FACE_COLORS.up : '#000000',
      transparent: y !== 1,
      opacity: y === 1 ? 1 : 0,
    }),
    // bottom
    new THREE.MeshBasicMaterial({
      color: y === -1 ? FACE_COLORS.down : '#000000',
      transparent: y !== -1,
      opacity: y === -1 ? 1 : 0,
    }),
    // front
    new THREE.MeshBasicMaterial({
      color: z === 1 ? FACE_COLORS.front : '#000000',
      transparent: z !== 1,
      opacity: z === 1 ? 1 : 0,
    }),
    // back
    new THREE.MeshBasicMaterial({
      color: z === -1 ? FACE_COLORS.back : '#000000',
      transparent: z !== -1,
      opacity: z === -1 ? 1 : 0,
    }),
  ];
}

// 打乱魔方
function scrambleCube(cubes, onComplete) {
  const moves = Object.keys(MOVES);
  const scrambleCount = 20;
  let moveIndex = 0;

  const scrambleInterval = setInterval(() => {
    if (moveIndex < scrambleCount) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      animateMove(cubes, randomMove, () => {
        moveIndex++;
        if (moveIndex === scrambleCount && onComplete) {
          clearInterval(scrambleInterval);
          onComplete();
        }
      });
    }
  }, ANIMATION_DURATION + 50);

  return () => clearInterval(scrambleInterval);
}

// 重置魔方
function resetCube(cubes, camera, controls) {
  // 重置方块位置和旋转
  cubes.forEach((cube, index) => {
    const x = Math.floor(index / 9) - 1;
    const y = Math.floor((index % 9) / 3) - 1;
    const z = (index % 3) - 1;

    cube.position.set(x, y, z);
    cube.rotation.set(0, 0, 0);
    cube.updateMatrix();
  });

  // 重置相机位置和视角
  if (camera && controls) {
    // 使用动画过渡到初始位置
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = Date.now();
    const duration = 1000; // 1秒的动画时间

    function animateCamera() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // 使用缓动函数使动画更平滑
      const easeProgress = progress * (2 - progress);

      // 插值计算相机位置
      camera.position.lerpVectors(startPosition, INITIAL_CAMERA_POSITION, easeProgress);

      // 插值计算目标点
      controls.target.lerpVectors(startTarget, INITIAL_CAMERA_TARGET, easeProgress);

      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    }

    // animateCamera();
  }
}

// 动画版本的执行移动
function animateMove(cubes, moveName, onComplete) {
  const move = MOVES[moveName];
  if (!move) return;

  const startTime = Date.now();
  const rotationMatrix = new THREE.Matrix4();
  const targetAngle = move.angle;

  // 找出需要旋转的方块
  const rotatingCubes = cubes.filter((cube) => {
    const pos = cube.position;
    return (
      (move.axis === 'x' && Math.abs(pos.x - move.layer) < 0.1) ||
      (move.axis === 'y' && Math.abs(pos.y - move.layer) < 0.1) ||
      (move.axis === 'z' && Math.abs(pos.z - move.layer) < 0.1)
    );
  });

  // 动画函数
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);

    // 使用缓动函数使动画更平滑
    const easeProgress = progress * (2 - progress);
    const currentAngle = targetAngle * easeProgress;

    // 为每个需要旋转的方块应用旋转
    rotatingCubes.forEach((cube) => {
      switch (move.axis) {
        case 'x':
          rotationMatrix.makeRotationX(currentAngle);
          break;
        case 'y':
          rotationMatrix.makeRotationY(currentAngle);
          break;
        case 'z':
          rotationMatrix.makeRotationZ(currentAngle);
          break;
      }

      // 计算新位
      cube.position.copy(cube.userData.startPosition).applyMatrix4(rotationMatrix);

      // 更新旋转
      cube.rotation.setFromRotationMatrix(
        rotationMatrix.multiply(new THREE.Matrix4().makeRotationFromEuler(cube.userData.startRotation))
      );
    });

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      // 动画完成后更新最终状态
      rotatingCubes.forEach((cube) => {
        cube.updateMatrix();
        delete cube.userData.startPosition;
        delete cube.userData.startRotation;
      });
      if (onComplete) onComplete();
    }
  }

  // 保存初始状态
  rotatingCubes.forEach((cube) => {
    cube.userData.startPosition = cube.position.clone();
    cube.userData.startRotation = cube.rotation.clone();
  });

  // 开始动画
  requestAnimationFrame(animate);
}

// 修改视角判断函数，返回方向和高度信息
function getDetailedViewDirection(degrees, cameraPosition) {
  // 判断相机是在魔方上方还是下方
  const height = cameraPosition.y > 0 ? 'top' : 'bottom';

  // 将360度分成4个区域，每个区域90度
  const sector = Math.floor((degrees % 360) / 90);
  let viewDirection;
  switch (sector) {
    case 0:
      viewDirection = 'front';
      break;
    case 1:
      viewDirection = 'right';
      break;
    case 2:
      viewDirection = 'back';
      break;
    case 3:
      viewDirection = 'left';
      break;
  }

  return { viewDirection, height };
}

// 魔方控制钩子
function useCubeControl(groupRef, cubesRef, setEnableOrbitControls) {
  const { camera, gl, scene } = useThree();
  const dragInfo = useRef({
    isDragging: false,
    startIntersection: null,
    startX: null, // 修：保存起始X坐标
    startY: null, // 修改：保存起始Y坐标
    currentIntersection: null,
  });

  const checkIntersection = (event) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const cubes = cubesRef.current.filter((cube) => cube !== null);
    const intersects = raycaster.intersectObjects(cubes);

    return intersects[0];
  };

  const determineMove = (startIntersection, currentIntersection, startX, startY, currentX, currentY) => {
    // 计算屏幕上的移动差值
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // 设置最小移动阈值
    const threshold = 5;
    if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
      return null;
    }

    // 确定是否为左右滑动，并判断垂直方向
    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (!isHorizontal) {
      return null;
    }

    // 判断是向上还是向下的倾向
    const isUpward = deltaY < 0;

    // 获取起始点击的面的法向量和位置
    const faceNormal = startIntersection.face.normal.clone();
    faceNormal.transformDirection(startIntersection.object.matrixWorld);
    const position = startIntersection.object.position;
    const y = Math.round(position.y);

    // 确定基本滑动方向
    let direction = deltaX > 0 ? 'right' : 'left';
    console.log(`屏幕移动: deltaX=${deltaX}, deltaY=${deltaY}`);
    console.log(`滑动方向: ${direction} ${isUpward ? '向上' : '向下'}`);
    console.log(
      `点击面法向量: x=${faceNormal.x.toFixed(2)}, y=${faceNormal.y.toFixed(2)}, z=${faceNormal.z.toFixed(2)}`
    );
    console.log(`起始点位置: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}, z=${position.z.toFixed(2)}`);

    // 判断是否点击的是上面和下面
    const isTopOrDownFace = Math.abs(faceNormal.y) > 0.5;
    if (isTopOrDownFace) {
      const cameraPosition = new THREE.Vector3();
      camera.getWorldPosition(cameraPosition);
      const angle = Math.atan2(cameraPosition.x, cameraPosition.z);
      const degrees = ((angle * 180) / Math.PI + 360) % 360;

      const x = Math.round(position.x);
      const z = Math.round(position.z);

      console.log(`相机角度: ${degrees.toFixed(2)}度`);
      let { viewDirection, height } = getDetailedViewDirection(degrees, cameraPosition);
      console.log(`详细视角方向: ${viewDirection} ${height}`);

      if (height === 'bottom') {
        direction = direction === 'right' ? 'left' : 'right';
      }

      // 获取移动配置
      const moveConfig = VIEW_MOVE_MAPS[viewDirection][direction][isUpward ? 'up' : 'down'];
      const pos = moveConfig.axis === 'x' ? x : z;
      return ROTATION_MAPS[moveConfig.axis][moveConfig.isUp ? 'up' : 'down'][pos];
    } else {
      // return getRotationMove('y', y, direction);
      return ROTATION_MAPS['y'][direction][y];
    }
  };

  useEffect(() => {
    if (!groupRef.current) return;

    const container = gl.domElement;

    const handleMouseDown = (event) => {
      const intersection = checkIntersection(event);
      if (intersection) {
        // 添加点击坐标日志
        const position = intersection.object.position;
        console.log(`点击方块坐标: x=${position.x.toFixed(2)}, y=${position.y.toFixed(2)}, z=${position.z.toFixed(2)}`);

        setEnableOrbitControls(false);
        dragInfo.current = {
          isDragging: true,
          startIntersection: intersection,
          startX: event.clientX,
          startY: event.clientY,
          currentIntersection: intersection,
        };
      }
    };

    const handleMouseMove = (event) => {
      if (!dragInfo.current.isDragging) return;

      const intersection = checkIntersection(event);
      if (intersection) {
        dragInfo.current.currentIntersection = intersection;

        const move = determineMove(
          dragInfo.current.startIntersection,
          intersection,
          dragInfo.current.startX,
          dragInfo.current.startY,
          event.clientX,
          event.clientY
        );

        if (move) {
          dragInfo.current.isDragging = false;
          animateMove(cubesRef.current, move, () => {
            console.log('Move completed:', move);
          });
        }
      }
    };

    const handleMouseUp = () => {
      dragInfo.current.isDragging = false;
      setEnableOrbitControls(true);
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [camera, gl, scene, groupRef, cubesRef, setEnableOrbitControls]);
}

// 主组件
export default function RubiksCube({
  isScrambling,
  onScrambleComplete,
  onMoveComplete,
  isResetting,
  onResetComplete,
  setEnableOrbitControls,
}) {
  const groupRef = useRef();
  const cubesRef = useRef([]);
  const { camera, controls } = useThree(); // 获取相机和控制器

  useCubeControl(groupRef, cubesRef, setEnableOrbitControls);

  useEffect(() => {
    if (isScrambling) {
      const cleanup = scrambleCube(cubesRef.current, onScrambleComplete);
      return cleanup;
    }
  }, [isScrambling]);

  useEffect(() => {
    if (isResetting) {
      resetCube(cubesRef.current, camera, controls);
      onResetComplete();
    }
  }, [isResetting, camera, controls]);

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
            <mesh key={index} ref={(el) => (cubesRef.current[index] = el)} position={[x, y, z]} renderOrder={2}>
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
