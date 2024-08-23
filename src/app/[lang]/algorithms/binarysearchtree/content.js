"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Combobox } from '@headlessui/react';

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
    this.insertionPath = [];
  }

  insert(key) {
    this.insertionPath = [];
    this.root = this._insertRec(this.root, key);
    this._updateLayout();
    return this.insertionPath;
  }

  _insertRec(root, key, path = []) {
    if (root === null) {
      const newNode = new TreeNode(key);
      this.insertionPath = [...path, newNode];
      return newNode;
    }
    this.insertionPath.push(root);
    if (key < root.key) {
      root.left = this._insertRec(root.left, key, [...path, root]);
    } else if (key > root.key) {
      root.right = this._insertRec(root.right, key, [...path, root]);
    }
    return root;
  }

  delete(key) {
    this.root = this._deleteRec(this.root, key);
    this._updateLayout();
  }

  _deleteRec(root, key) {
    if (root === null) return root;
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
    return this._searchRec(this.root, key);
  }

  _searchRec(root, key) {
    if (root === null || root.key === key) return root;
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

  resetHighlights() {
    const resetNode = (node) => {
      if (node) {
        node.highlighted = false;
        resetNode(node.left);
        resetNode(node.right);
      }
    };
    resetNode(this.root);
  }
}

const BinarySearchTreeVisualization = () => {
  const [tree, setTree] = useState(new BinarySearchTree());
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Initialize the tree with some data
    const initialData = [50, 30, 70, 20, 40, 60, 80, 125, 145, 144, 156, 245];
    const newTree = new BinarySearchTree();
    initialData.forEach(key => newTree.insert(key));
    setTree(newTree);
  }, []);

  const handleInsert = useCallback(() => {
    if (inputValue) {
      const newTree = new BinarySearchTree();
      newTree.root = JSON.parse(JSON.stringify(tree.root));
      newTree.insert(parseInt(inputValue));
      setTree(newTree);
      setMessage(`Inserted ${inputValue}`);
      setInputValue('');
    }
  }, [inputValue, tree]);

  const handleDelete = useCallback(() => {
    if (inputValue) {
      const newTree = new BinarySearchTree();
      newTree.root = JSON.parse(JSON.stringify(tree.root));
      newTree.delete(parseInt(inputValue));
      setTree(newTree);
      setMessage(`Deleted ${inputValue}`);
      setInputValue('');
    }
  }, [inputValue, tree]);

  const handleSearch = useCallback(() => {
    if (inputValue) {
      const result = tree.search(parseInt(inputValue));
      setMessage(result ? `Found ${inputValue}` : `${inputValue} not found`);
      setInputValue('');
    }
  }, [inputValue, tree]);

  const renderTree = useCallback((node) => {
    if (!node) return null;
    const nodeSize = 40;

    return (
      <g key={node.key}>
        <circle cx={node.x} cy={node.y} r={nodeSize / 2} fill="#4299e1" />
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
  }, []);

  const getTreeDimensions = useCallback((node) => {
    if (!node) return { minX: 0, maxX: 0, maxY: 0 };
    const leftDim = getTreeDimensions(node.left);
    const rightDim = getTreeDimensions(node.right);
    return {
      minX: Math.min(node.x, leftDim.minX, rightDim.minX),
      maxX: Math.max(node.x, leftDim.maxX, rightDim.maxX),
      maxY: Math.max(node.y, leftDim.maxY, rightDim.maxY)
    };
  }, []);

  const treeDimensions = getTreeDimensions(tree.root);
  const svgWidth = treeDimensions.maxX - treeDimensions.minX + 100;
  const svgHeight = treeDimensions.maxY + 100;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Binary Search Tree Visualization</h1>
      <div className="flex mb-4">
        <Combobox value={inputValue} onChange={setInputValue}>
          <Combobox.Input
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Enter a number"
          />
        </Combobox>
        <button
          onClick={handleInsert}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Insert
        </button>
        <button
          onClick={handleDelete}
          className="ml-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Delete
        </button>
        <button
          onClick={handleSearch}
          className="ml-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Search
        </button>
      </div>
      <div className="mb-4">{message}</div>
      <svg width={svgWidth} height={svgHeight} className="border rounded">
        <g transform={`translate(${-treeDimensions.minX + 50}, 50)`}>
          {renderTree(tree.root)}
        </g>
      </svg>
    </div>
  );
};

export default BinarySearchTreeVisualization;