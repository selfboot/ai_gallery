import React, { useState, useEffect, useCallback } from "react";
import { animated } from "@react-spring/web";
import { useTranslation } from "react-i18next";
import Layout from "../../components/layout";
import PageHeader from "../../components/header";
import SEO from "../../components/seo";

const spaceBetweenNodes = 50; // 节点之间的固定间隔
const nodeHeight = 50; // 每个节点的高度
class MaxHeap {
  constructor() {
    this.heap = [];
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
    steps.push({ heap: [...this.heap], highlight: [i], newNode: i }); // Mark the new node

    while (i > 0) {
      const parentIndex = this.getParentIndex(i);
      if (this.heap[parentIndex] >= this.heap[i]) break;
      this.swap(i, parentIndex);
      steps.push({ heap: [...this.heap], highlight: [i, parentIndex], newNode: parentIndex }); // Track the new node's position
      i = parentIndex;
    }

    return steps;
  }

  removeWithSteps() {
    if (this.heap.length === 0) return null;
    const steps = [];
    const max = this.heap[0]; // 保存最大值
    this.heap[0] = this.heap.pop(); // 将最后一个元素移动到顶部
    steps.push({ heap: [...this.heap], highlight: [0], newNode: 0 }); // 标记新的顶部节点

    let i = 0;
    while (true) {
      const leftIndex = this.getLeftChildIndex(i);
      const rightIndex = this.getRightChildIndex(i);
      let largest = i;

      if (leftIndex < this.heap.length && this.heap[leftIndex] > this.heap[largest]) {
        largest = leftIndex;
      }
      if (rightIndex < this.heap.length && this.heap[rightIndex] > this.heap[largest]) {
        largest = rightIndex;
      }

      if (largest === i) break;

      this.swap(i, largest);
      steps.push({ heap: [...this.heap], highlight: [i, largest], newNode: largest }); // 突出显示交换的节点
      i = largest;
    }

    return { max, steps };
  }

  depth() {
    return this.heap.length === 0 ? 0 : Math.floor(Math.log2(this.heap.length)) + 1;
  }

  heapifyUp(i) {
    let parentIndex = this.getParentIndex(i);
    while (parentIndex >= 0 && this.heap[parentIndex] < this.heap[i]) {
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
    let largest = i;
    const leftIndex = this.getLeftChildIndex(i);
    const rightIndex = this.getRightChildIndex(i);

    if (leftIndex < this.heap.length && this.heap[leftIndex] > this.heap[largest]) {
      largest = leftIndex;
    }

    if (rightIndex < this.heap.length && this.heap[rightIndex] > this.heap[largest]) {
      largest = rightIndex;
    }

    if (largest !== i) {
      this.swap(i, largest);
      this.heapifyDown(largest);
    }
  }

  size() {
    return this.heap.length;
  }

  // 不会保留堆特征，用来存储中间状态的
  static fromArray(array) {
    const newHeap = new MaxHeap();
    for (const item of array) {
      newHeap.heap.push(item);
    }
    return newHeap;
  }
}

const HeapVisualization = () => {
  const [heap, setHeap] = useState(new MaxHeap());
  const [inputValue, setInputValue] = useState("");
  const [animationSteps, setAnimationSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [deletedNode, setDeletedNode] = useState(null);
  const { t } = useTranslation();

  useEffect(() => {
    const initialHeap = new MaxHeap();
    [50, 30, 20, 15, 10, 8, 16, 4, 5, 6, 100, 300].forEach((value) => initialHeap.insert(value));
    setHeap(initialHeap);
  }, []);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleInsert = useCallback(() => {
    const value = parseInt(inputValue);
    if (!isNaN(value) && !isAnimating) {
      const steps = heap.insertWithSteps(value);
      setAnimationSteps(steps);
      setCurrentStep(0);
      setIsAnimating(true);
      setInputValue("");
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

  useEffect(() => {
    if (isAnimating && currentStep < animationSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStep(currentStep + 1);
        if (currentStep >= animationSteps.length - 1) {
          setIsAnimating(false);
          setDeletedNode(null);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAnimating, currentStep, animationSteps]);

  const AnimatedNode = React.memo(({ node, isNew, isHighlighted, isDeleted }) => {
    const fill = isDeleted ? "#ef4444" : isNew ? "#f87171" : isHighlighted ? "#fbbf24" : "#bbf";

    return (
      <animated.g style={{ transform: `translate(${node.x}px, ${node.y}px)` }}>
        <animated.circle cx="0" cy="0" r="15" fill={fill} stroke="#333" />
        <animated.text x="0" y="0" textAnchor="middle" dy=".3em" fontSize="12">
          {node.value}
        </animated.text>
      </animated.g>
    );
  });

  const currentHeapState = isAnimating ? animationSteps[currentStep] : { heap: heap.heap };
  const positions = calculatePositions(MaxHeap.fromArray(currentHeapState.heap));

  return (
    <Layout>
      <SEO
        title="Heap Visualization"
        description="Learn and understand the heap algorithm through interactive visualization. Explore how heap sort works and enhance your algorithm knowledge. Source code is available."
        keywords="heap algorithm, heap sort, algorithm visualization, learn heap sort, data structures, algorithm education"
        canonicalUrl="https://gallery.selfboot.cn/algorithms/heap/"
      />
      <PageHeader />
      <div className="p-4">
        <div className="mb-4">
          <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            className="border border-gray-300 rounded px-2 py-1 mr-2"
            placeholder={t("input_number")}
            disabled={isAnimating}
          />
          <button
            onClick={handleInsert}
            className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
            disabled={isAnimating}
          >
            {t("insert_node")}
          </button>
          <button onClick={handleRemove} className="bg-red-500 text-white px-4 py-1 rounded" disabled={isAnimating}>
            {t("delete_root")}
          </button>
        </div>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <svg
            width={Math.max(1200, spaceBetweenNodes * Math.pow(2, heap.depth() - 1))}
            height={Math.max(600, nodeHeight * (heap.depth() + 1))}
            viewBox={`0 0 ${Math.max(1200, spaceBetweenNodes * Math.pow(2, heap.depth() - 1))} ${Math.max(
              600,
              nodeHeight * (heap.depth() + 1)
            )}`}
            preserveAspectRatio="xMidYMid meet"
            className="border border-gray-300"
          >
            {positions.map((node, index) => {
              const leftChildIdx = 2 * index + 1;
              const rightChildIdx = 2 * index + 2;
              const leftChild = positions.find((child) => child && child.id === leftChildIdx);
              const rightChild = positions.find((child) => child && child.id === rightChildIdx);

              const isHighlighted =
                isAnimating &&
                currentStep < animationSteps.length &&
                animationSteps[currentStep].highlight &&
                animationSteps[currentStep].highlight.includes(index);
              const isNew = isAnimating && animationSteps[currentStep].newNode === index;
              // console.log(currentStep, isHighlighted, isNew, treeData)
              return (
                <React.Fragment key={node.id}>
                  {leftChild && <line x1={node.x} y1={node.y} x2={leftChild.x} y2={leftChild.y} stroke="black" />}
                  {rightChild && <line x1={node.x} y1={node.y} x2={rightChild.x} y2={rightChild.y} stroke="black" />}
                  <AnimatedNode node={node} isNew={isNew} isHighlighted={isHighlighted} />
                </React.Fragment>
              );
            })}
            {deletedNode && (
              <g>
                <text
                  x={positions[0].x + spaceBetweenNodes * 2}
                  y={nodeHeight / 2}
                  textAnchor="middle"
                  fill="#333"
                  fontSize="14"
                >
                  {t("deleted_node")}
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
    </Layout>
  );
};

export default HeapVisualization;

function calculatePositions(heap) {
  const depth = heap.depth();
  const baseWidth = Math.max(1200, spaceBetweenNodes * Math.pow(2, depth - 1)); // SVG总宽度

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
      let startX = (baseWidth - (levelNodeCount - 1) * spaceBetweenNodes) / 2;
      levelNodeIndexes.forEach((idx, i) => {
        fullPositions[idx] = {
          id: idx,
          value: heap.heap[idx],
          x: startX + i * spaceBetweenNodes,
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
