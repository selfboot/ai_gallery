"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';

class AVLNode {
  constructor(value) {
    this.value = value;
    this.left = null;
    this.right = null;
    this.height = 1;
  }
}

class AVLTree {
  constructor() {
    this.root = null;
  }

  getHeight(node) {
    return node ? node.height : 0;
  }

  getBalanceFactor(node) {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  updateHeight(node) {
    node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
  }

  rotateRight(y) {
    const x = y.left;
    const T2 = x.right;
    x.right = y;
    y.left = T2;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  }

  rotateLeft(x) {
    const y = x.right;
    const T2 = y.left;
    y.left = x;
    x.right = T2;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  }

  insert(value) {
    this.root = this._insert(this.root, value);
  }

  _insert(node, value) {
    if (!node) return new AVLNode(value);

    if (value < node.value) {
      node.left = this._insert(node.left, value);
    } else if (value > node.value) {
      node.right = this._insert(node.right, value);
    } else {
      return node; // Duplicate values are not allowed
    }

    this.updateHeight(node);
    const balance = this.getBalanceFactor(node);

    // Left Left Case
    if (balance > 1 && value < node.left.value) {
      return this.rotateRight(node);
    }

    // Right Right Case
    if (balance < -1 && value > node.right.value) {
      return this.rotateLeft(node);
    }

    // Left Right Case
    if (balance > 1 && value > node.left.value) {
      node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }

    // Right Left Case
    if (balance < -1 && value < node.right.value) {
      node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }

    return node;
  }

  delete(value) {
    this.root = this._delete(this.root, value);
  }

  _delete(node, value) {
    if (!node) return null;

    if (value < node.value) {
      node.left = this._delete(node.left, value);
    } else if (value > node.value) {
      node.right = this._delete(node.right, value);
    } else {
      if (!node.left || !node.right) {
        const temp = node.left || node.right;
        if (!temp) {
          return null;
        } else {
          return temp;
        }
      } else {
        const temp = this.findMin(node.right);
        node.value = temp.value;
        node.right = this._delete(node.right, temp.value);
      }
    }

    this.updateHeight(node);
    const balance = this.getBalanceFactor(node);

    // Left Left Case
    if (balance > 1 && this.getBalanceFactor(node.left) >= 0) {
      return this.rotateRight(node);
    }

    // Left Right Case
    if (balance > 1 && this.getBalanceFactor(node.left) < 0) {
      node.left = this.rotateLeft(node.left);
      return this.rotateRight(node);
    }

    // Right Right Case
    if (balance < -1 && this.getBalanceFactor(node.right) <= 0) {
      return this.rotateLeft(node);
    }

    // Right Left Case
    if (balance < -1 && this.getBalanceFactor(node.right) > 0) {
      node.right = this.rotateRight(node.right);
      return this.rotateLeft(node);
    }

    return node;
  }

  findMin(node) {
    while (node.left) {
      node = node.left;
    }
    return node;
  }

  search(value) {
    return this._search(this.root, value);
  }

  _search(node, value) {
    if (!node) return false;
    if (node.value === value) return true;
    if (value < node.value) return this._search(node.left, value);
    return this._search(node.right, value);
  }

  insertWithSteps(value, steps) {
    this.root = this._insertWithSteps(this.root, value, steps);
  }

  _insertWithSteps(node, value, steps, parent = null) {
    if (!node) {
      steps.push({ type: 'insert', value, parent: parent ? parent.value : null });
      return new AVLNode(value);
    }

    steps.push({ type: 'compare', value, node: node.value });

    if (value < node.value) {
      node.left = this._insertWithSteps(node.left, value, steps, node);
    } else if (value > node.value) {
      node.right = this._insertWithSteps(node.right, value, steps, node);
    } else {
      return node; // Duplicate values are not allowed
    }

    // 只在需要旋转时添加步骤
    const balance = this.getBalanceFactor(node);
    if (Math.abs(balance) > 1) {
      steps.push({ type: 'checkBalance', node: node.value, balance });
      
      if (balance > 1) {
        if (value < node.left.value) {
          // Left Left Case
          steps.push({ type: 'rotate', rotationType: 'LL', pivot: node.value, child: node.left.value });
          return this.rotateRight(node);
        } else {
          // Left Right Case
          steps.push({ type: 'rotate', rotationType: 'LR', pivot: node.value, child: node.left.value, grandchild: node.left.right.value });
          node.left = this.rotateLeft(node.left);
          return this.rotateRight(node);
        }
      } else if (balance < -1) {
        if (value > node.right.value) {
          // Right Right Case
          steps.push({ type: 'rotate', rotationType: 'RR', pivot: node.value, child: node.right.value });
          return this.rotateLeft(node);
        } else {
          // Right Left Case
          steps.push({ type: 'rotate', rotationType: 'RL', pivot: node.value, child: node.right.value, grandchild: node.right.left.value });
          node.right = this.rotateRight(node.right);
          return this.rotateLeft(node);
        }
      }
    }

    return node;
  }
}

const AVLTreeVisualization = () => {
  const [tree, setTree] = useState(() => new AVLTree());
  const [inputValue, setInputValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [treeSize, setTreeSize] = useState(0);
  const [initialNodeCount, setInitialNodeCount] = useState(10);
  const [animationSteps, setAnimationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationSpeed = 1000; // Fixed animation speed
  const [treeLayout, setTreeLayout] = useState({ nodes: {}, height: 0, width: 0 });
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const NODE_WIDTH = 40;
  const NODE_HEIGHT = 40;
  const VERTICAL_SPACING = 60;
  const HORIZONTAL_SPACING = 20;
  const MIN_HEIGHT = 400; // 最小树高度

  const calculateTreeLayout = useCallback((root) => {
    const getHeight = (node) => {
      if (!node) return 0;
      return 1 + Math.max(getHeight(node.left), getHeight(node.right));
    };

    const height = getHeight(root);
    const layout = { nodes: {}, height: 0, width: 0 };

    const positionNode = (node, level, leftBound, rightBound) => {
      if (!node) return;

      const x = (leftBound + rightBound) / 2;
      const y = level * (NODE_HEIGHT + VERTICAL_SPACING) + NODE_HEIGHT / 2;

      layout.nodes[node.value] = { x, y };

      const childSpacing = (rightBound - leftBound) / 2;
      positionNode(node.left, level + 1, leftBound, x - HORIZONTAL_SPACING / 2);
      positionNode(node.right, level + 1, x + HORIZONTAL_SPACING / 2, rightBound);
    };

    const totalWidth = Math.pow(2, height - 1) * (NODE_WIDTH + HORIZONTAL_SPACING) - HORIZONTAL_SPACING;
    positionNode(root, 0, 0, totalWidth);

    layout.height = Math.max(MIN_HEIGHT, height * (NODE_HEIGHT + VERTICAL_SPACING) - VERTICAL_SPACING);
    layout.width = totalWidth + NODE_WIDTH;

    return layout;
  }, []);

  useEffect(() => {
    const layout = calculateTreeLayout(tree.root);
    setTreeLayout(layout);
  }, [tree, calculateTreeLayout]);

  const renderTree = useCallback((node) => {
    if (!node) return null;

    const nodeInfo = treeLayout.nodes[node.value];
    if (!nodeInfo) return null;

    const { x, y } = nodeInfo;

    const currentStepInfo = animationSteps[currentStep];
    const isHighlighted = currentStepInfo?.type === 'compare' && currentStepInfo.node === node.value;
    const isInserted = currentStepInfo?.type === 'insert' && currentStepInfo.value === node.value;
    const isRotating = currentStepInfo?.type === 'rotate' && 
      (currentStepInfo.pivot === node.value || currentStepInfo.child === node.value || currentStepInfo.grandchild === node.value);

    let fillColor = 'white';
    if (isHighlighted) fillColor = 'yellow';
    if (isInserted) fillColor = 'green';
    if (isRotating) fillColor = 'red';

    return (
      <g key={`${node.value}-${x}-${y}`}>
        <circle 
          cx={x} 
          cy={y} 
          r={NODE_WIDTH / 2} 
          fill={fillColor} 
          stroke="black" 
        />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle">
          {node.value}
        </text>
        {node.left && treeLayout.nodes[node.left.value] && (
          <line 
            x1={x} 
            y1={y + NODE_HEIGHT / 2} 
            x2={treeLayout.nodes[node.left.value].x} 
            y2={treeLayout.nodes[node.left.value].y - NODE_HEIGHT / 2} 
            stroke="black" 
          />
        )}
        {node.right && treeLayout.nodes[node.right.value] && (
          <line 
            x1={x} 
            y1={y + NODE_HEIGHT / 2} 
            x2={treeLayout.nodes[node.right.value].x} 
            y2={treeLayout.nodes[node.right.value].y - NODE_HEIGHT / 2} 
            stroke="black" 
          />
        )}
        {renderTree(node.left)}
        {renderTree(node.right)}
      </g>
    );
  }, [treeLayout, animationSteps, currentStep]);

  const handleInsert = useCallback(() => {
    if (inputValue) {
      const steps = [];
      const newTree = new AVLTree();
      newTree.root = JSON.parse(JSON.stringify(tree.root));
      newTree.insertWithSteps(parseInt(inputValue), steps);
      setAnimationSteps(steps);
      setCurrentStep(0);
      setIsAnimating(true);
    }
  }, [inputValue, tree]);

  const handleDelete = useCallback(() => {
    if (inputValue) {
      setTree(prevTree => {
        const newTree = new AVLTree();
        newTree.root = JSON.parse(JSON.stringify(prevTree.root));
        newTree.delete(parseInt(inputValue));
        return newTree;
      });
      setInputValue('');
      setTreeSize(prevSize => Math.max(0, prevSize - 1));
    }
  }, [inputValue]);

  const handleSearch = useCallback(() => {
    if (inputValue) {
      const result = tree.search(parseInt(inputValue));
      setSearchResult(result);
    }
  }, [inputValue, tree]);

  useEffect(() => {
    if (isAnimating && currentStep < animationSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prevStep => prevStep + 1);
        if (currentStep === animationSteps.length - 1) {
          setTree(prevTree => {
            const newTree = new AVLTree();
            newTree.root = JSON.parse(JSON.stringify(prevTree.root));
            newTree.insert(parseInt(inputValue));
            return newTree;
          });
          setTreeSize(prevSize => prevSize + 1);
          setIsAnimating(false);
        }
      }, animationSpeed);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, currentStep, animationSteps, animationSpeed, inputValue]);

  const initializeTree = useCallback(() => {
    const newTree = new AVLTree();
    for (let i = 0; i < initialNodeCount; i++) {
      const randomValue = Math.floor(Math.random() * 1000);
      newTree.insert(randomValue);
    }
    setTree(newTree);
    setTreeSize(initialNodeCount);
  }, [initialNodeCount]);

  useEffect(() => {
    initializeTree();
  }, [initializeTree]);

  return (
    <div className="container mx-auto flex flex-col md:flex-row">
      <div ref={containerRef} className="w-full md:w-3/4 mb-4 md:mb-0 md:pr-4 overflow-x-auto">
        <svg 
          ref={svgRef}
          width={treeLayout.width} 
          height={treeLayout.height} 
          viewBox={`0 0 ${treeLayout.width} ${treeLayout.height}`} 
          preserveAspectRatio="xMidYMin meet"
        >
          {renderTree(tree.root)}
        </svg>
        {isAnimating && (
          <div className="mt-4 text-center">
            {animationSteps[currentStep]?.type === 'compare' && `比较节点 ${animationSteps[currentStep].value} 和 ${animationSteps[currentStep].node}`}
            {animationSteps[currentStep]?.type === 'insert' && `插入节点 ${animationSteps[currentStep].value}`}
            {animationSteps[currentStep]?.type === 'rotate' && `执行 ${animationSteps[currentStep].rotationType} 旋转`}
          </div>
        )}
      </div>
      <div className="w-full md:w-1/4">
        <div className="mb-4">
          <label className="block mb-2">初始节点数量：</label>
          <input
            type="number"
            value={initialNodeCount}
            onChange={(e) => setInitialNodeCount(parseInt(e.target.value))}
            className="border p-2 w-full"
          />
          <button
            onClick={initializeTree}
            className="bg-blue-500 text-white p-2 mt-2 w-full"
          >
            初始化树
          </button>
        </div>
        <div className="mb-4">
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="border p-2 w-full mb-2"
            placeholder="输入一个数字"
          />
          <div className="flex space-x-2">
            <button
              onClick={handleInsert}
              className="bg-green-500 text-white p-2 flex-1"
            >
              插入
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-500 text-white p-2 flex-1"
            >
              删除
            </button>
            <button
              onClick={handleSearch}
              className="bg-yellow-500 text-white p-2 flex-1"
            >
              查找
            </button>
          </div>
          {searchResult !== null && (
            <span className="block mt-2 text-center">
              {searchResult ? '找到了' : '未找到'}
            </span>
          )}
        </div>
        <div className="mb-4">
          当前树的节点数：{treeSize}
        </div>
      </div>
    </div>
  );
};

export default AVLTreeVisualization;