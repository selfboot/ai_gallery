"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { Combobox, ComboboxInput } from "@headlessui/react";
import { useI18n } from "@/app/i18n/client";
import { CustomListbox } from "@/app/components/ListBox";

export class TreeNode {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
    this.x = 0;
    this.y = 0;
    this.highlighted = false;
  }
}

export class BinarySearchTree {
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
    if (key === root.key) {
      return root;
    } else if (key < root.key) {
      root.left = this._insertRec(root.left, key, [...path, root]);
    } else {
      root.right = this._insertRec(root.right, key, [...path, root]);
    }
    return root;
  }

  delete(key) {
    let path = [];
    let current = this.root;
    let parent = null;
    let deleted = false;

    while (current !== null) {
      path.push(current);
      if (key === current.key) {
        if (current.left === null && current.right === null) {
          if (parent === null) {
            this.root = null;
          } else if (parent.left === current) {
            parent.left = null;
          } else {
            parent.right = null;
          }
        } else if (current.left === null) {
          if (parent === null) {
            this.root = current.right;
          } else if (parent.left === current) {
            parent.left = current.right;
          } else {
            parent.right = current.right;
          }
        } else if (current.right === null) {
          if (parent === null) {
            this.root = current.left;
          } else if (parent.left === current) {
            parent.left = current.left;
          } else {
            parent.right = current.left;
          }
        } else {
          let successor = current.right;
          let successorParent = current;
          while (successor.left !== null) {
            successorParent = successor;
            successor = successor.left;
          }
          current.key = successor.key;
          if (successorParent.left === successor) {
            successorParent.left = successor.right;
          } else {
            successorParent.right = successor.right;
          }
        }
        deleted = true;
        break;
      } else if (key < current.key) {
        parent = current;
        current = current.left;
      } else {
        parent = current;
        current = current.right;
      }
    }

    this._updateLayout();
    return { path, deleted };
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
  const { t } = useI18n();
  const svgRef = useRef(null);
  const nodeSize = 40;

  const [tree, setTree] = useState(new BinarySearchTree());
  const [nodeCount, setNodeCount] = useState(10);
  const [initMethod, setInitMethod] = useState("random");
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [specialNode, setSpecialNode] = useState(null);
  const [animationState, setAnimationState] = useState({
    tempNode: null,
    showLine: false,
    parentNode: null,
    lineOpacity: 1,
    nodeToAnimate: null,
    nodeOpacity: 1,
  });

  const initializeTree = useCallback(() => {
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
    setMessage(t("initializedTree", { count: nodeCount, method: t(initMethod) }));
  }, [nodeCount, initMethod, t]);

  useEffect(() => {
    initializeTree();
  }, []);

  const animateOperation = useCallback(
    async (operation, key) => {
      const newTree = new BinarySearchTree();
      newTree.root = JSON.parse(JSON.stringify(tree.root));

      let path;
      let result;

      if (operation === "insert") {
        // 1. 先找到插入位置
        let current = newTree.root;
        let parent = null;
        path = [];
        const insertKey = parseInt(key);

        while (current !== null) {
          path.push(current);
          parent = current;
          if (insertKey === current.key) {
            break; // 找到相等节点就停止
          } else if (insertKey < current.key) {
            current = current.left;
          } else {
            current = current.right;
          }
        }

        // 2. 高亮搜索路径
        for (let i = 0; i < path.length; i++) {
          setHighlightedNodes(path.slice(0, i + 1).map((node) => node.key));
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // 检查是否找到相等的节点
        if (path.length > 0 && path[path.length - 1].key === insertKey) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setHighlightedNodes([]);
          setMessage(t("nodeExists", { value: key }));
          return null;
        }

        // 3. 创建新节点并建立连接
        const newNode = new TreeNode(insertKey);
        // 先建立连接
        if (parent === null) {
          newTree.root = newNode;
        } else if (insertKey < parent.key) {
          parent.left = newNode;
        } else {
          parent.right = newNode;
        }

        // 更新布局，获取正确的位置
        newTree._updateLayout();

        // 设置动画状态，新节点和连接线初始都是不可见的
        setTree(newTree); // 先更新树，这样新节点就会被渲染
        setAnimationState({
          showLine: true,
          parentNode: parent,
          lineOpacity: 0,
          nodeToAnimate: newNode.key,
          nodeOpacity: 0,
        });

        // 等待一帧以确保新状态被渲染
        await new Promise((resolve) => requestAnimationFrame(resolve));

        // 使用 Promise 包装动画过程
        await new Promise((resolve) => {
          let startTime = null;
          const duration = 1000;

          const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (progress <= 0.5) {
              // 前半段：节点淡入
              const opacity = progress * 2;
              setAnimationState((prev) => ({
                ...prev,
                nodeOpacity: opacity,
                lineOpacity: 0,
              }));
            } else {
              // 后半段：连接线淡入
              const lineOpacity = (progress - 0.5) * 2;
              setAnimationState((prev) => ({
                ...prev,
                nodeOpacity: 1,
                lineOpacity,
              }));
            }

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              // 动画结束，清除状态
              setAnimationState({
                showLine: false,
                parentNode: null,
                lineOpacity: 1,
                nodeToAnimate: null,
                nodeOpacity: 1,
              });
              resolve();
              setHighlightedNodes([]);
            }
          };

          requestAnimationFrame(animate);
        });

        // 不需要再次设置树，因为已经在动画开始前设置过了
        return newNode;
      } else if (operation === "delete") {
        // 1. 先找到要删除的节点
        let current = newTree.root;
        let parent = null;
        path = [];
        const deleteKey = parseInt(key);

        while (current !== null && current.key !== deleteKey) {
          path.push(current);
          parent = current;
          if (deleteKey < current.key) {
            current = current.left;
          } else {
            current = current.right;
          }
        }

        if (!current) {
          // 节点不存在
          setMessage(t("notFound_value", { value: key }));
          return false;
        }

        path.push(current);

        // 2. 高亮搜索路径
        for (let i = 0; i < path.length; i++) {
          setHighlightedNodes(path.slice(0, i + 1).map((node) => node.key));
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // 3. 根据不同情况执行删除动画
        if (current.left === null && current.right === null) {
          // 情况1: 叶子节点
          // 直接使用原始节点，只控制连接线的消失
          setAnimationState({
            showLine: true,
            parentNode: parent,
            lineOpacity: 1,
            nodeToAnimate: current.key, // 只记录需要动画的节点的key
          });

          // 使用 requestAnimationFrame 实现平滑画
          const animate = async (startTime, duration = 1000) => {
            const animation = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // 前半段动画：连接线消失
              if (progress <= 0.5) {
                const lineOpacity = 1 - progress * 2;
                setAnimationState((prev) => ({
                  ...prev,
                  lineOpacity,
                }));
              }
              // 后半段动画：节点消失
              else {
                const nodeOpacity = 1 - (progress - 0.5) * 2;
                setAnimationState((prev) => ({
                  ...prev,
                  showLine: false,
                  nodeOpacity, // 新增节点透明度状态
                }));
              }

              if (progress < 1) {
                requestAnimationFrame(animation);
              } else {
                // 动画结束，清除状态
                setAnimationState({
                  showLine: false,
                  parentNode: null,
                  lineOpacity: 0,
                  nodeToAnimate: null,
                  nodeOpacity: 0,
                });
              }
            };

            requestAnimationFrame(animation);
          };

          // 开始动画
          const startTime = performance.now();
          await animate(startTime);
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待动画完成
        } else if (current.left === null || current.right === null) {
          // 情况2: 只有一个子节点
          const child = current.left || current.right;
          const isLeftChild = parent ? parent.left === current : false; // 记录被删节点是否是左子节点

          // 设置初始动画状态
          setAnimationState({
            showLine: true,
            parentNode: parent,
            lineOpacity: 1,
            nodeToAnimate: current.key,
            nodeOpacity: 1,
            isLeftChild, // 添加标记
          });

          // 使用 Promise 包装动画过程
          await new Promise((resolve) => {
            let startTime = null;
            const duration = 1500;

            const animate = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const elapsed = timestamp - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // 第一阶段(0-0.33)：父节点到当前节点的连线消失
              if (progress <= 0.33) {
                const lineOpacity = 1 - progress * 3;
                setAnimationState((prev) => ({
                  ...prev,
                  lineOpacity,
                  isLeftChild,
                }));
              }
              // 第二阶段(0.33-0.66)：当前节点消失
              else if (progress <= 0.66) {
                const nodeOpacity = 1 - (progress - 0.33) * 3;
                setAnimationState((prev) => ({
                  ...prev,
                  nodeOpacity,
                  lineOpacity: 0,
                  isLeftChild,
                }));
              }
              // 第三阶段(0.66-1)：子节点连线出现
              else {
                const newLineOpacity = (progress - 0.66) * 3;
                // 更新树结构，保持原有的左右关系
                if (parent === null) {
                  newTree.root = child;
                } else if (isLeftChild) {
                  parent.left = child;
                } else {
                  parent.right = child;
                }
                newTree._updateLayout();
                setTree(newTree);

                setAnimationState((prev) => ({
                  ...prev,
                  nodeOpacity: 0,
                  lineOpacity: newLineOpacity,
                  parentNode: parent,
                  nodeToAnimate: current.key,
                  childNode: child.key,
                  isLeftChild,
                }));
              }

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                // 动画结束，清除状态
                setAnimationState({
                  showLine: false,
                  parentNode: null,
                  lineOpacity: 1,
                  nodeToAnimate: null,
                  nodeOpacity: 1,
                  isLeftChild: null,
                });
                resolve();
              }
            };

            requestAnimationFrame(animate);
          });

          await new Promise((resolve) => setTimeout(resolve, 500)); // 等待最后的状态稳定
        } else {
          // 情况3: 有两个子节点
          let successor = current.right;
          let successorParent = current;
          let successorPath = [current, current.right];

          // 1. 高亮显示从当前节点到右子节点
          setHighlightedNodes([current.key]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          setHighlightedNodes([current.key, current.right.key]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          // 2. 逐步显示寻找后继节点的过程
          while (successor.left !== null) {
            successorParent = successor;
            successor = successor.left;
            successorPath.push(successor);

            // 动态显示搜索路径
            setHighlightedNodes(successorPath.map((node) => node.key));
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          // 3. 找到后继节点后，特殊标记
          setSpecialNode({
            key: successor.key,
            color: "green",
          });
          await new Promise((resolve) => setTimeout(resolve, 500));

          // 3. 显示后继节点值替换当前节点的动画
          await new Promise((resolve) => {
            let startTime = null;
            const duration = 1500;

            const animate = (timestamp) => {
              if (!startTime) startTime = timestamp;
              const elapsed = timestamp - startTime;
              const progress = Math.min(elapsed / duration, 1);

              // 第一阶段(0-0.33)：后继节点淡出
              if (progress <= 0.33) {
                setAnimationState({
                  nodeToAnimate: successor.key,
                  nodeOpacity: 1 - progress * 3,
                  showLine: true,
                  parentNode: successorParent,
                  lineOpacity: 1,
                });
              }
              // 第二阶段(0.33-0.66)：后继节点移动到当前节点位置
              else if (progress <= 0.66) {
                const moveProgress = (progress - 0.33) * 3;
                const x = successor.x + (current.x - successor.x) * moveProgress;
                const y = successor.y + (current.y - successor.y) * moveProgress;
                setAnimationState({
                  tempNode: { ...successor, x, y, opacity: 0.8 },
                  showLine: true,
                  parentNode: successorParent,
                  lineOpacity: 1 - moveProgress,
                });
              }
              // 第三阶段(0.66-1)：后继节点替换当前节点
              else {
                const replaceProgress = (progress - 0.66) * 3;
                // 更新树结构
                current.key = successor.key;
                if (successorParent === current) {
                  current.right = successor.right;
                } else {
                  successorParent.left = successor.right;
                }
                newTree._updateLayout();
                setTree(newTree);

                setAnimationState({
                  nodeToAnimate: current.key,
                  nodeOpacity: replaceProgress,
                  showLine: true,
                  parentNode: successorParent,
                  lineOpacity: 0,
                });
              }

              if (progress < 1) {
                requestAnimationFrame(animate);
              } else {
                setAnimationState({
                  showLine: false,
                  parentNode: null,
                  lineOpacity: 1,
                  nodeToAnimate: null,
                  nodeOpacity: 1,
                  tempNode: null,
                });
                resolve();
              }
            };

            requestAnimationFrame(animate);
          });

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // 4. 执行实际的删除操作
        const deleteResult = newTree.delete(deleteKey);
        newTree._updateLayout();

        // 5. 清除动画状态
        setAnimationState({
          tempNode: null,
          showLine: false,
          parentNode: null,
        });
        setHighlightedNodes([]);
        setSpecialNode(null);
        setTree(newTree);

        return true;
      } else {
        // search
        const searchResult = newTree.search(parseInt(key));
        path = searchResult.path;
        result = searchResult.found;

        for (let i = 0; i < path.length; i++) {
          setHighlightedNodes(path.slice(0, i + 1).map((node) => node.key));
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (path.length > 0) {
          setSpecialNode({
            key: path[path.length - 1].key,
            color: result ? "green" : "red",
          });
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        setHighlightedNodes([]);
        setSpecialNode(null);
        setTree(newTree);
        return result;
      }
    },
    [tree]
  );

  const handleInsert = useCallback(async () => {
    if (inputValue) {
      setMessage("");
      const result = await animateOperation("insert", inputValue);
      if (result) {
        setMessage(t("inserted_value", { value: inputValue }));
      }
      setInputValue("");
    }
  }, [inputValue, animateOperation, t]);

  const handleDelete = useCallback(async () => {
    if (inputValue) {
      setMessage("");
      const deleted = await animateOperation("delete", inputValue);
      setMessage(deleted ? t("deleted_value", { value: inputValue }) : t("notFound_value", { value: inputValue }));
      setInputValue("");
    }
  }, [inputValue, animateOperation, t]);

  const handleSearch = useCallback(async () => {
    if (inputValue) {
      setMessage("");
      const found = await animateOperation("search", inputValue);
      setMessage(found ? t("found_value", { value: inputValue }) : t("notFound_value", { value: inputValue }));
      setInputValue("");
    }
  }, [inputValue, animateOperation, t]);

  const renderTree = useCallback(
    (node) => {
      if (!node) return null;

      return (
        <g key={node.key}>
          {/* 连接线 */}
          {node.left && (
            <Line
              start={node}
              end={node.left}
              nodeSize={nodeSize}
              opacity={animationState.nodeToAnimate === node.left.key ? animationState.lineOpacity : 1}
            />
          )}
          {node.right && (
            <Line
              start={node}
              end={node.right}
              nodeSize={nodeSize}
              opacity={animationState.nodeToAnimate === node.right.key ? animationState.lineOpacity : 1}
            />
          )}
          <circle
            cx={node.x}
            cy={node.y}
            r={nodeSize / 2}
            fill={
              specialNode?.key === node.key
                ? specialNode.color
                : highlightedNodes.includes(node.key)
                ? "#f6e05e"
                : "#4299e1"
            }
            opacity={animationState.nodeToAnimate === node.key ? animationState.nodeOpacity ?? 1 : 1}
          />
          <text
            x={node.x}
            y={node.y}
            textAnchor="middle"
            dy=".3em"
            fill="white"
            opacity={animationState.nodeToAnimate === node.key ? animationState.nodeOpacity ?? 1 : 1}
          >
            {node.key}
          </text>

          {/* Recursive rendering of child nodes */}
          {node.left && renderTree(node.left)}
          {node.right && renderTree(node.right)}
        </g>
      );
    },
    [highlightedNodes, specialNode, animationState, nodeSize]
  );

  const Line = memo(({ start, end, nodeSize, opacity = 1 }) => (
    <line
      x1={start.x}
      y1={start.y + nodeSize / 2}
      x2={end.x}
      y2={end.y - nodeSize / 2}
      stroke="#4299e1"
      opacity={opacity}
    />
  ));

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

  const treeDimensions = useMemo(() => getTreeDimensions(tree.root), [tree.root, getTreeDimensions]);
  const svgWidth = treeDimensions.maxX - treeDimensions.minX + 100;
  const svgHeight = treeDimensions.maxY + 100;

  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
    }
  }, [svgWidth, svgHeight]);

  return (
    <>
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-4/5 mb-4 lg:mb-0 lg:pr-4">
          <div className="border rounded overflow-auto" style={{ maxHeight: "80vh" }}>
            <svg ref={svgRef} width={svgWidth} height={svgHeight} className="min-w-full">
              <g transform={`translate(${-treeDimensions.minX + 50}, 50)`}>{renderTree(tree.root)}</g>
            </svg>
          </div>
        </div>
        <div className="lg:w-1/5">
          <div className="mb-4">
            <label htmlFor="nodeCount" className="block mb-2">
              {t("nodeCount")}:
            </label>
            <input
              id="nodeCount"
              type="number"
              min="1"
              max="50"
              value={nodeCount}
              onChange={(e) => setNodeCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">{t("initMethod")}:</label>
            <CustomListbox
              value={t(initMethod)}
              onChange={(value) => setInitMethod(value === t("random") ? "random" : "sequential")}
              options={[t("random"), t("sequential")]}
              className="w-full"
            />
          </div>
          <button
            onClick={initializeTree}
            className="w-full mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {t("initializeTree")}
          </button>
          <div className="mb-4">
            <Combobox value={inputValue} onChange={setInputValue}>
              <ComboboxInput
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={t("enterNumber")}
              />
            </Combobox>
          </div>
          <button
            onClick={handleInsert}
            className="w-full mb-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {t("insert")}
          </button>
          <button
            onClick={handleDelete}
            className="w-full mb-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            {t("delete")}
          </button>
          <button
            onClick={handleSearch}
            className="w-full mb-4 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            {t("search")}
          </button>
          <div className="mb-4">{message}</div>
        </div>
      </div>
    </>
  );
};

export default BinarySearchTreeVisualization;
