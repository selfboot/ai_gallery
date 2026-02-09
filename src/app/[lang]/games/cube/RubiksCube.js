'use client';

import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import Cube from 'cubejs';

const FACE_COLORS = {
  up: '#FFFFFF',
  front: '#FF0000',
  right: '#0000FF',
  back: '#FFA500',
  left: '#00FF00',
  down: '#FFFF00',
};

const QUARTER_TURN = Math.PI / 2;
const ANIMATION_DURATION = 200;
const EXPECTED_LAYER_CUBE_COUNT = 9;
const TOTAL_CUBE_COUNT = 27;
const INITIAL_CAMERA_POSITION = new THREE.Vector3(4, 4, 4);
const INITIAL_CAMERA_TARGET = new THREE.Vector3(0, 0, 0);

const CLOCKWISE_ROTATION_MAPS = {
  x: {
    clockwise: {
      1: { axis: 'x', layer: 1, angle: -QUARTER_TURN },
      0: { axis: 'x', layer: 0, angle: -QUARTER_TURN },
      '-1': { axis: 'x', layer: -1, angle: -QUARTER_TURN },
    },
    counterclockwise: {
      1: { axis: 'x', layer: 1, angle: QUARTER_TURN },
      0: { axis: 'x', layer: 0, angle: QUARTER_TURN },
      '-1': { axis: 'x', layer: -1, angle: QUARTER_TURN },
    },
  },
  y: {
    clockwise: {
      1: { axis: 'y', layer: 1, angle: QUARTER_TURN },
      0: { axis: 'y', layer: 0, angle: QUARTER_TURN },
      '-1': { axis: 'y', layer: -1, angle: QUARTER_TURN },
    },
    counterclockwise: {
      1: { axis: 'y', layer: 1, angle: -QUARTER_TURN },
      0: { axis: 'y', layer: 0, angle: -QUARTER_TURN },
      '-1': { axis: 'y', layer: -1, angle: -QUARTER_TURN },
    },
  },
  z: {
    clockwise: {
      1: { axis: 'z', layer: 1, angle: -QUARTER_TURN },
      0: { axis: 'z', layer: 0, angle: -QUARTER_TURN },
      '-1': { axis: 'z', layer: -1, angle: -QUARTER_TURN },
    },
    counterclockwise: {
      1: { axis: 'z', layer: 1, angle: QUARTER_TURN },
      0: { axis: 'z', layer: 0, angle: QUARTER_TURN },
      '-1': { axis: 'z', layer: -1, angle: QUARTER_TURN },
    },
  },
};

const VIEW_MOVE_MAPS = {
  front: {
    right: {
      up: { axis: 'x', isClockwise: true },
      down: { axis: 'z', isClockwise: true },
    },
    left: {
      up: { axis: 'z', isClockwise: false },
      down: { axis: 'x', isClockwise: false },
    },
    up: { axis: 'z', isClockwise: false },
    down: { axis: 'z', isClockwise: true },
  },
  right: {
    right: {
      up: { axis: 'z', isClockwise: false },
      down: { axis: 'x', isClockwise: true },
    },
    left: {
      up: { axis: 'x', isClockwise: false },
      down: { axis: 'z', isClockwise: true },
    },
    up: { axis: 'z', isClockwise: false },
    down: { axis: 'z', isClockwise: true },
  },
  back: {
    right: {
      up: { axis: 'x', isClockwise: false },
      down: { axis: 'z', isClockwise: false },
    },
    left: {
      up: { axis: 'z', isClockwise: true },
      down: { axis: 'x', isClockwise: true },
    },
    up: { axis: 'z', isClockwise: true },
    down: { axis: 'z', isClockwise: false },
  },
  left: {
    right: {
      up: { axis: 'z', isClockwise: true },
      down: { axis: 'x', isClockwise: false },
    },
    left: {
      up: { axis: 'x', isClockwise: true },
      down: { axis: 'z', isClockwise: false },
    },
    up: { axis: 'z', isClockwise: true },
    down: { axis: 'z', isClockwise: false },
  },
};

const BASE_MOVE_TO_CONFIG = {
  R: { axis: 'x', layer: 1, angle: -QUARTER_TURN },
  L: { axis: 'x', layer: -1, angle: QUARTER_TURN },
  U: { axis: 'y', layer: 1, angle: -QUARTER_TURN },
  D: { axis: 'y', layer: -1, angle: QUARTER_TURN },
  F: { axis: 'z', layer: 1, angle: -QUARTER_TURN },
  B: { axis: 'z', layer: -1, angle: QUARTER_TURN },
  M: { axis: 'x', layer: 0, angle: QUARTER_TURN },
  E: { axis: 'y', layer: 0, angle: QUARTER_TURN },
  S: { axis: 'z', layer: 0, angle: -QUARTER_TURN },
};

const MOVE_KEY_TO_QUARTER_TOKEN = {
  'x:1:-1': 'R',
  'x:1:1': "R'",
  'x:-1:1': 'L',
  'x:-1:-1': "L'",
  'x:0:1': 'M',
  'x:0:-1': "M'",
  'y:1:-1': 'U',
  'y:1:1': "U'",
  'y:-1:1': 'D',
  'y:-1:-1': "D'",
  'y:0:1': 'E',
  'y:0:-1': "E'",
  'z:1:-1': 'F',
  'z:1:1': "F'",
  'z:-1:1': 'B',
  'z:-1:-1': "B'",
  'z:0:-1': 'S',
  'z:0:1': "S'",
};

const SCRAMBLE_FACES = ['R', 'L', 'U', 'D', 'F', 'B'];
const SCRAMBLE_SUFFIXES = ['', "'", '2'];

let solverInitialized = false;

function ensureSolverInitialized() {
  if (!solverInitialized) {
    Cube.initSolver();
    solverInitialized = true;
  }
}

function createCubeMaterials(x, y, z) {
  return [
    new THREE.MeshBasicMaterial({
      color: x === 1 ? FACE_COLORS.right : '#000000',
      transparent: x !== 1,
      opacity: x === 1 ? 1 : 0,
    }),
    new THREE.MeshBasicMaterial({
      color: x === -1 ? FACE_COLORS.left : '#000000',
      transparent: x !== -1,
      opacity: x === -1 ? 1 : 0,
    }),
    new THREE.MeshBasicMaterial({
      color: y === 1 ? FACE_COLORS.up : '#000000',
      transparent: y !== 1,
      opacity: y === 1 ? 1 : 0,
    }),
    new THREE.MeshBasicMaterial({
      color: y === -1 ? FACE_COLORS.down : '#000000',
      transparent: y !== -1,
      opacity: y === -1 ? 1 : 0,
    }),
    new THREE.MeshBasicMaterial({
      color: z === 1 ? FACE_COLORS.front : '#000000',
      transparent: z !== 1,
      opacity: z === 1 ? 1 : 0,
    }),
    new THREE.MeshBasicMaterial({
      color: z === -1 ? FACE_COLORS.back : '#000000',
      transparent: z !== -1,
      opacity: z === -1 ? 1 : 0,
    }),
  ];
}

function getAxisVector(axis) {
  if (axis === 'x') return new THREE.Vector3(1, 0, 0);
  if (axis === 'y') return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function animateMove(cubes, move, onComplete) {
  if (!move || !Array.isArray(cubes)) {
    onComplete?.(0);
    return;
  }

  const axisVector = getAxisVector(move.axis);
  const targetAngle = move.angle;
  const startTime = performance.now();

  const rotatingCubes = cubes
    .filter(Boolean)
    .filter((cube) => {
      const pos = cube.position;
      return (
        (move.axis === 'x' && Math.abs(pos.x - move.layer) < 0.1) ||
        (move.axis === 'y' && Math.abs(pos.y - move.layer) < 0.1) ||
        (move.axis === 'z' && Math.abs(pos.z - move.layer) < 0.1)
      );
    });

  if (rotatingCubes.length !== EXPECTED_LAYER_CUBE_COUNT) {
    onComplete?.(0);
    return;
  }

  rotatingCubes.forEach((cube) => {
    cube.userData.startPosition = cube.position.clone();
    cube.userData.startQuaternion = cube.quaternion.clone();
  });

  const rotationQuaternion = new THREE.Quaternion();

  const tick = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
    const easeProgress = progress * (2 - progress);
    const currentAngle = targetAngle * easeProgress;

    rotationQuaternion.setFromAxisAngle(axisVector, currentAngle);

    rotatingCubes.forEach((cube) => {
      cube.position.copy(cube.userData.startPosition).applyAxisAngle(axisVector, currentAngle);
      cube.quaternion.copy(cube.userData.startQuaternion).premultiply(rotationQuaternion);
    });

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    const finalRotation = new THREE.Quaternion().setFromAxisAngle(axisVector, targetAngle);

    rotatingCubes.forEach((cube) => {
      cube.position.copy(cube.userData.startPosition).applyAxisAngle(axisVector, targetAngle);
      cube.quaternion.copy(cube.userData.startQuaternion).premultiply(finalRotation);
      cube.position.set(Math.round(cube.position.x), Math.round(cube.position.y), Math.round(cube.position.z));
      cube.updateMatrix();
      delete cube.userData.startPosition;
      delete cube.userData.startQuaternion;
    });

    onComplete?.(rotatingCubes.length);
  };

  requestAnimationFrame(tick);
}

function animateMoveAsync(cubes, move) {
  return new Promise((resolve) => {
    animateMove(cubes, move, resolve);
  });
}

function resetCube(cubes, camera, controls) {
  cubes.forEach((cube, index) => {
    if (!cube) return;
    const x = Math.floor(index / 9) - 1;
    const y = Math.floor((index % 9) / 3) - 1;
    const z = (index % 3) - 1;

    cube.position.set(x, y, z);
    cube.rotation.set(0, 0, 0);
    cube.updateMatrix();
  });

  if (camera && controls) {
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();
    const duration = 1000;

    const animateCamera = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);

      camera.position.lerpVectors(startPosition, INITIAL_CAMERA_POSITION, easeProgress);
      controls.target.lerpVectors(startTarget, INITIAL_CAMERA_TARGET, easeProgress);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };

    requestAnimationFrame(animateCamera);
  }
}

function toMoveKey(axis, layer, angleSign) {
  return `${axis}:${layer}:${angleSign}`;
}

export function moveToQuarterToken(move) {
  if (!move) return null;
  const key = toMoveKey(move.axis, Math.round(move.layer), move.angle >= 0 ? 1 : -1);
  return MOVE_KEY_TO_QUARTER_TOKEN[key] ?? null;
}

export function quarterTokenToMove(token) {
  if (!token) return null;

  const normalized = token.trim();
  const base = normalized[0];
  const modifier = normalized.slice(1);
  const baseMove = BASE_MOVE_TO_CONFIG[base];

  if (!baseMove) return null;
  if (modifier !== '' && modifier !== "'") return null;

  const direction = modifier === "'" ? -1 : 1;
  return {
    axis: baseMove.axis,
    layer: baseMove.layer,
    angle: baseMove.angle * direction,
  };
}

export function expandTokenToQuarterTokens(token) {
  if (!token) return [];

  const normalized = token.trim();
  const base = normalized[0];
  const modifier = normalized.slice(1);

  if (!BASE_MOVE_TO_CONFIG[base]) return [];

  if (modifier === '') return [base];
  if (modifier === "'") return [`${base}'`];
  if (modifier === '2') return [base, base];

  return [];
}

export function adaptKociembaStepsForMethod(tokens, method) {
  if (!Array.isArray(tokens)) return [];

  if (method === 'lbl') {
    return tokens.flatMap((token) => expandTokenToQuarterTokens(token));
  }

  return [...tokens];
}

function splitAlgorithm(algorithm) {
  if (!algorithm) return [];
  return algorithm
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function generateScrambleTokens(length = 20) {
  const tokens = [];
  let prevFace = '';

  for (let i = 0; i < length; i++) {
    let face = SCRAMBLE_FACES[Math.floor(Math.random() * SCRAMBLE_FACES.length)];
    while (face === prevFace) {
      face = SCRAMBLE_FACES[Math.floor(Math.random() * SCRAMBLE_FACES.length)];
    }

    const suffix = SCRAMBLE_SUFFIXES[Math.floor(Math.random() * SCRAMBLE_SUFFIXES.length)];
    tokens.push(`${face}${suffix}`);
    prevFace = face;
  }

  return tokens;
}

function getDetailedViewDirection(degrees, cameraPosition) {
  const height = cameraPosition.y > 0 ? 'top' : 'bottom';
  const sector = Math.floor((degrees % 360) / 90);

  let viewDirection = 'front';
  if (sector === 1) viewDirection = 'right';
  if (sector === 2) viewDirection = 'back';
  if (sector === 3) viewDirection = 'left';

  return { viewDirection, height };
}

function useCubeControl(groupRef, cubesRef, setEnableOrbitControls, executeMoveRef, isActionLockedRef) {
  const { camera, gl, controls } = useThree();
  const dragInfo = useRef({
    isDragging: false,
    startIntersection: null,
    startX: null,
    startY: null,
    pointerId: null,
  });

  const setOrbitEnabled = (enabled) => {
    if (controls) {
      controls.enabled = enabled;
    }
    setEnableOrbitControls(enabled);
  };

  const checkIntersection = (event) => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const cubes = cubesRef.current.filter(Boolean);
    const intersects = raycaster.intersectObjects(cubes);
    return intersects[0] ?? null;
  };

  const determineHorizontalMove = (startIntersection, startX, startY, currentX, currentY) => {
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const isUpward = deltaY < 0;
    let direction = deltaX > 0 ? 'right' : 'left';

    const faceNormal = startIntersection.face.normal.clone();
    faceNormal.transformDirection(startIntersection.object.matrixWorld);
    const position = startIntersection.object.position;
    const y = Math.round(position.y);

    const isTopOrDownFace = Math.abs(faceNormal.y) > 0.5;
    if (isTopOrDownFace) {
      const cameraPosition = new THREE.Vector3();
      camera.getWorldPosition(cameraPosition);
      const angle = Math.atan2(cameraPosition.x, cameraPosition.z);
      const degrees = ((angle * 180) / Math.PI + 360) % 360;

      const { viewDirection, height } = getDetailedViewDirection(degrees, cameraPosition);

      if (height === 'bottom') {
        direction = direction === 'right' ? 'left' : 'right';
      }

      const moveConfig = VIEW_MOVE_MAPS[viewDirection][direction][isUpward ? 'up' : 'down'];
      const x = Math.round(position.x);
      const z = Math.round(position.z);
      const pos = moveConfig.axis === 'x' ? x : z;

      return CLOCKWISE_ROTATION_MAPS[moveConfig.axis][moveConfig.isClockwise ? 'clockwise' : 'counterclockwise'][pos];
    }

    return CLOCKWISE_ROTATION_MAPS.y[direction === 'right' ? 'clockwise' : 'counterclockwise'][y];
  };

  const determineVerticalMove = (startIntersection, startX, startY, currentX, currentY) => {
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const isUpward = deltaY < 0;

    const faceNormal = startIntersection.face.normal.clone();
    faceNormal.transformDirection(startIntersection.object.matrixWorld);
    const position = startIntersection.object.position;

    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    const angle = Math.atan2(cameraPosition.x, cameraPosition.z);
    const degrees = ((angle * 180) / Math.PI + 360) % 360;
    const { viewDirection } = getDetailedViewDirection(degrees, cameraPosition);

    const isLeftRightFace = Math.abs(faceNormal.x) > 0.5;
    if (isLeftRightFace) {
      const moveConfig = VIEW_MOVE_MAPS[viewDirection][isUpward ? 'up' : 'down'];
      const y = Math.round(position.y);
      const z = Math.round(position.z);
      const pos = moveConfig.axis === 'y' ? y : z;

      return CLOCKWISE_ROTATION_MAPS[moveConfig.axis][moveConfig.isClockwise ? 'clockwise' : 'counterclockwise'][pos];
    }

    let moveClockwise = isUpward ? 'clockwise' : 'counterclockwise';
    if (viewDirection === 'back' || viewDirection === 'right') {
      moveClockwise = moveClockwise === 'clockwise' ? 'counterclockwise' : 'clockwise';
    }

    const x = Math.round(position.x);
    return CLOCKWISE_ROTATION_MAPS.x[moveClockwise][x];
  };

  useEffect(() => {
    if (!groupRef.current) return;

    const container = gl.domElement;

    const handlePointerDown = (event) => {
      if (isActionLockedRef.current) return;

      const intersection = checkIntersection(event);
      if (!intersection) return;

      event.preventDefault();
      event.stopPropagation();
      setOrbitEnabled(false);
      dragInfo.current = {
        isDragging: true,
        startIntersection: intersection,
        startX: event.clientX,
        startY: event.clientY,
        pointerId: event.pointerId,
      };

      if (typeof container.setPointerCapture === 'function') {
        container.setPointerCapture(event.pointerId);
      }
    };

    const handlePointerMove = (event) => {
      if (!dragInfo.current.isDragging || isActionLockedRef.current) return;
      if (dragInfo.current.pointerId !== null && event.pointerId !== dragInfo.current.pointerId) return;

      const deltaX = event.clientX - dragInfo.current.startX;
      const deltaY = event.clientY - dragInfo.current.startY;
      const threshold = 5;

      if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return;

      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      const move = isHorizontal
        ? determineHorizontalMove(
            dragInfo.current.startIntersection,
            dragInfo.current.startX,
            dragInfo.current.startY,
            event.clientX,
            event.clientY
          )
        : determineVerticalMove(
            dragInfo.current.startIntersection,
            dragInfo.current.startX,
            dragInfo.current.startY,
            event.clientX,
            event.clientY
          );

      if (!move) return;

      event.preventDefault();
      event.stopPropagation();
      dragInfo.current.isDragging = false;
      setOrbitEnabled(true);
      if (typeof container.releasePointerCapture === 'function' && dragInfo.current.pointerId !== null) {
        container.releasePointerCapture(dragInfo.current.pointerId);
      }
      dragInfo.current.pointerId = null;
      executeMoveRef.current?.(move);
    };

    const handlePointerUp = (event) => {
      if (dragInfo.current.pointerId !== null && event.pointerId !== dragInfo.current.pointerId) return;
      dragInfo.current.isDragging = false;
      setOrbitEnabled(true);
      if (typeof container.releasePointerCapture === 'function' && dragInfo.current.pointerId !== null) {
        container.releasePointerCapture(dragInfo.current.pointerId);
      }
      dragInfo.current.pointerId = null;
    };

    container.addEventListener('pointerdown', handlePointerDown, { capture: true });
    container.addEventListener('pointermove', handlePointerMove, { capture: true });
    container.addEventListener('pointerup', handlePointerUp, { capture: true });
    container.addEventListener('pointercancel', handlePointerUp, { capture: true });
    container.addEventListener('mouseleave', handlePointerUp, { capture: true });

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      container.removeEventListener('pointermove', handlePointerMove, { capture: true });
      container.removeEventListener('pointerup', handlePointerUp, { capture: true });
      container.removeEventListener('pointercancel', handlePointerUp, { capture: true });
      container.removeEventListener('mouseleave', handlePointerUp, { capture: true });
    };
  }, [camera, gl, controls, groupRef, cubesRef, setEnableOrbitControls, executeMoveRef, isActionLockedRef]);
}

export default function RubiksCube({
  isScrambling,
  onScrambleComplete,
  isResetting,
  onResetComplete,
  solveMethod = 'kociemba',
  solveRequestId = 0,
  nextStepRequestId = 0,
  autoPlayRequestId = 0,
  stopAutoPlayRequestId = 0,
  setEnableOrbitControls,
  onBusyChange,
  onSolutionGenerated,
  onSolutionProgress,
  onAutoPlayChange,
  onSolveError,
}) {
  const groupRef = useRef();
  const cubesRef = useRef([]);
  const executeMoveRef = useRef(null);
  const isActionLockedRef = useRef(false);

  const cubeStateRef = useRef(new Cube());
  const moveHistoryRef = useRef([]);
  const solutionStepsRef = useRef([]);
  const currentStepIndexRef = useRef(-1);
  const stopAutoPlayRef = useRef(false);

  const { camera, controls } = useThree();

  const setActionLock = (locked) => {
    isActionLockedRef.current = locked;
    onBusyChange?.(locked);
  };

  const clearSolution = () => {
    solutionStepsRef.current = [];
    currentStepIndexRef.current = -1;
    onSolutionGenerated?.([]);
    onSolutionProgress?.(-1);
  };

  const runExclusive = async (task) => {
    if (isActionLockedRef.current) return false;

    setActionLock(true);
    try {
      await task();
      return true;
    } finally {
      setActionLock(false);
    }
  };

  const applyQuarterToken = async (quarterToken, recordHistory = true) => {
    const move = quarterTokenToMove(quarterToken);
    if (!move) return false;

    const readyCubeCount = cubesRef.current.filter(Boolean).length;
    if (readyCubeCount !== TOTAL_CUBE_COUNT) {
      return false;
    }

    const movedCount = await animateMoveAsync(cubesRef.current, move);
    if (movedCount !== EXPECTED_LAYER_CUBE_COUNT) {
      return false;
    }

    cubeStateRef.current.move(quarterToken);

    if (recordHistory) {
      moveHistoryRef.current.push(quarterToken);
    }

    return true;
  };

  const applyToken = async (token, recordHistory = true) => {
    const quarterTokens = expandTokenToQuarterTokens(token);
    if (!quarterTokens.length) {
      return false;
    }

    for (const quarterToken of quarterTokens) {
      const applied = await applyQuarterToken(quarterToken, recordHistory);
      if (!applied) {
        return false;
      }
    }

    return true;
  };

  executeMoveRef.current = async (move) => {
    if (isActionLockedRef.current) return;

    const quarterToken = moveToQuarterToken(move);
    if (!quarterToken) return;

    stopAutoPlayRef.current = true;
    onAutoPlayChange?.(false);

    await runExclusive(async () => {
      onSolveError?.('');
      clearSolution();

      const applied = await applyQuarterToken(quarterToken, true);
      if (!applied) {
        onSolveError?.('cube_move_sync_error');
      }
    });
  };

  useCubeControl(groupRef, cubesRef, setEnableOrbitControls, executeMoveRef, isActionLockedRef);

  useEffect(() => {
    if (!isScrambling) return;

    void runExclusive(async () => {
      stopAutoPlayRef.current = true;
      onAutoPlayChange?.(false);
      onSolveError?.('');
      clearSolution();

      const scrambleTokens = generateScrambleTokens(20);
      for (const token of scrambleTokens) {
        const applied = await applyToken(token, true);
        if (!applied) {
          onSolveError?.('cube_move_sync_error');
          break;
        }
      }

      onScrambleComplete?.();
    });
  }, [isScrambling]);

  useEffect(() => {
    if (!isResetting) return;

    void runExclusive(async () => {
      stopAutoPlayRef.current = true;
      onAutoPlayChange?.(false);
      onSolveError?.('');

      clearSolution();
      resetCube(cubesRef.current, camera, controls);
      cubeStateRef.current = new Cube();
      moveHistoryRef.current = [];

      onResetComplete?.();
    });
  }, [isResetting, camera, controls]);

  useEffect(() => {
    if (solveRequestId <= 0) return;

    void runExclusive(async () => {
      stopAutoPlayRef.current = true;
      onAutoPlayChange?.(false);
      onSolveError?.('');

      if (cubesRef.current.filter(Boolean).length !== TOTAL_CUBE_COUNT) {
        onSolveError?.('cube_move_sync_error');
        clearSolution();
        return;
      }

      if (cubeStateRef.current.isSolved()) {
        clearSolution();
        onSolveError?.('cube_already_solved');
        return;
      }

      try {
        let steps = [];

        if (solveMethod === 'reverse') {
          const history = moveHistoryRef.current.join(' ').trim();
          const reverseAlgorithm = history ? Cube.inverse(history) : '';
          steps = splitAlgorithm(reverseAlgorithm);
        } else {
          ensureSolverInitialized();
          const solution = cubeStateRef.current.solve();
          const kociembaSteps = splitAlgorithm(solution);
          steps = adaptKociembaStepsForMethod(kociembaSteps, solveMethod);
        }

        solutionStepsRef.current = steps;
        currentStepIndexRef.current = -1;

        onSolutionGenerated?.(steps);
        onSolutionProgress?.(-1);
      } catch (error) {
        onSolveError?.(error?.message || 'failed_to_solve');
        clearSolution();
      }
    });
  }, [solveRequestId, solveMethod]);

  useEffect(() => {
    if (nextStepRequestId <= 0) return;

    const steps = solutionStepsRef.current;
    const nextIndex = currentStepIndexRef.current + 1;

    if (!steps.length || nextIndex >= steps.length) return;

    void runExclusive(async () => {
      onSolveError?.('');

      const applied = await applyToken(steps[nextIndex], true);
      if (!applied) {
        onSolveError?.('cube_move_sync_error');
        clearSolution();
        return;
      }

      currentStepIndexRef.current = nextIndex;
      onSolutionProgress?.(nextIndex);
    });
  }, [nextStepRequestId]);

  useEffect(() => {
    if (autoPlayRequestId <= 0) return;

    const steps = solutionStepsRef.current;
    if (!steps.length) return;

    stopAutoPlayRef.current = false;

    void runExclusive(async () => {
      onSolveError?.('');
      onAutoPlayChange?.(true);

      try {
        for (let i = currentStepIndexRef.current + 1; i < steps.length; i++) {
          if (stopAutoPlayRef.current) break;

          const applied = await applyToken(steps[i], true);
          if (!applied) {
            onSolveError?.('cube_move_sync_error');
            clearSolution();
            break;
          }

          currentStepIndexRef.current = i;
          onSolutionProgress?.(i);
        }
      } finally {
        onAutoPlayChange?.(false);
      }
    });
  }, [autoPlayRequestId]);

  useEffect(() => {
    if (stopAutoPlayRequestId <= 0) return;
    stopAutoPlayRef.current = true;
    onAutoPlayChange?.(false);
  }, [stopAutoPlayRequestId]);

  return (
    <group ref={groupRef}>
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
  );
}
