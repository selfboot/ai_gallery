import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';

const AnimatedNode = ({ value, x, y }) => {
  const props = useSpring({ 
    to: { transform: `translate(${x}px,${y}px)` }, 
    config: { 
      mass: 1,
      tension: 120,
      friction: 14,
      clamp: false,
      precision: 0.01
    }
  });
  return (
    <animated.g style={props}>
      <circle r="20" fill="white" stroke="black" strokeWidth="2" />
      <text textAnchor="middle" dy=".3em">{value}</text>
    </animated.g>
  );
};

const Edge = ({ start, end }) => (
  <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke="black" strokeWidth="2" />
);

const Tree = ({ nodes, edges }) => (
  <g>
    {edges.map((edge, i) => <Edge key={i} start={nodes[edge[0]]} end={nodes[edge[1]]} />)}
    {Object.entries(nodes).map(([key, { x, y }]) => (
      <AnimatedNode key={key} value={key} x={x} y={y} />
    ))}
  </g>
);

const RotationAnimation = ({ rotationType, steps }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prevStep) => (prevStep + 1) % steps.length);
    }, 3000); // 增加间隔时间，给动画更多时间完成
    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="w-1/2 p-2">
      <h3 className="text-lg font-semibold mb-2">{rotationType}型旋转</h3>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <Tree nodes={steps[step].nodes} edges={steps[step].edges} />
      </svg>
    </div>
  );
};

const RotationDemo = () => {
  const rotations = {
    LL: [
      {
        nodes: { A: { x: 100, y: 30 }, B: { x: 50, y: 80 }, C: { x: 25, y: 130 } },
        edges: [['A', 'B'], ['B', 'C']]
      },
      {
        nodes: { B: { x: 100, y: 30 }, C: { x: 50, y: 80 }, A: { x: 150, y: 80 } },
        edges: [['B', 'C'], ['B', 'A']]
      }
    ],
    RR: [
      {
        nodes: { A: { x: 100, y: 30 }, B: { x: 150, y: 80 }, C: { x: 175, y: 130 } },
        edges: [['A', 'B'], ['B', 'C']]
      },
      {
        nodes: { B: { x: 100, y: 30 }, A: { x: 50, y: 80 }, C: { x: 150, y: 80 } },
        edges: [['B', 'A'], ['B', 'C']]
      }
    ],
    LR: [
      {
        nodes: { A: { x: 100, y: 30 }, B: { x: 50, y: 80 }, C: { x: 75, y: 130 } },
        edges: [['A', 'B'], ['B', 'C']]
      },
      {
        nodes: { A: { x: 100, y: 30 }, C: { x: 50, y: 80 }, B: { x: 25, y: 130 } },
        edges: [['A', 'C'], ['C', 'B']]
      },
      {
        nodes: { C: { x: 100, y: 30 }, B: { x: 50, y: 80 }, A: { x: 150, y: 80 } },
        edges: [['C', 'B'], ['C', 'A']]
      }
    ],
    RL: [
      {
        nodes: { A: { x: 100, y: 30 }, B: { x: 150, y: 80 }, C: { x: 125, y: 130 } },
        edges: [['A', 'B'], ['B', 'C']]
      },
      {
        nodes: { A: { x: 100, y: 30 }, C: { x: 150, y: 80 }, B: { x: 175, y: 130 } },
        edges: [['A', 'C'], ['C', 'B']]
      },
      {
        nodes: { C: { x: 100, y: 30 }, A: { x: 50, y: 80 }, B: { x: 150, y: 80 } },
        edges: [['C', 'A'], ['C', 'B']]
      }
    ]
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4">AVL树旋转演示</h2>
      <div className="flex flex-wrap">
        {Object.entries(rotations).map(([type, steps]) => (
          <RotationAnimation key={type} rotationType={type} steps={steps} />
        ))}
      </div>
    </div>
  );
};

export default RotationDemo;
