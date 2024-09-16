"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';

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
}

const AVLTreeVisualization = () => {
  const [tree, setTree] = useState(() => new AVLTree());
  const [inputValue, setInputValue] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [treeSize, setTreeSize] = useState(0);
  const [initialNodeCount, setInitialNodeCount] = useState(10);

  const handleInsert = useCallback(() => {
    if (inputValue) {
      setTree(prevTree => {
        const newTree = new AVLTree();
        if (prevTree.root) {
          newTree.root = JSON.parse(JSON.stringify(prevTree.root));
        }
        newTree.insert(parseInt(inputValue));
        return newTree;
      });
      setInputValue('');
      setTreeSize(prevSize => prevSize + 1);
    }
  }, [inputValue]);

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

  const renderTree = useCallback((node, x, y, level) => {
    if (!node) return null;

    const spacing = 200 / (level + 1);

    return (
      <g key={`${node.value}-${x}-${y}`}>
        <circle cx={x} cy={y} r="20" fill="white" stroke="black" />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="middle">
          {node.value}
        </text>
        {node.left && (
          <>
            <line
              x1={x}
              y1={y + 20}
              x2={x - spacing}
              y2={y + 80}
              stroke="black"
            />
            {renderTree(node.left, x - spacing, y + 100, level + 1)}
          </>
        )}
        {node.right && (
          <>
            <line
              x1={x}
              y1={y + 20}
              x2={x + spacing}
              y2={y + 80}
              stroke="black"
            />
            {renderTree(node.right, x + spacing, y + 100, level + 1)}
          </>
        )}
      </g>
    );
  }, []);

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
      <div className="w-full md:w-3/4 mb-4 md:mb-0 md:pr-4">
        <svg width="100%" height="400" viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
          {renderTree(tree.root, 400, 50, 0)}
        </svg>
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