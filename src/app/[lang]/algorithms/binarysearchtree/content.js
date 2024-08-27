"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Combobox } from "@headlessui/react";

class TreeNode {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
    this.x = 0;
    this.y = 0;
    this.highlighted = false;
  }
}

class BinarySearchTree {
  constructor() {
    this.root = null;
    this.operationPath = [];
  }

  insert(key) {
    this.operationPath = [];
    this.root = this._insertRec(this.root, key);
    this._updateLayout();
    return { path: this.operationPath, newNode: this.operationPath[this.operationPath.length - 1] };
  }

  _insertRec(root, key, path = []) {
    if (root === null) {
      const newNode = new TreeNode(key);
      this.operationPath = [...path, newNode];
      return newNode;
    }
    this.operationPath.push(root);
    if (key < root.key) {
      root.left = this._insertRec(root.left, key, [...path, root]);
    } else if (key > root.key) {
      root.right = this._insertRec(root.right, key, [...path, root]);
    }
    return root;
  }

  delete(key) {
    this.operationPath = [];
    this.root = this._deleteRec(this.root, key);
    this._updateLayout();
    return this.operationPath;
  }

  _deleteRec(root, key) {
    if (root === null) return root;
    this.operationPath.push(root);
    if (key < root.key) {
      root.left = this._deleteRec(root.left, key);
    } else if (key > root.key) {
      root.right = this._deleteRec(root.right, key);
    } else {
      if (root.left === null) return root.right;
      else if (root.right === null) return root.left;
      root.key = this._minValue(root.right);
      root.right = this._deleteRec(root.right, root.key);
    }
    return root;
  }

  _minValue(root) {
    let minv = root.key;
    while (root.left !== null) {
      minv = root.left.key;
      root = root.left;
    }
    return minv;
  }

  search(key) {
    this.operationPath = [];
    const result = this._searchRec(this.root, key);
    return { path: this.operationPath, found: result !== null };
  }

  _searchRec(root, key) {
    if (root === null || root.key === key) {
      if (root) this.operationPath.push(root);
      return root;
    }
    this.operationPath.push(root);
    if (root.key > key) return this._searchRec(root.left, key);
    return this._searchRec(root.right, key);
  }

  _updateLayout() {
    const nodeSize = 40;
    const horizontalSpacing = 20;
    const verticalSpacing = 60;

    const getNodeCount = (node) => {
      if (!node) return 0;
      return 1 + getNodeCount(node.left) + getNodeCount(node.right);
    };

    const assignCoordinates = (node, level, leftBound, rightBound) => {
      if (!node) return;

      const leftCount = getNodeCount(node.left);
      const rightCount = getNodeCount(node.right);
      const totalCount = leftCount + rightCount + 1;

      // 计算当前节点的x坐标
      node.x = leftBound + (rightBound - leftBound) * ((leftCount + 0.5) / totalCount);
      node.y = level * verticalSpacing;

      // 递归地为左右子树分配坐标
      if (node.left) {
        assignCoordinates(node.left, level + 1, leftBound, node.x - horizontalSpacing / 2);
      }
      if (node.right) {
        assignCoordinates(node.right, level + 1, node.x + horizontalSpacing / 2, rightBound);
      }
    };

    // 计算树的总宽度
    const treeWidth = getNodeCount(this.root) * (nodeSize + horizontalSpacing);
    assignCoordinates(this.root, 0, 0, treeWidth);
  }
}

const BinarySearchTreeVisualization = () => {
  const [tree, setTree] = useState(new BinarySearchTree());
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [nodeCount, setNodeCount] = useState(10);
  const [initMethod, setInitMethod] = useState("random");
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const svgRef = useRef(null);
  const [specialNode, setSpecialNode] = useState(null);

  useEffect(() => {
    initializeTree();
  }, [nodeCount, initMethod]);

  const initializeTree = () => {
    const newTree = new BinarySearchTree();
    const keys = [];

    if (initMethod === "random") {
      for (let i = 0; i < nodeCount; i++) {
        keys.push(Math.floor(Math.random() * 1000));
      }
    } else {
      for (let i = 0; i < nodeCount; i++) {
        keys.push(i);
      }
    }

    keys.forEach((key) => newTree.insert(key));
    setTree(newTree);
    setMessage(`Initialized tree with ${nodeCount} nodes using ${initMethod} method`);
  };

  const animateOperation = useCallback(
    async (operation, key) => {
      const newTree = new BinarySearchTree();
      newTree.root = JSON.parse(JSON.stringify(tree.root));

      let path;
      let result;

      if (operation === "insert") {
        const insertResult = newTree.insert(parseInt(key));
        path = insertResult.path;
        result = insertResult.newNode;
      } else if (operation === "delete") {
        path = newTree.delete(parseInt(key));
      } else {
        // search
        const searchResult = newTree.search(parseInt(key));
        path = searchResult.path;
        result = searchResult.found;
      }

      // 高亮路径
      for (let i = 0; i < path.length; i++) {
        setHighlightedNodes(path.slice(0, i + 1).map((node) => node.key));
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 处理特殊节点（插入的新节点或搜索结果）
      if (operation === "insert" || operation === "search") {
        const lastNode = path[path.length - 1];
        if (lastNode) {
          let color;
          if (operation === "insert") {
            color = "yellow";
          } else {
            // search
            color = result ? "green" : "red";
          }
          setSpecialNode({
            key: lastNode.key,
            color: color,
          });
          setHighlightedNodes(path.map((node) => node.key)); // 确保路径保持高亮
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // 取消所有高亮
      await new Promise((resolve) => setTimeout(resolve, 500));
      setHighlightedNodes([]);
      setSpecialNode(null);

      setTree(newTree);
    },
    [tree]
  );

  const handleInsert = useCallback(() => {
    if (inputValue) {
      animateOperation("insert", inputValue);
      setMessage(`Inserted ${inputValue}`);
      setInputValue("");
    }
  }, [inputValue, tree]);

  const handleDelete = useCallback(() => {
    if (inputValue) {
      animateOperation("delete", inputValue);
      setMessage(`Deleted ${inputValue}`);
      setInputValue("");
    }
  }, [inputValue, tree]);

  const handleSearch = useCallback(() => {
    if (inputValue) {
      animateOperation("search", inputValue);
      const searchResult = tree.search(parseInt(inputValue));
      setMessage(searchResult.found ? `Found ${inputValue}` : `${inputValue} not found`);
      setInputValue("");
    }
  }, [inputValue, tree]);

  const renderTree = useCallback(
    (node) => {
      if (!node) return null;
      const nodeSize = 40;
      const isHighlighted = highlightedNodes.includes(node.key);
      const isSpecial = specialNode && specialNode.key === node.key;

      let fillColor = "#4299e1"; // 默认蓝色
      if (isSpecial) {
        fillColor = specialNode.color;
        console.log("Special Node", node.key, fillColor);
      } else if (isHighlighted) {
        fillColor = "#f6e05e"; // 高亮黄色
      }

      return (
        <g key={node.key}>
          <circle cx={node.x} cy={node.y} r={nodeSize / 2} fill={fillColor} />
          <text x={node.x} y={node.y} textAnchor="middle" dy=".3em" fill="white">
            {node.key}
          </text>
          {node.left && (
            <>
              <line
                x1={node.x}
                y1={node.y + nodeSize / 2}
                x2={node.left.x}
                y2={node.left.y - nodeSize / 2}
                stroke="#4299e1"
              />
              {renderTree(node.left)}
            </>
          )}
          {node.right && (
            <>
              <line
                x1={node.x}
                y1={node.y + nodeSize / 2}
                x2={node.right.x}
                y2={node.right.y - nodeSize / 2}
                stroke="#4299e1"
              />
              {renderTree(node.right)}
            </>
          )}
        </g>
      );
    },
    [highlightedNodes, specialNode]
  );

  const getTreeDimensions = useCallback((node) => {
    if (!node) return { minX: 0, maxX: 0, maxY: 0 };
    const leftDim = getTreeDimensions(node.left);
    const rightDim = getTreeDimensions(node.right);
    return {
      minX: Math.min(node.x, leftDim.minX, rightDim.minX),
      maxX: Math.max(node.x, leftDim.maxX, rightDim.maxX),
      maxY: Math.max(node.y, leftDim.maxY, rightDim.maxY),
    };
  }, []);

  const treeDimensions = getTreeDimensions(tree.root);
  const svgWidth = treeDimensions.maxX - treeDimensions.minX + 100;
  const svgHeight = treeDimensions.maxY + 100;

  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    }
  }, [svgWidth, svgHeight]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Binary Search Tree Visualization</h1>
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-3/4 mb-4 lg:mb-0 lg:pr-4">
          <div className="border rounded overflow-auto" style={{ maxHeight: "80vh" }}>
            <svg ref={svgRef} width={svgWidth} height={svgHeight} className="min-w-full">
              <g transform={`translate(${-treeDimensions.minX + 50}, 50)`}>{renderTree(tree.root)}</g>
            </svg>
          </div>
        </div>
        <div className="lg:w-1/4">
          <div className="mb-4">
            <label className="block mb-2">Node Count (1-50):</label>
            <input
              type="number"
              min="1"
              max="50"
              value={nodeCount}
              onChange={(e) => setNodeCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">Initialization Method:</label>
            <select
              value={initMethod}
              onChange={(e) => setInitMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="random">Random</option>
              <option value="sequential">Sequential</option>
            </select>
          </div>
          <button
            onClick={initializeTree}
            className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Initialize Tree
          </button>
          <div className="mb-4">
            <Combobox value={inputValue} onChange={setInputValue}>
              <Combobox.Input
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Enter a number"
              />
            </Combobox>
          </div>
          <button
            onClick={handleInsert}
            className="w-full mb-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Insert
          </button>
          <button
            onClick={handleDelete}
            className="w-full mb-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
          <button
            onClick={handleSearch}
            className="w-full mb-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            Search
          </button>
          <div className="mb-4">{message}</div>
        </div>
      </div>
    </div>
  );
};

export default BinarySearchTreeVisualization;
