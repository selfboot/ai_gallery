import React, { useState, useEffect } from "react";
import { animated, useSpring } from "@react-spring/web";

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

  depth() {
    return Math.floor(Math.log2(this.heap.length)) + 1;
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

    if (
      leftIndex < this.heap.length &&
      this.heap[leftIndex] > this.heap[largest]
    ) {
      largest = leftIndex;
    }

    if (
      rightIndex < this.heap.length &&
      this.heap[rightIndex] > this.heap[largest]
    ) {
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
}

const HeapVisualization = () => {
  const [heap, setHeap] = useState(new MaxHeap());
  const [inputValue, setInputValue] = useState("");
  const [treeData, setTreeData] = useState([]);

  useEffect(() => {
    const initialHeap = new MaxHeap();
    [50, 30, 20, 15, 10, 8, 16, 4, 5, 6, 100, 300].forEach((value) =>
      initialHeap.insert(value)
    );
    setHeap(initialHeap);
  }, []);

  useEffect(() => {
    if (!heap.size()) return;

    const positions = calculatePositions(heap);
    setTreeData(positions.filter((pos) => pos.value !== 0));
  }, [heap]); // 更新依赖于 heap

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleInsert = () => {
    const value = parseInt(inputValue);
    if (!isNaN(value)) {
      const newHeap = new MaxHeap();
      newHeap.heap = [...heap.heap];
      newHeap.insert(value);
      setHeap(newHeap);
      setInputValue("");
    }
  };

  const handleRemove = () => {
    const newHeap = new MaxHeap();
    newHeap.heap = [...heap.heap];
    newHeap.remove();
    setHeap(newHeap);
  };

  const AnimatedNode = React.memo(({ node }) => {
    const style = useSpring({
      to: { x: node.x, y: node.y, opacity: 1 },
      from: { x: node.x, y: node.y, opacity: 0 },
      config: { tension: 250, friction: 20 },
    });

    return (
      <animated.g style={{ translateX: style.x, translateY: style.y }}>
        <circle cx="0" cy="0" r="15" fill="#bbf" stroke="#333" />
        <text x="0" y="0" textAnchor="middle" dy=".3em" fontSize="12">
          {node.value}
        </text>
      </animated.g>
    );
  });

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          className="border border-gray-300 rounded px-2 py-1 mr-2"
          placeholder="输入一个数字"
        />
        <button
          onClick={handleInsert}
          className="bg-blue-500 text-white px-4 py-1 rounded mr-2"
        >
          插入节点
        </button>
        <button
          onClick={handleRemove}
          className="bg-red-500 text-white px-4 py-1 rounded"
        >
          删除最大值
        </button>
      </div>
      <svg
        width={1200}
        height={600}
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid meet"
        className="border border-gray-300"
      >
        {treeData.map((node) => (
          <AnimatedNode key={node.id} node={node} />
        ))}
      </svg>
    </div>
  );
};

export default HeapVisualization;

function calculatePositions(heap) {
  const depth = heap.depth();
  const nodeWidth = 25; // 每个节点的宽度
  const nodeHeight = 50; // 每个节点的高度
  const spaceBetweenNodes = 40; // 节点之间的固定间隔
  const baseWidth = 1200; // SVG总宽度

  // 假设堆是满的情况下的所有节点的位置
  const totalCnt = Math.pow(2, depth) - 1;
  let fullPositions = Array(totalCnt).fill(null);

  // 计算每层的节点位置，这些位置是基于满二叉树的假设
  for (let level = depth - 1; level >= 0; level--) {
    const levelNodeCount = Math.pow(2, level);
    const levelNodeIndexes = Array.from(
      { length: levelNodeCount },
      (_, i) => Math.pow(2, level) - 1 + i
    );

    // console.log(level, levelNodeCount, levelNodeIndexes)
    // 如果是最底层，计算其起始X位置
    if (level === depth - 1) {
      let startX =
        (baseWidth -
          (levelNodeCount * nodeWidth +
            (levelNodeCount - 1) * spaceBetweenNodes)) /
        2;
      levelNodeIndexes.forEach((idx, i) => {
        fullPositions[idx] = {
          id: idx,
          value: heap.heap[idx],
          x: startX + i * (nodeWidth + spaceBetweenNodes),
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
