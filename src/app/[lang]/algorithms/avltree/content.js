"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Combobox, ComboboxInput } from "@headlessui/react";
import { useI18n } from "@/app/i18n/client";
import { CustomListbox } from "@/app/components/ListBox";

class AVLNode {
  constructor(key, parent = null) {
    this.key = key;
    this.left = null;
    this.right = null;
    this.parent = parent;
    this.height = 1;
    this.x = 0;
    this.y = 0;
  }
}

export class AVLTree {
  constructor() {
    this.root = null;
  }

  clone() {
    const cloned = new AVLTree();
    cloned.root = this._cloneWithParent(this.root, null);
    return cloned;
  }

  _cloneWithParent(node, parent) {
    if (!node) return null;
    const n = new AVLNode(node.key, parent);
    n.height = node.height;
    n.left = this._cloneWithParent(node.left, n);
    n.right = this._cloneWithParent(node.right, n);
    return n;
  }

  _height(node) {
    return node ? node.height : 0;
  }

  _balanceFactor(node) {
    return node ? this._height(node.left) - this._height(node.right) : 0;
  }

  _updateHeight(node) {
    if (!node) return;
    node.height = Math.max(this._height(node.left), this._height(node.right)) + 1;
  }

  _toRenderNode(node) {
    if (!node) return null;
    return {
      key: node.key,
      height: node.height,
      balance: this._balanceFactor(node),
      left: this._toRenderNode(node.left),
      right: this._toRenderNode(node.right),
      x: 0,
      y: 0,
    };
  }

  _assignLayout(renderRoot) {
    const nodeSize = 42;
    const horizontalSpacing = 20;
    const verticalSpacing = 68;

    const getNodeCount = (node) => {
      if (!node) return 0;
      return 1 + getNodeCount(node.left) + getNodeCount(node.right);
    };

    const assignCoordinates = (node, level, leftBound, rightBound) => {
      if (!node) return;

      const leftCount = getNodeCount(node.left);
      const rightCount = getNodeCount(node.right);
      const totalCount = leftCount + rightCount + 1;

      node.x = leftBound + (rightBound - leftBound) * ((leftCount + 0.5) / totalCount);
      node.y = level * verticalSpacing;

      if (node.left) {
        assignCoordinates(node.left, level + 1, leftBound, node.x - horizontalSpacing / 2);
      }
      if (node.right) {
        assignCoordinates(node.right, level + 1, node.x + horizontalSpacing / 2, rightBound);
      }
    };

    const treeWidth = getNodeCount(renderRoot) * (nodeSize + horizontalSpacing);
    assignCoordinates(renderRoot, 0, 0, Math.max(treeWidth, 120));
  }

  _buildRenderRoot() {
    const renderRoot = this._toRenderNode(this.root);
    if (renderRoot) this._assignLayout(renderRoot);
    return renderRoot;
  }

  _cloneRenderNode(node) {
    if (!node) return null;
    return {
      ...node,
      left: this._cloneRenderNode(node.left),
      right: this._cloneRenderNode(node.right),
    };
  }

  _collectRenderPositions(node, positions = {}) {
    if (!node) return positions;
    positions[node.key] = { x: node.x, y: node.y };
    this._collectRenderPositions(node.left, positions);
    this._collectRenderPositions(node.right, positions);
    return positions;
  }

  _applyInterpolatedPositions(node, fromPositions, toPositions, progress) {
    if (!node) return;
    const from = fromPositions[node.key];
    const to = toPositions[node.key];
    if (from && to) {
      node.x = from.x + (to.x - from.x) * progress;
      node.y = from.y + (to.y - from.y) * progress;
    } else if (to) {
      node.x = to.x;
      node.y = to.y;
    }
    this._applyInterpolatedPositions(node.left, fromPositions, toPositions, progress);
    this._applyInterpolatedPositions(node.right, fromPositions, toPositions, progress);
  }

  _buildRotationTransitionFrames(beforeRoot, afterRoot, options, frameCount = 6) {
    if (!beforeRoot || !afterRoot) return [];
    const fromPositions = this._collectRenderPositions(beforeRoot);
    const toPositions = this._collectRenderPositions(afterRoot);
    const frames = [];

    for (let i = 1; i <= frameCount; i++) {
      const progress = i / frameCount;
      const root = this._cloneRenderNode(afterRoot);
      this._applyInterpolatedPositions(root, fromPositions, toPositions, progress);
      frames.push(this._makeFrameFromRenderRoot(root, options));
    }

    return frames;
  }

  _makeFrameFromRenderRoot(
    renderRoot,
    { highlightedKeys = [], focusKeys = [], message = "", phase = "idle", rotationType = null } = {}
  ) {
    return {
      root: renderRoot,
      highlightedKeys,
      focusKeys,
      message,
      phase,
      rotationType,
    };
  }

  makeFrame(options = {}) {
    return this._makeFrameFromRenderRoot(this._buildRenderRoot(), options);
  }

  _rotateLeft(x) {
    const y = x.right;
    const t2 = y.left;

    y.left = x;
    x.right = t2;

    y.parent = x.parent;
    x.parent = y;
    if (t2) t2.parent = x;

    if (!y.parent) {
      this.root = y;
    } else if (y.parent.left === x) {
      y.parent.left = y;
    } else {
      y.parent.right = y;
    }

    this._updateHeight(x);
    this._updateHeight(y);

    return y;
  }

  _rotateRight(y) {
    const x = y.left;
    const t2 = x.right;

    x.right = y;
    y.left = t2;

    x.parent = y.parent;
    y.parent = x;
    if (t2) t2.parent = y;

    if (!x.parent) {
      this.root = x;
    } else if (x.parent.left === y) {
      x.parent.left = x;
    } else {
      x.parent.right = x;
    }

    this._updateHeight(y);
    this._updateHeight(x);

    return x;
  }

  _rotateLeftDetailed(x, trace, t, rotationType) {
    const y = x.right;
    const t2 = y.left;

    trace.push(
      this.makeFrame({
        focusKeys: [x.key, y.key],
        highlightedKeys: t2 ? [t2.key] : [],
        message: t("avl_rotation_prepare", { type: rotationType, root: x.key, pivot: y.key }),
        phase: "rotation",
        rotationType,
      })
    );

    trace.push(
      this.makeFrame({
        focusKeys: [x.key, y.key],
        highlightedKeys: t2 ? [t2.key] : [],
        message: t("avl_rotation_move_subtree", {
          subtree: t2 ? t2.key : t("avl_empty_subtree"),
          from: y.key,
          to: x.key,
        }),
        phase: "rotation",
        rotationType,
      })
    );

    trace.push(
      this.makeFrame({
        focusKeys: [x.key, y.key],
        highlightedKeys: x.parent ? [x.parent.key] : [],
        message: t("avl_rotation_promote_node", { pivot: y.key, root: x.key }),
        phase: "rotation",
        rotationType,
      })
    );

    trace.push(
      this.makeFrame({
        focusKeys: [x.key, y.key],
        message: t("avl_rotation_attach_node", {
          root: x.key,
          pivot: y.key,
          side: t("avl_left"),
        }),
        phase: "rotation",
        rotationType,
      })
    );

    const beforeRoot = this._buildRenderRoot();
    const newRoot = this._rotateLeft(x);
    const afterRoot = this._buildRenderRoot();
    trace.push(
      ...this._buildRotationTransitionFrames(beforeRoot, afterRoot, {
        focusKeys: [x.key, y.key],
        highlightedKeys: t2 ? [t2.key] : [],
        message: t("avl_rotation_transition", { type: rotationType }),
        phase: "rotation",
        rotationType,
      })
    );
    trace.push(
      this._makeFrameFromRenderRoot(afterRoot, {
        focusKeys: [x.key, y.key],
        message: t("avl_rotation_height_fix"),
        phase: "rotation",
        rotationType,
      })
    );

    return newRoot;
  }

  _rotateRightDetailed(y, trace, t, rotationType) {
    const x = y.left;
    const t2 = x.right;

    trace.push(
      this.makeFrame({
        focusKeys: [y.key, x.key],
        highlightedKeys: t2 ? [t2.key] : [],
        message: t("avl_rotation_prepare", { type: rotationType, root: y.key, pivot: x.key }),
        phase: "rotation",
        rotationType,
      })
    );

    trace.push(
      this.makeFrame({
        focusKeys: [y.key, x.key],
        highlightedKeys: t2 ? [t2.key] : [],
        message: t("avl_rotation_move_subtree", {
          subtree: t2 ? t2.key : t("avl_empty_subtree"),
          from: x.key,
          to: y.key,
        }),
        phase: "rotation",
        rotationType,
      })
    );

    trace.push(
      this.makeFrame({
        focusKeys: [y.key, x.key],
        highlightedKeys: y.parent ? [y.parent.key] : [],
        message: t("avl_rotation_promote_node", { pivot: x.key, root: y.key }),
        phase: "rotation",
        rotationType,
      })
    );

    trace.push(
      this.makeFrame({
        focusKeys: [y.key, x.key],
        message: t("avl_rotation_attach_node", {
          root: y.key,
          pivot: x.key,
          side: t("avl_right"),
        }),
        phase: "rotation",
        rotationType,
      })
    );

    const beforeRoot = this._buildRenderRoot();
    const newRoot = this._rotateRight(y);
    const afterRoot = this._buildRenderRoot();
    trace.push(
      ...this._buildRotationTransitionFrames(beforeRoot, afterRoot, {
        focusKeys: [y.key, x.key],
        highlightedKeys: t2 ? [t2.key] : [],
        message: t("avl_rotation_transition", { type: rotationType }),
        phase: "rotation",
        rotationType,
      })
    );
    trace.push(
      this._makeFrameFromRenderRoot(afterRoot, {
        focusKeys: [y.key, x.key],
        message: t("avl_rotation_height_fix"),
        phase: "rotation",
        rotationType,
      })
    );

    return newRoot;
  }

  _rebalanceFrom(startNode, trace, t) {
    let current = startNode;

    while (current) {
      this._updateHeight(current);
      const bf = this._balanceFactor(current);

      trace.push(
        this.makeFrame({
          highlightedKeys: [current.key],
          message: t("avl_checking_node", { value: current.key, bf }),
          phase: "rebalance",
        })
      );

      if (bf > 1 || bf < -1) {
        if (bf > 1) {
          const childBf = this._balanceFactor(current.left);
          if (childBf >= 0) {
            trace.push(
              this.makeFrame({
                focusKeys: [current.key, current.left.key],
                message: t("avl_rotation_case", { type: "LL", value: current.key }),
                phase: "rotation",
                rotationType: "LL",
              })
            );

            const oldCurrent = current;
            const newRoot = this._rotateRightDetailed(current, trace, t, "LL");
            trace.push(
              this.makeFrame({
                focusKeys: [newRoot.key, oldCurrent.key],
                message: t("avl_rotation_done", { type: "LL", value: oldCurrent.key }),
                phase: "rotation",
                rotationType: "LL",
              })
            );
            current = newRoot;
          } else {
            trace.push(
              this.makeFrame({
                focusKeys: [current.key, current.left.key],
                message: t("avl_rotation_case", { type: "LR", value: current.key }),
                phase: "rotation",
                rotationType: "LR",
              })
            );

            this._rotateLeftDetailed(current.left, trace, t, "LR");
            trace.push(
              this.makeFrame({
                focusKeys: [current.key],
                message: t("avl_rotation_step", { type: "LR", value: current.key }),
                phase: "rotation",
                rotationType: "LR",
              })
            );

            const oldCurrent = current;
            const newRoot = this._rotateRightDetailed(current, trace, t, "LR");
            trace.push(
              this.makeFrame({
                focusKeys: [newRoot.key, oldCurrent.key],
                message: t("avl_rotation_done", { type: "LR", value: oldCurrent.key }),
                phase: "rotation",
                rotationType: "LR",
              })
            );
            current = newRoot;
          }
        } else {
          const childBf = this._balanceFactor(current.right);
          if (childBf <= 0) {
            trace.push(
              this.makeFrame({
                focusKeys: [current.key, current.right.key],
                message: t("avl_rotation_case", { type: "RR", value: current.key }),
                phase: "rotation",
                rotationType: "RR",
              })
            );

            const oldCurrent = current;
            const newRoot = this._rotateLeftDetailed(current, trace, t, "RR");
            trace.push(
              this.makeFrame({
                focusKeys: [newRoot.key, oldCurrent.key],
                message: t("avl_rotation_done", { type: "RR", value: oldCurrent.key }),
                phase: "rotation",
                rotationType: "RR",
              })
            );
            current = newRoot;
          } else {
            trace.push(
              this.makeFrame({
                focusKeys: [current.key, current.right.key],
                message: t("avl_rotation_case", { type: "RL", value: current.key }),
                phase: "rotation",
                rotationType: "RL",
              })
            );

            this._rotateRightDetailed(current.right, trace, t, "RL");
            trace.push(
              this.makeFrame({
                focusKeys: [current.key],
                message: t("avl_rotation_step", { type: "RL", value: current.key }),
                phase: "rotation",
                rotationType: "RL",
              })
            );

            const oldCurrent = current;
            const newRoot = this._rotateLeftDetailed(current, trace, t, "RL");
            trace.push(
              this.makeFrame({
                focusKeys: [newRoot.key, oldCurrent.key],
                message: t("avl_rotation_done", { type: "RL", value: oldCurrent.key }),
                phase: "rotation",
                rotationType: "RL",
              })
            );
            current = newRoot;
          }
        }
      }

      current = current.parent;
    }
  }

  insertWithTrace(key, t) {
    const trace = [this.makeFrame({ message: t("avl_insert_start", { value: key }), phase: "insert" })];

    if (!this.root) {
      this.root = new AVLNode(key);
      trace.push(
        this.makeFrame({ highlightedKeys: [key], message: t("inserted_value", { value: key }), phase: "insert" })
      );
      return { trace, inserted: true, exists: false };
    }

    let current = this.root;
    let parent = null;
    const path = [];

    while (current) {
      path.push(current.key);
      trace.push(
        this.makeFrame({
          highlightedKeys: [...path],
          focusKeys: [current.key],
          message: t("avl_visit_node", { value: current.key }),
          phase: "insert",
        })
      );

      if (key === current.key) {
        trace.push(
          this.makeFrame({ highlightedKeys: [...path], focusKeys: [key], message: t("nodeExists", { value: key }) })
        );
        return { trace, inserted: false, exists: true };
      }

      parent = current;
      current = key < current.key ? current.left : current.right;
    }

    const newNode = new AVLNode(key, parent);
    if (key < parent.key) {
      parent.left = newNode;
    } else {
      parent.right = newNode;
    }

    trace.push(
      this.makeFrame({
        highlightedKeys: [...path, key],
        focusKeys: [key],
        message: t("avl_insert_leaf", { value: key }),
        phase: "insert",
      })
    );

    this._rebalanceFrom(parent, trace, t);

    trace.push(this.makeFrame({ highlightedKeys: [key], message: t("inserted_value", { value: key }), phase: "result" }));

    return { trace, inserted: true, exists: false };
  }

  _findNode(key) {
    let current = this.root;
    while (current) {
      if (key === current.key) return current;
      current = key < current.key ? current.left : current.right;
    }
    return null;
  }

  _minNode(node) {
    let current = node;
    while (current && current.left) {
      current = current.left;
    }
    return current;
  }

  searchWithTrace(key, t) {
    const trace = [this.makeFrame({ message: t("avl_search_start", { value: key }), phase: "search" })];
    let current = this.root;
    const path = [];

    while (current) {
      path.push(current.key);
      trace.push(
        this.makeFrame({
          highlightedKeys: [...path],
          focusKeys: [current.key],
          message: t("avl_visit_node", { value: current.key }),
          phase: "search",
        })
      );

      if (current.key === key) {
        trace.push(
          this.makeFrame({
            highlightedKeys: [...path],
            focusKeys: [key],
            message: t("found_value", { value: key }),
            phase: "result",
          })
        );
        return { trace, found: true };
      }

      current = key < current.key ? current.left : current.right;
    }

    trace.push(this.makeFrame({ highlightedKeys: [...path], message: t("notFound_value", { value: key }), phase: "result" }));
    return { trace, found: false };
  }

  deleteWithTrace(key, t) {
    const trace = [this.makeFrame({ message: t("avl_delete_start", { value: key }), phase: "delete" })];

    let current = this.root;
    const path = [];

    while (current && current.key !== key) {
      path.push(current.key);
      trace.push(
        this.makeFrame({
          highlightedKeys: [...path],
          focusKeys: [current.key],
          message: t("avl_visit_node", { value: current.key }),
          phase: "delete",
        })
      );
      current = key < current.key ? current.left : current.right;
    }

    if (!current) {
      trace.push(this.makeFrame({ highlightedKeys: [...path], message: t("notFound_value", { value: key }), phase: "result" }));
      return { trace, deleted: false };
    }

    trace.push(
      this.makeFrame({
        highlightedKeys: [...path, current.key],
        focusKeys: [current.key],
        message: t("avl_delete_found", { value: key }),
        phase: "delete",
      })
    );

    let nodeToDelete = current;

    if (nodeToDelete.left && nodeToDelete.right) {
      let successor = nodeToDelete.right;
      const successorPath = [nodeToDelete.key, successor.key];

      trace.push(
        this.makeFrame({
          highlightedKeys: successorPath,
          focusKeys: [successor.key],
          message: t("avl_find_successor", { value: successor.key }),
          phase: "delete",
        })
      );

      while (successor.left) {
        successor = successor.left;
        successorPath.push(successor.key);
        trace.push(
          this.makeFrame({
            highlightedKeys: [...successorPath],
            focusKeys: [successor.key],
            message: t("avl_find_successor", { value: successor.key }),
            phase: "delete",
          })
        );
      }

      nodeToDelete.key = successor.key;
      trace.push(
        this.makeFrame({
          highlightedKeys: [nodeToDelete.key],
          focusKeys: [nodeToDelete.key],
          message: t("avl_replace_with_successor", { value: successor.key }),
          phase: "delete",
        })
      );

      nodeToDelete = successor;
    }

    const parent = nodeToDelete.parent;
    const child = nodeToDelete.left || nodeToDelete.right;

    if (child) {
      child.parent = parent;
    }

    if (!parent) {
      this.root = child;
    } else if (parent.left === nodeToDelete) {
      parent.left = child;
    } else {
      parent.right = child;
    }

    trace.push(
      this.makeFrame({
        focusKeys: child ? [child.key] : [],
        message: t("avl_delete_remove_node", { value: key }),
        phase: "delete",
      })
    );

    this._rebalanceFrom(parent, trace, t);

    trace.push(this.makeFrame({ message: t("deleted_value", { value: key }), phase: "result" }));
    return { trace, deleted: true };
  }

  clear() {
    this.root = null;
  }

  inorder() {
    const result = [];
    const dfs = (node) => {
      if (!node) return;
      dfs(node.left);
      result.push(node.key);
      dfs(node.right);
    };
    dfs(this.root);
    return result;
  }

  preorder() {
    const result = [];
    const dfs = (node) => {
      if (!node) return;
      result.push(node.key);
      dfs(node.left);
      dfs(node.right);
    };
    dfs(this.root);
    return result;
  }

  postorder() {
    const result = [];
    const dfs = (node) => {
      if (!node) return;
      dfs(node.left);
      dfs(node.right);
      result.push(node.key);
    };
    dfs(this.root);
    return result;
  }

  levelorder() {
    const result = [];
    if (!this.root) return result;
    const queue = [this.root];

    while (queue.length > 0) {
      const node = queue.shift();
      result.push(node.key);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }

    return result;
  }

  isBalanced() {
    const check = (node) => {
      if (!node) return true;
      const bf = Math.abs(this._height(node.left) - this._height(node.right));
      return bf <= 1 && check(node.left) && check(node.right);
    };
    return check(this.root);
  }
}

const AVLTreeVisualization = () => {
  const { t } = useI18n();
  const [tree, setTree] = useState(() => new AVLTree());
  const [frame, setFrame] = useState(null);
  const [nodeCount, setNodeCount] = useState(12);
  const [initMethod, setInitMethod] = useState("random");
  const [inputValue, setInputValue] = useState("");
  const [message, setMessage] = useState("");
  const [traversalResult, setTraversalResult] = useState("");
  const [lastOperation, setLastOperation] = useState(null);
  const [traceSteps, setTraceSteps] = useState([]);
  const [traceIndex, setTraceIndex] = useState(-1);
  const [pendingResult, setPendingResult] = useState(null);
  const [animationSpeed, setAnimationSpeed] = useState(450);
  const isUnmountedRef = useRef(false);
  const autoPlayTimerRef = useRef(null);

  const clearAutoPlayTimer = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      clearAutoPlayTimer();
    };
  }, [clearAutoPlayTimer]);

  const hasPendingTrace = pendingResult !== null && traceSteps.length > 0;
  const operationLocked = hasPendingTrace;

  const syncFrame = useCallback((treeInstance, extra = {}) => {
    setFrame(treeInstance.makeFrame(extra));
  }, []);

  const resetTraceState = useCallback(() => {
    clearAutoPlayTimer();
    setTraceSteps([]);
    setTraceIndex(-1);
    setPendingResult(null);
  }, [clearAutoPlayTimer]);

  const finalizeTrace = useCallback(() => {
    if (!pendingResult || isUnmountedRef.current) return;
    clearAutoPlayTimer();
    setTree(pendingResult.tree);
    syncFrame(pendingResult.tree, { message: pendingResult.message });
    setMessage(pendingResult.message);
    setTraceSteps([]);
    setTraceIndex(-1);
    setPendingResult(null);
  }, [clearAutoPlayTimer, pendingResult, syncFrame]);

  const beginTrace = useCallback(
    (trace, finalTree, finalMessage, { saveReplay = true } = {}) => {
      clearAutoPlayTimer();
      setTraversalResult("");

      if (!trace || trace.length === 0) {
        setTree(finalTree);
        syncFrame(finalTree, { message: finalMessage });
        setMessage(finalMessage);
        if (saveReplay) {
          setLastOperation({
            trace,
            finalTree: finalTree.clone(),
            finalMessage,
          });
        }
        return;
      }

      setTraceSteps(trace);
      setTraceIndex(0);
      setPendingResult({ tree: finalTree, message: finalMessage });
      setFrame(trace[0]);
      setMessage(trace[0].message || finalMessage);
      if (saveReplay) {
        setLastOperation({
          trace,
          finalTree: finalTree.clone(),
          finalMessage,
        });
      }
    },
    [clearAutoPlayTimer, syncFrame]
  );

  useEffect(() => {
    if (traceIndex < 0 || traceIndex >= traceSteps.length) return;
    const step = traceSteps[traceIndex];
    setFrame(step);
    setMessage(step.message || "");
  }, [traceIndex, traceSteps]);

  useEffect(() => {
    if (!hasPendingTrace) return undefined;
    if (traceIndex >= traceSteps.length - 1) {
      finalizeTrace();
      return undefined;
    }

    clearAutoPlayTimer();
    autoPlayTimerRef.current = setTimeout(() => {
      setTraceIndex((prev) => Math.min(prev + 1, traceSteps.length - 1));
    }, animationSpeed);

    return () => clearAutoPlayTimer();
  }, [
    animationSpeed,
    clearAutoPlayTimer,
    finalizeTrace,
    hasPendingTrace,
    traceIndex,
    traceSteps.length,
  ]);

  const replayLastOperation = useCallback(() => {
    if (operationLocked || !lastOperation) return;
    beginTrace(
      lastOperation.trace,
      lastOperation.finalTree.clone(),
      lastOperation.finalMessage,
      { saveReplay: false }
    );
  }, [beginTrace, lastOperation, operationLocked]);

  const initializeTree = useCallback(() => {
    resetTraceState();
    setLastOperation(null);
    const next = new AVLTree();
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

    keys.forEach((key) => {
      next.insertWithTrace(key, t);
    });

    setTree(next);
    syncFrame(next);
    setMessage(t("initializedTree", { count: nodeCount, method: t(initMethod) }));
    setTraversalResult("");
  }, [initMethod, nodeCount, resetTraceState, syncFrame, t]);

  useEffect(() => {
    initializeTree();
  }, []);

  const runNumberOperation = useCallback(
    (operation) => {
      if (operationLocked || inputValue.trim() === "") return;
      const parsed = Number.parseInt(inputValue, 10);
      if (Number.isNaN(parsed)) {
        setMessage(t("invalidNumber"));
        return;
      }

      const working = tree.clone();
      let opResult;

      if (operation === "insert") {
        opResult = working.insertWithTrace(parsed, t);
        beginTrace(
          opResult.trace,
          working,
          opResult.inserted ? t("inserted_value", { value: parsed }) : t("nodeExists", { value: parsed })
        );
      } else if (operation === "delete") {
        opResult = working.deleteWithTrace(parsed, t);
        beginTrace(
          opResult.trace,
          working,
          opResult.deleted ? t("deleted_value", { value: parsed }) : t("notFound_value", { value: parsed })
        );
      } else {
        opResult = working.searchWithTrace(parsed, t);
        beginTrace(
          opResult.trace,
          working,
          opResult.found ? t("found_value", { value: parsed }) : t("notFound_value", { value: parsed })
        );
      }

      setInputValue("");
    },
    [beginTrace, inputValue, operationLocked, t, tree]
  );

  const animateTraversal = useCallback(
    (type) => {
      if (operationLocked) return;

      const order = tree[type]();
      if (order.length === 0) {
        setMessage(t("avl_tree_empty"));
        setTraversalResult("");
        return;
      }

      const seen = [];
      const steps = [];

      for (const key of order) {
        seen.push(key);
        steps.push(
          tree.makeFrame({
            highlightedKeys: [...seen],
            focusKeys: [key],
            message: t("avl_traverse_step", { type: t(type), value: key }),
            phase: "traverse",
          })
        );
      }

      steps.push(
        tree.makeFrame({
          highlightedKeys: [...seen],
          message: t("avl_traverse_done", { type: t(type) }),
          phase: "result",
        })
      );

      setTraversalResult(`${t(type)}: ${order.join(" -> ")}`);
      beginTrace(steps, tree, t("avl_traverse_done", { type: t(type) }));
    },
    [beginTrace, operationLocked, t, tree]
  );

  const clearTree = useCallback(() => {
    if (operationLocked) return;
    resetTraceState();
    setLastOperation(null);
    const working = tree.clone();
    working.clear();
    setTree(working);
    syncFrame(working);
    setMessage(t("avl_cleared"));
    setTraversalResult("");
  }, [operationLocked, resetTraceState, syncFrame, t, tree]);

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

  const treeDimensions = useMemo(() => getTreeDimensions(frame?.root), [frame?.root, getTreeDimensions]);
  const svgWidth = treeDimensions.maxX - treeDimensions.minX + 120;
  const svgHeight = treeDimensions.maxY + 140;

  const renderTree = useCallback(
    (node) => {
      if (!node) return null;

      const isFocus = frame?.focusKeys?.includes(node.key);
      const isHighlighted = frame?.highlightedKeys?.includes(node.key);
      const nodeFill = isFocus ? "#ef4444" : isHighlighted ? "#f59e0b" : "#2563eb";

      return (
        <g key={`${node.key}-${node.x}-${node.y}`}>
          {node.left && (
            <line
              x1={node.x}
              y1={node.y + 20}
              x2={node.left.x}
              y2={node.left.y - 20}
              stroke="#64748b"
              strokeWidth="2"
            />
          )}
          {node.right && (
            <line
              x1={node.x}
              y1={node.y + 20}
              x2={node.right.x}
              y2={node.right.y - 20}
              stroke="#64748b"
              strokeWidth="2"
            />
          )}

          <circle cx={node.x} cy={node.y} r="21" fill={nodeFill} />
          <text x={node.x} y={node.y} textAnchor="middle" dy=".3em" fill="white" fontSize="13">
            {node.key}
          </text>
          <text x={node.x} y={node.y + 33} textAnchor="middle" fill="#334155" fontSize="11">
            H:{node.height} BF:{node.balance}
          </text>

          {node.left && renderTree(node.left)}
          {node.right && renderTree(node.right)}
        </g>
      );
    },
    [frame]
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-4/5">
        <div className="border rounded overflow-auto" style={{ maxHeight: "82vh" }}>
          <svg width={Math.max(svgWidth, 740)} height={Math.max(svgHeight, 320)} className="min-w-full bg-white">
            <g transform={`translate(${-treeDimensions.minX + 60}, 60)`}>{renderTree(frame?.root)}</g>
          </svg>
        </div>
        <div className="mt-4 flex justify-center">
          <div className="w-full max-w-3xl rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-700 min-h-[64px]">
            <div className="font-medium">{message}</div>
            {frame?.rotationType && <div>{t("avl_current_rotation", { type: frame.rotationType })}</div>}
            {traversalResult && <div>{traversalResult}</div>}
          </div>
        </div>
      </div>

      <div className="lg:w-1/5">
        <div className="mb-3">
          <label htmlFor="nodeCount" className="block mb-2">
            {t("nodeCount")}:
          </label>
          <input
            id="nodeCount"
            type="number"
            min="1"
            max="50"
            value={nodeCount}
            onChange={(e) => setNodeCount(Math.min(50, Math.max(1, Number.parseInt(e.target.value, 10) || 1)))}
            disabled={operationLocked}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        <div className="mb-3">
          <label className="block mb-2">{t("initMethod")}:</label>
          <CustomListbox
            value={t(initMethod)}
            onChange={(value) => setInitMethod(value === t("random") ? "random" : "sequential")}
            options={[t("random"), t("sequential")]}
            className="w-full"
          />
        </div>

        <div className="mb-3">
          <label htmlFor="avlSpeed" className="block mb-2">
            {t("speed")}: {animationSpeed}ms
          </label>
          <input
            id="avlSpeed"
            type="range"
            min="180"
            max="900"
            step="30"
            value={animationSpeed}
            disabled={operationLocked}
            onChange={(e) => setAnimationSpeed(Number.parseInt(e.target.value, 10))}
            className="w-full"
          />
        </div>

        <button
          onClick={initializeTree}
          disabled={operationLocked}
          className="w-full mb-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
        >
          {t("initializeTree")}
        </button>

        <div className="mb-3">
          <Combobox value={inputValue} onChange={setInputValue}>
            <ComboboxInput
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={t("enterNumber")}
              disabled={operationLocked}
            />
          </Combobox>
        </div>

        <button
          onClick={() => runNumberOperation("insert")}
          disabled={operationLocked}
          className="w-full mb-2 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 disabled:bg-emerald-300"
        >
          {t("insert")}
        </button>
        <button
          onClick={() => runNumberOperation("delete")}
          disabled={operationLocked}
          className="w-full mb-2 px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 disabled:bg-rose-300"
        >
          {t("delete")}
        </button>
        <button
          onClick={() => runNumberOperation("search")}
          disabled={operationLocked}
          className="w-full mb-3 px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:bg-amber-300"
        >
          {t("search")}
        </button>
        <button
          onClick={replayLastOperation}
          disabled={operationLocked || !lastOperation}
          className="w-full mb-3 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {t("replayLastOperation")}
        </button>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button
            onClick={() => animateTraversal("inorder")}
            disabled={operationLocked}
            className="px-3 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:bg-slate-400"
          >
            {t("inorder")}
          </button>
          <button
            onClick={() => animateTraversal("preorder")}
            disabled={operationLocked}
            className="px-3 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:bg-slate-400"
          >
            {t("preorder")}
          </button>
          <button
            onClick={() => animateTraversal("postorder")}
            disabled={operationLocked}
            className="px-3 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:bg-slate-400"
          >
            {t("postorder")}
          </button>
          <button
            onClick={() => animateTraversal("levelorder")}
            disabled={operationLocked}
            className="px-3 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 disabled:bg-slate-400"
          >
            {t("levelorder")}
          </button>
        </div>

        <button
          onClick={clearTree}
          disabled={operationLocked}
          className="w-full mb-3 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300"
        >
          {t("clearTree")}
        </button>
      </div>
    </div>
  );
};

export default AVLTreeVisualization;
