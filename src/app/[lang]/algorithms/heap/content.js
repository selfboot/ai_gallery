'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { animated } from '@react-spring/web';
import { useI18n } from '@/app/i18n/client';
import { CustomListbox } from '@/app/components/listbox';

const spaceBetweenNodes = 50; // 节点之间的固定间隔
const nodeHeight = 70; // 每个节点的高度
const MIN_NODE_RADIUS = 20; // 节点圆形的最小半径
const MIN_NODE_SPACING = 60; // 节点之间的最小间距

const HEAP_TYPES = {
  MAX: 'max',
  MIN: 'min',
};

class Heap {
  constructor(type = HEAP_TYPES.MAX) {
    this.heap = [];
    this.type = type;
  }

  getParentIndex(i) {
    return Math.floor((i - 1) / 2);
  }

  getLeftChildIndex(i) {
    return 2 * i + 1;
  }

  getRightChildIndex(i) {
    return 2 * i + 2;
  }

  swap(i1, i2) {
    [this.heap[i1], this.heap[i2]] = [this.heap[i2], this.heap[i1]];
  }

  insert(key) {
    this.heap.push(key);
    this.heapifyUp(this.heap.length - 1);
  }

  insertWithSteps(key) {
    const steps = [];
    this.heap.push(key);
    let i = this.heap.length - 1;
    steps.push({ heap: [...this.heap], highlight: [i], newNode: i });

    while (i > 0) {
      const parentIndex = this.getParentIndex(i);
      if (!this.compare(this.heap[i], this.heap[parentIndex])) break;
      this.swap(i, parentIndex);
      steps.push({ heap: [...this.heap], highlight: [i, parentIndex], newNode: parentIndex });
      i = parentIndex;
    }

    return steps;
  }

  removeWithSteps() {
    if (this.heap.length === 0) return null;
    const steps = [];
    const root = this.heap[0];
    this.heap[0] = this.heap.pop();
    steps.push({ heap: [...this.heap], highlight: [0], newNode: 0 });

    let i = 0;
    while (true) {
      const leftIndex = this.getLeftChildIndex(i);
      const rightIndex = this.getRightChildIndex(i);
      let target = i;

      if (leftIndex < this.heap.length && this.compare(this.heap[leftIndex], this.heap[target])) {
        target = leftIndex;
      }
      if (rightIndex < this.heap.length && this.compare(this.heap[rightIndex], this.heap[target])) {
        target = rightIndex;
      }

      if (target === i) break;

      this.swap(i, target);
      steps.push({ heap: [...this.heap], highlight: [i, target], newNode: target });
      i = target;
    }

    return { max: root, steps };
  }

  depth() {
    return this.heap.length === 0 ? 0 : Math.floor(Math.log2(this.heap.length)) + 1;
  }

  heapifyUp(i) {
    let parentIndex = this.getParentIndex(i);
    while (parentIndex >= 0 && this.compare(this.heap[i], this.heap[parentIndex])) {
      this.swap(i, parentIndex);
      i = parentIndex;
      parentIndex = this.getParentIndex(i);
    }
  }

  remove() {
    if (this.heap.length === 0) return null;
    const max = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.heapifyDown(0);
    return max;
  }

  heapifyDown(i) {
    let target = i;
    const leftIndex = this.getLeftChildIndex(i);
    const rightIndex = this.getRightChildIndex(i);

    if (leftIndex < this.heap.length && this.compare(this.heap[leftIndex], this.heap[target])) {
      target = leftIndex;
    }

    if (rightIndex < this.heap.length && this.compare(this.heap[rightIndex], this.heap[target])) {
      target = rightIndex;
    }

    if (target !== i) {
      this.swap(i, target);
      this.heapifyDown(target);
    }
  }

  size() {
    return this.heap.length;
  }

  // 不会保留堆特征，用来存储中间状态的
  static fromArray(array) {
    const newHeap = new Heap();
    for (const item of array) {
      newHeap.heap.push(item);
    }
    return newHeap;
  }

  compare(a, b) {
    if (this.type === HEAP_TYPES.MAX) {
      return a > b;
    } else {
      return a < b;
    }
  }
}

const HeapVisualization = () => {
  const [heapType, setHeapType] = useState(HEAP_TYPES.MAX);
  const [heap, setHeap] = useState(() => {
    const initialHeap = new Heap(HEAP_TYPES.MAX);
    [50, 30, 20, 15, 10, 8, 16, 4, 5, 6, 100, 300].forEach((value) => initialHeap.insert(value));
    return initialHeap;
  });
  const [inputValue, setInputValue] = useState('');
  const [animationSteps, setAnimationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [deletedNode, setDeletedNode] = useState(null);
  const { t } = useI18n();
  const [windowWidth, setWindowWidth] = useState(1200);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleInsert = useCallback(() => {
    const value = parseInt(inputValue);
    if (!isNaN(value) && !isAnimating) {
      const newHeap = new Heap(heap.type);
      newHeap.heap = [...heap.heap];

      const steps = newHeap.insertWithSteps(value);
      setHeap(newHeap);
      setAnimationSteps(steps);
      setCurrentStep(0);
      setIsAnimating(true);
      setInputValue('');
    }
  }, [inputValue, heap, isAnimating]);

  const handleRemove = useCallback(() => {
    if (!isAnimating && heap.size() > 0) {
      const { max, steps } = heap.removeWithSteps();
      setDeletedNode(max);
      setAnimationSteps(steps);
      setCurrentStep(0);
      setIsAnimating(true);
    }
  }, [heap, isAnimating]);

  const handleRandomInit = useCallback(() => {
    if (!isAnimating) {
      const newHeap = new Heap(heapType);
      const count = Math.floor(Math.random() * 39) + 10;
      const numbers = Array.from({ length: count }, () => Math.floor(Math.random() * 1000));

      numbers.forEach((num) => newHeap.insert(num));
      setHeap(newHeap);
    }
  }, [isAnimating, heapType]);

  useEffect(() => {
    if (isAnimating && currentStep < animationSteps.length) {
      // 使用当前步骤的堆状态更新显示
      const currentStepData = animationSteps[currentStep];
      const newHeap = new Heap(heap.type);
      newHeap.heap = [...currentStepData.heap];
      setHeap(newHeap);

      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1);
        if (currentStep >= animationSteps.length - 1) {
          setIsAnimating(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAnimating, currentStep, animationSteps, heap.type]);

  const handleHeapTypeChange = useCallback(
    (newType) => {
      if (!isAnimating) {
        const currentNumbers = [...heap.heap];
        const newHeap = new Heap(newType);
        currentNumbers.forEach((num) => newHeap.insert(num));
        setHeapType(newType);
        setHeap(newHeap);
        setDeletedNode(null);
      }
    },
    [isAnimating, heap]
  );

  const AnimatedNode = React.memo(({ node, isNew, isHighlighted, isDeleted }) => {
    const fill = isDeleted ? '#ef4444' : isNew ? '#f87171' : isHighlighted ? '#fbbf24' : '#bbf';
    return (
      <animated.g style={{ transform: `translate(${node.x}px, ${node.y}px)` }}>
        <animated.circle cx="0" cy="0" r={MIN_NODE_RADIUS} fill={fill} stroke="#333" strokeWidth="2" />
        <animated.text x="0" y="0" textAnchor="middle" dy=".3em" fontSize={MIN_NODE_RADIUS * 0.8} fontWeight="bold">
          {node.value}
        </animated.text>
      </animated.g>
    );
  });

  AnimatedNode.displayName = 'AnimatedNode';

  const positions = useMemo(() => {
    return calculatePositions(heap, windowWidth);
  }, [heap, windowWidth]);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4">
      <div className="w-full lg:w-4/5">
        <div className="overflow-x-auto overflow-y-hidden w-full border border-gray-200 rounded-lg">
          <div
            style={{
              height: Math.max(400, nodeHeight * (heap.depth() + 1)),
              width: Math.max(MIN_NODE_SPACING * Math.pow(2, heap.depth() - 1), windowWidth * 0.8),
            }}
          >
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${Math.max(windowWidth * 0.8, MIN_NODE_SPACING * Math.pow(2, heap.depth() - 1))} ${Math.max(
                400,
                nodeHeight * (heap.depth() + 1)
              )}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {positions.map((node, index) => {
                const leftChildIdx = 2 * index + 1;
                const rightChildIdx = 2 * index + 2;
                const leftChild = positions.find((child) => child && child.id === leftChildIdx);
                const rightChild = positions.find((child) => child && child.id === rightChildIdx);

                const currentStepData =
                  isAnimating && currentStep < animationSteps.length ? animationSteps[currentStep] : null;

                const isHighlighted = currentStepData?.highlight?.includes(index) || false;
                const isNew = currentStepData?.newNode === index || false;

                return (
                  <React.Fragment key={node.id}>
                    {leftChild && <line x1={node.x} y1={node.y} x2={leftChild.x} y2={leftChild.y} stroke="black" />}
                    {rightChild && <line x1={node.x} y1={node.y} x2={rightChild.x} y2={rightChild.y} stroke="black" />}
                    <AnimatedNode node={node} isNew={isNew} isHighlighted={isHighlighted} />
                  </React.Fragment>
                );
              })}
              {deletedNode && positions.length > 0 && (
                <g>
                  <text
                    x={positions[0].x + spaceBetweenNodes * 2}
                    y={nodeHeight / 2}
                    textAnchor="middle"
                    fill="#333"
                    fontSize="14"
                  >
                    {t('deleted_node')}
                  </text>
                  <AnimatedNode
                    node={{ x: positions[0].x + spaceBetweenNodes * 2, y: positions[0].y, value: deletedNode }}
                    isDeleted={true}
                  />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/5">
        <div className="flex flex-col gap-4">
          <h3 className="text-lg">{t('settings')}</h3>
          <div className="space-y-4">
            <div className="space-y-4">
              {t('heap_type')}
              <CustomListbox
                value={t(heapType === HEAP_TYPES.MAX ? 'max_heap' : 'min_heap')}
                onChange={(value) => handleHeapTypeChange(value === t('max_heap') ? HEAP_TYPES.MAX : HEAP_TYPES.MIN)}
                options={[t('max_heap'), t('min_heap')]}
              />
            </div>

            <div className="w-full flex flex-nowrap items-center gap-2">
              <button
                onClick={handleInsert}
                className="flex-none bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors whitespace-nowrap"
                disabled={isAnimating}
              >
                {t('insert_node')}
              </button>

              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className="w-full min-w-0 border border-gray-300 rounded px-3 py-2"
                placeholder={t('input_number')}
                disabled={isAnimating}
              />
            </div>

            <button
              onClick={handleRemove}
              className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
              disabled={isAnimating}
            >
              {t('delete_root')}
            </button>

            <button
              onClick={handleRandomInit}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
              disabled={isAnimating}
            >
              {t('random_init')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeapVisualization;

function calculatePositions(heap, windowWidth) {
  const depth = heap.depth();
  const minRequiredWidth = MIN_NODE_SPACING * Math.pow(2, depth - 1);
  const minWidth = Math.max(minRequiredWidth, windowWidth * 0.8);

  // 假设堆是满的情况下的所有节点的位置
  const totalCnt = Math.pow(2, depth) - 1;
  let fullPositions = Array(totalCnt).fill(null);

  // 计算每层的节点位置，这些位置是基于满二叉树的假设
  for (let level = depth - 1; level >= 0; level--) {
    const levelNodeCount = Math.pow(2, level);
    const levelNodeIndexes = Array.from({ length: levelNodeCount }, (_, i) => Math.pow(2, level) - 1 + i);

    // console.log(level, levelNodeCount, levelNodeIndexes)
    // 如果是最底层，计算其起始X位置
    if (level === depth - 1) {
      let startX = (minWidth - (levelNodeCount - 1) * MIN_NODE_SPACING) / 2;
      levelNodeIndexes.forEach((idx, i) => {
        fullPositions[idx] = {
          id: idx,
          value: heap.heap[idx],
          x: startX + i * MIN_NODE_SPACING,
          y: nodeHeight * (level + 1),
        };
      });
    } else {
      // 计算非最底层的节点位置
      levelNodeIndexes.forEach((idx) => {
        const leftChildIdx = 2 * idx + 1;
        const rightChildIdx = leftChildIdx + 1;
        const childrenX = [leftChildIdx, rightChildIdx]
          .filter((index) => fullPositions[index])
          .map((index) => fullPositions[index].x);

        const x = childrenX.reduce((a, b) => a + b, 0) / childrenX.length;
        fullPositions[idx] = {
          id: idx,
          value: heap.heap[idx],
          x: x,
          y: nodeHeight * (level + 1),
        };
      });
    }
  }

  // 筛选出实际存在于堆中的节点的位置
  const actualPositions = fullPositions
    .map((pos, idx) => {
      if (idx < heap.size()) {
        return {
          ...pos,
          value: heap.heap[idx], // 只有实际存在的节点才有值
        };
      }
      return null;
    })
    .filter((pos) => pos !== null); // 移除所有不存在的节点位置

  return actualPositions;
}
