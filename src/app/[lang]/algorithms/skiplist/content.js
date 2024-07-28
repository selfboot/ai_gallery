"use client";
import React, { useState, useEffect } from 'react';
import { useI18n } from "@/app/i18n/client";

class SkipListNode {
  constructor(value, level) {
    this.value = value;
    this.forward = new Array(level).fill(null);
  }
}

class SkipList {
  constructor(maxHeight = 12, branchingFactor = 4) {
    this.maxHeight = maxHeight;
    this.branchingFactor = branchingFactor;
    this.header = new SkipListNode(-Infinity, this.maxHeight);
    this.nil = new SkipListNode(Infinity, this.maxHeight);
    for (let i = 0; i < this.maxHeight; i++) {
      this.header.forward[i] = this.nil;
    }
    this.level = 0;
  }

  randomLevel() {
    let height = 1;
    while (height < this.maxHeight && Math.random() < 1 / this.branchingFactor) {
      height++;
    }
    return height;
  }

  insert(value) {
    const update = new Array(this.maxHeight).fill(null);
    let current = this.header;

    for (let i = this.level - 1; i >= 0; i--) {
      while (current.forward[i] && current.forward[i].value < value) {
        current = current.forward[i];
      }
      update[i] = current;
    }

    current = current.forward[0];

    if (current && current.value === value) {
      return false; // Value already exists, do not insert
    }

    const level = this.randomLevel();
    if (level > this.level) {
      for (let i = this.level; i < level; i++) {
        update[i] = this.header;
      }
      this.level = level;
    }

    const newNode = new SkipListNode(value, level);
    for (let i = 0; i < level; i++) {
      newNode.forward[i] = update[i].forward[i];
      update[i].forward[i] = newNode;
    }

    return true; // Insertion successful
  }

  search(value) {
    let current = this.header;
    for (let i = this.level - 1; i >= 0; i--) {
      while (current.forward[i] && current.forward[i].value < value) {
        current = current.forward[i];
      }
    }
    current = current.forward[0];
    return current && current.value === value;
  }

  delete(value) {
    const update = new Array(this.maxHeight).fill(null);
    let current = this.header;

    for (let i = this.level - 1; i >= 0; i--) {
      while (current.forward[i] && current.forward[i].value < value) {
        current = current.forward[i];
      }
      update[i] = current;
    }

    current = current.forward[0];
    if (current && current.value === value) {
      for (let i = 0; i < this.level; i++) {
        if (update[i].forward[i] !== current) {
          break;
        }
        update[i].forward[i] = current.forward[i];
      }

      while (this.level > 1 && !this.header.forward[this.level - 1]) {
        this.level--;
      }
    }
  }

  getNodes() {
    const nodes = [{ value: 'HEAD', levels: this.maxHeight }];
    let current = this.header.forward[0];
    while (current !== this.nil) {
      nodes.push({
        value: current.value,
        levels: current.forward.length
      });
      current = current.forward[0];
    }
    nodes.push({ value: 'NIL', levels: this.maxHeight });
    return nodes;
  }
}


const SkipListNodeComponent = ({ value, levels, isSpecial }) => {
  return (
    <div className={`inline-flex flex-col ${isSpecial ? 'items-center' : 'items-start'}`}>
      {[...Array(levels)].map((_, index) => (
        <div key={index} className="flex items-center">
          {isSpecial ? (
            <div className="w-16 h-8 bg-gray-300 flex items-center justify-center text-sm font-bold border border-gray-400">
              {value}
            </div>
          ) : (
            <div className="flex">
              <div className="w-8 h-8 bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {index === 0 ? value : ''}
              </div>
              <div className="w-4 h-8 bg-blue-300 border border-blue-400"></div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ConnectionLines = ({ nodes }) => {
  const nodeWidth = 48;
  const nodeHeight = 32;
  const horizontalGap = 16;
  const totalWidth = nodes.length * (nodeWidth + horizontalGap);

  return (
    <svg className="absolute top-0 left-0" width={totalWidth} height="100%" style={{ pointerEvents: 'none' }}>
      {nodes.map((node, nodeIndex) => {
        if (nodeIndex === nodes.length - 1) return null;
        const startX = nodeIndex * (nodeWidth + horizontalGap) + nodeWidth + 2;
        return [...Array(node.levels)].map((_, level) => {
          const y = (nodes[0].levels - 1 - level) * nodeHeight + nodeHeight / 2;
          let nextNodeWithLevel = nodeIndex + 1;
          while (nextNodeWithLevel < nodes.length - 1 && nodes[nextNodeWithLevel].levels <= level) {
            nextNodeWithLevel++;
          }
          const endX = nextNodeWithLevel * (nodeWidth + horizontalGap) + nodeWidth / 2;
          return (
            <line
              key={`${nodeIndex}-${level}`}
              x1={startX}
              y1={y}
              x2={endX}
              y2={y}
              stroke="red"
              strokeWidth="2"
            />
          );
        });
      })}
    </svg>
  );
};

const SkipListVisualization = () => {
  const { t } = useI18n();
  const [skipList, setSkipList] = useState(() => new SkipList());
  const [nodes, setNodes] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [operation, setOperation] = useState('');
  const [result, setResult] = useState('');
  const [maxHeight, setMaxHeight] = useState(12);
  const [branchingFactor, setBranchingFactor] = useState(4);
  const isInputValid = inputValue.trim() !== '' && !isNaN(parseInt(inputValue));

  useEffect(() => {
    setNodes(skipList.getNodes());
  }, [skipList]);

  const handleOperation = (op) => {
    const value = parseInt(inputValue);
    if (isNaN(value)) {
      setResult(t('invalid_input'));
      return;
    }

    switch (op) {
      case 'insert':
        const inserted = skipList.insert(value);
        setOperation(t('insert_operation', { value }));
        setResult(inserted ? t('insert_success') : t('insert_fail'));
        break;
      case 'search':
        const found = skipList.search(value);
        setOperation(t('search_operation', { value }));
        setResult(found ? t('search_found') : t('search_not_found'));
        return;
      case 'delete':
        skipList.delete(value);
        setOperation(t('delete_operation', { value }));
        setResult(t('operation_success'));
        break;
      default:
        return;
    }

    setNodes(skipList.getNodes());
  };

  const handleSettingsChange = () => {
    const newSkipList = new SkipList(maxHeight, branchingFactor);
    setSkipList(newSkipList);
    setNodes(newSkipList.getNodes());
    setResult(t('settings_updated'));
  };

  const handleRandomInit = () => {
    const newSkipList = new SkipList(maxHeight, branchingFactor);
    for (let i = 0; i < 10; i++) {
      const randomValue = Math.floor(Math.random() * 100) + 1;
      newSkipList.insert(randomValue);
    }
    setSkipList(newSkipList);
    setNodes(newSkipList.getNodes());
    setResult(t('random_init_success'));
  };

  return (
    <div className="p-4 flex flex-col lg:flex-row">
      <div className="lg:w-4/5 lg:pr-4 order-2 lg:order-1 lg:pr-10">
        {operation && (
          <div className="mb-4">
            {t('operation_result', { operation, result })}
          </div>
        )}
        <div className="relative overflow-x-auto">
          <div className="w-max relative">
            <ConnectionLines nodes={nodes} />
            <div className="flex items-end space-x-4 pb-4">
              {nodes.map((node, index) => (
                <div key={index} className="flex flex-col items-center">
                  <SkipListNodeComponent
                    value={node.value}
                    levels={node.levels}
                    isSpecial={node.value === 'HEAD' || node.value === 'NIL'}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:w-1/5 mt-4 lg:mt-0 order-1 lg:order-2">
        <h3 className="font-bold mb-2">{t('settings')}</h3>
        <div className="flex flex-col space-y-2">
          <select
            value={maxHeight}
            onChange={(e) => setMaxHeight(parseInt(e.target.value))}
            className="border rounded px-2 py-1"
          >
            {[4, 8, 12, 16, 20].map(h => (
              <option key={h} value={h}>{t('max_level', { level: h })}</option>
            ))}
          </select>
          <select
            value={branchingFactor}
            onChange={(e) => setBranchingFactor(parseInt(e.target.value))}
            className="border rounded px-2 py-1"
          >
            {[1, 2, 3, 4, 5, 6].map(b => (
              <option key={b} value={b}>{t('probability', { prob: b })}</option>
            ))}
          </select>
          <button onClick={handleSettingsChange} className="bg-purple-500 text-white px-2 py-1 rounded">{t('reset')}</button>
          <button onClick={handleRandomInit} className="bg-yellow-500 text-white px-2 py-1 rounded">{t('random_init')}</button>
          <div className="mt-4">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t('enter_number')}
              className="border rounded px-2 py-1 w-full mb-2"
            />
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleOperation('insert')}
                className={`${isInputValid ? 'bg-blue-500 hover:bg-blue-600' : 'bg-blue-300 cursor-not-allowed'} text-white px-2 py-1 rounded transition duration-150 ease-in-out`}
                disabled={!isInputValid}
              >
                {t('insert')}
              </button>
              <button
                onClick={() => handleOperation('search')}
                className={`${isInputValid ? 'bg-green-500 hover:bg-green-600' : 'bg-green-300 cursor-not-allowed'} text-white px-2 py-1 rounded transition duration-150 ease-in-out`}
                disabled={!isInputValid}
              >
                {t('search')}
              </button>
              <button
                onClick={() => handleOperation('delete')}
                className={`${isInputValid ? 'bg-red-500 hover:bg-red-600' : 'bg-red-300 cursor-not-allowed'} text-white px-2 py-1 rounded transition duration-150 ease-in-out`}
                disabled={!isInputValid}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkipListVisualization;