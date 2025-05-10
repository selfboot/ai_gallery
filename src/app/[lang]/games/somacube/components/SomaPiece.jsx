'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import { GRID_SIZE, CELL_SIZE } from '../content';
import * as THREE from 'three';

export default function SomaPiece({ piece, isPlaced, onPlace, onCancel, onUpdatePosition, isValid }) {
  const groupRef = useRef();
  const [position, setPosition] = useState([0, 0, 0]);
  const [rotation, setRotation] = useState([0, 0, 0]);
  const { camera, raycaster, gl } = useThree();
  
  // Define the grid planes for raycasting
  const gridPlanes = useRef([
    new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),             // Base XY plane (z=0)
    new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),             // Base XZ plane (y=0)
    new THREE.Plane(new THREE.Vector3(1, 0, 0), 0),             // Base YZ plane (x=0)
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -GRID_SIZE+1),  // Top XY plane (z=GRID_SIZE-1)
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -GRID_SIZE+1),  // Front XZ plane (y=GRID_SIZE-1)
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -GRID_SIZE+1),  // Right YZ plane (x=GRID_SIZE-1)
  ]);

  // Reset position when piece is selected
  useEffect(() => {
    if (!isPlaced) {
      setPosition([1, 1, 1]);
      setRotation([0, 0, 0]);
    }
  }, [isPlaced]);

  // Calculate grid-aligned position
  const snapToGrid = (pos) => {
    return pos.map(coord => Math.round(coord));
  };

  // Add mouse interaction to move the piece
  useEffect(() => {
    if (isPlaced) return;

    const handleMouseMove = (event) => {
      // Calculate normalized device coordinates
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update raycaster with mouse position
      raycaster.setFromCamera({ x, y }, camera);
      
      // Find the closest intersection with any of our grid planes
      let closestIntersection = null;
      let closestDistance = Infinity;
      
      for (const plane of gridPlanes.current) {
        const intersectionPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersectionPoint)) {
          // Check if intersection is within grid bounds
          if (
            intersectionPoint.x >= 0 && intersectionPoint.x < GRID_SIZE &&
            intersectionPoint.y >= 0 && intersectionPoint.y < GRID_SIZE &&
            intersectionPoint.z >= 0 && intersectionPoint.z < GRID_SIZE
          ) {
            const distance = camera.position.distanceTo(intersectionPoint);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestIntersection = intersectionPoint;
            }
          }
        }
      }
      
      if (closestIntersection) {
        // Get grid-aligned position
        const gridPos = snapToGrid([
          closestIntersection.x,
          closestIntersection.y,
          closestIntersection.z
        ]);
        
        // Update position locally
        setPosition(gridPos);
        
        // Notify parent about position change
        onUpdatePosition(gridPos);
      }
    };

    const handleMouseClick = (event) => {
      // Use current position from state
      const snappedPos = position;
      onPlace(snappedPos, rotation);
    };

    // Add event listeners
    gl.domElement.addEventListener('mousemove', handleMouseMove);
    gl.domElement.addEventListener('click', handleMouseClick);
    
    return () => {
      gl.domElement.removeEventListener('mousemove', handleMouseMove);
      gl.domElement.removeEventListener('click', handleMouseClick);
    };
  }, [isPlaced, camera, raycaster, gl, position, rotation, onPlace, onUpdatePosition]);

  // Handle piece rotation
  const handleRotation = (axis) => {
    if (isPlaced) return;
    
    const newRotation = [...rotation];
    const index = ['x', 'y', 'z'].indexOf(axis);
    newRotation[index] = (newRotation[index] + Math.PI / 2) % (Math.PI * 2);
    setRotation(newRotation);
  };

  // Add keyboard controls for rotation
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (isPlaced) return;
      
      switch(event.key.toLowerCase()) {
        case 'x':
          handleRotation('x');
          break;
        case 'y':
          handleRotation('y');
          break;
        case 'z':
          handleRotation('z');
          break;
        case 'escape':
          onCancel();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaced, onCancel]);

  // Update rotations on each frame
  useFrame(() => {
    if (groupRef.current && !isPlaced) {
      groupRef.current.rotation.x = rotation[0];
      groupRef.current.rotation.y = rotation[1];
      groupRef.current.rotation.z = rotation[2];
    }
  });

  return (
    <group
      ref={groupRef}
      position={isPlaced ? piece.position : position}
      rotation={isPlaced ? piece.rotation : rotation}
    >
      {piece.blocks.map((block, index) => (
        <Box
          key={index}
          position={block}
          args={[CELL_SIZE * 0.9, CELL_SIZE * 0.9, CELL_SIZE * 0.9]}
        >
          <meshStandardMaterial
            color={piece.color}
            opacity={isPlaced ? 1 : (isValid ? 0.7 : 0.4)}
            transparent={!isPlaced}
            emissive={!isPlaced && !isValid ? "#ff0000" : "#000000"}
            emissiveIntensity={!isPlaced && !isValid ? 0.5 : 0}
            metalness={0.1}
            roughness={0.5}
          />
        </Box>
      ))}
    </group>
  );
} 