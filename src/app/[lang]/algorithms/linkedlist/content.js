"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { useI18n } from "@/app/i18n/client";

class LinkedListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  async insert(value, index, callback) {
    const newNode = new LinkedListNode(value);

    if (index < 0 || index > this.length) {
      throw new Error("Invalid index", index);
    }

    if (index === 0) {
      newNode.next = this.head;
      this.head = newNode;
      if (!this.tail) {
        this.tail = newNode;
      }
    } else if (index === this.length) {
      this.tail.next = newNode;
      this.tail = newNode;
    } else {
      let current = this.head;
      for (let i = 0; i < index - 1; i++) {
        current = current.next;
      }
      await callback({ step: 1, index: index, newNode });
      await new Promise((resolve) => setTimeout(resolve, 500));

      await callback({
        step: 2,
        index: index,
        newNode,
        nextNode: current.next,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      newNode.next = current.next;
      await callback({
        step: 3,
        index: index,
        newNode,
        nextNode: current.next,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      current.next = newNode;
    }

    this.length++;
    await callback({ step: 4 });
  }

  async remove(index, callback) {
    if (index < 0 || index >= this.length) {
      throw new Error("Invalid index");
    }

    let removedNode;
    if (index === 0) {
      // Removing head
      removedNode = this.head;
      this.head = this.head.next;
      if (this.length === 1) {
        this.tail = null;
      }
      await callback({ step: 1, nextNode: this.head });
    } else {
      let current = this.head;
      let prev = null;
      for (let i = 0; i < index; i++) {
        prev = current;
        current = current.next;
      }
      removedNode = current;
      prev.next = current.next;
      await callback({
        step: 1,
        index,
        prevNode: prev,
        nextNode: current.next,
      });
      if (index === this.length - 1) {
        this.tail = prev;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      await callback({
        step: 2,
        index,
        prevNode: prev,
        nextNode: current.next,
      });
    }

    this.length--;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await callback({ step: 3 });
    return removedNode.value;
  }

  async search(value, callback) {
    let current = this.head;
    let index = 0;

    while (current) {
      await callback({ step: 1, node: current, index });
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (current.value === value) {
        await callback({ step: 2, node: current, index });
        return index;
      }

      current = current.next;
      index++;
    }

    await callback({ step: 3 });
    return -1;
  }

  initialize(values) {
    values.forEach((value, index) => {
      const newNode = new LinkedListNode(value);
      if (!this.head) {
        // 如果链表为空，新节点既是头也是尾
        this.head = newNode;
        this.tail = newNode;
      } else {
        // 否则，把新节点加到链表的末尾
        this.tail.next = newNode;
        this.tail = newNode;
      }
      this.length++;
    });
  }

  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current.value);
      current = current.next;
    }
    return result;
  }
}

const CustomNode = ({ data }) => (
  <div
    className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${
      data.highlight ? "ring-2 ring-yellow-400" : ""
    }`}
    style={{ backgroundColor: data.color || "#3b82f6" }}
  >
    <Handle type="target" position={Position.Left} style={{ left: "-4px" }} />
    {data.label}
    <Handle type="source" position={Position.Right} style={{ right: "-4px" }} />
  </div>
);

const nodeTypes = {
  custom: CustomNode,
};

const defaultEdgeStyle = {
  stroke: "#b1b1b7",
  strokeWidth: 2,
};

const insertionEdgeStyle = {
  stroke: "#22c55e",
  strokeWidth: 2,
};

const removalEdgeStyle = {
  stroke: "#ef4444",
  strokeWidth: 2,
};

const getEdgeStyle = (type = "default") => ({
  type: type === "removal" ? "smoothstep" : "default", // This creates a curved edge
  style:
    type === "insertion"
      ? insertionEdgeStyle
      : type === "removal"
      ? removalEdgeStyle
      : defaultEdgeStyle,
  animated: type !== "default",
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 6,
    height: 6,
    color:
      type === "insertion"
        ? "#22c55e"
        : type === "removal"
        ? "#ef4444"
        : "#b1b1b7",
  },
});

const LinkedListVisualization = ({ lang }) => {
  const { t } = useI18n();
  const [linkedList, setLinkedList] = useState(() => {
    const list = new LinkedList();
    list.initialize(["1", "2", "6", "8", "3", "5"]);
    return list;
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [isInserting, setIsInserting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [removingNodeId, setRemovingNodeId] = useState(null);
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [containerHeight, setContainerHeight] = useState("100vh");
  const containerRef = useRef(null);

  const updateVisualization = useCallback(() => {
    const listArray = linkedList.toArray();

    setNodes(
      listArray.map((value, index) => ({
        id: index.toString(),
        type: "custom",
        data: { label: value, color: "#3b82f6" },
        position: { x: index * 60, y: 50 },
      }))
    );
    setEdges(
      listArray.slice(0, -1).map((_, index) => ({
        id: `e${index}-${index + 1}`,
        source: index.toString(),
        target: (index + 1).toString(),
        ...getEdgeStyle(),
      }))
    );
  }, [linkedList, setNodes, setEdges]);

  const handleInsertionStep = useCallback(
    async ({ step, index, newNode, nextNode }) => {
      switch (step) {
        case 1:
          setNodes((nds) => [
            ...nds,
            {
              id: "new",
              type: "custom",
              data: { label: newNode.value, color: "#22c55e", highlight: true },
              position: { x: (index - 0.5) * 60, y: 100 },
            },
          ]);
          break;
        case 2:
          if (nextNode) {
            setEdges((eds) => [
              ...eds,
              {
                id: `enew-${index}`,
                source: "new",
                target: index.toString(),
                ...getEdgeStyle("insertion"),
              },
            ]);
          }
          break;
        case 3:
          setEdges((eds) => {
            // Remove the old edge
            const updatedEdges = eds.filter(
              (edge) =>
                edge.source !== (index - 1).toString() &&
                edge.target !== index.toString()
            );
            // Add the new edges
            return [
              ...updatedEdges,
              {
                id: `e${index - 1}-new`,
                source: (index - 1).toString(),
                target: "new",
                ...getEdgeStyle("insertion"),
              },
              {
                id: `enew-${index}`,
                source: "new",
                target: index.toString(),
                ...getEdgeStyle("insertion"),
              },
            ];
          });
          break;
        case 4:
          updateVisualization();
          setIsInserting(false);
          break;
      }
    },
    [setNodes, setEdges, updateVisualization]
  );

  const startInsertion = useCallback(async () => {
    if (inputValue.trim() === "") return;
    setIsInserting(true);
    const index = selectedNode ? parseInt(selectedNode) + 1 : linkedList.length;
    await linkedList.insert(inputValue, index, handleInsertionStep);
    setInputValue("");
    setSelectedNode(null);
    setRemovingNodeId(null);
  }, [inputValue, selectedNode, linkedList, handleInsertionStep]);

  const handleRemovalStep = useCallback(
    async ({ step, index, prevNode, nextNode }) => {
      switch (step) {
        case 1:
          // Highlight the node to be removed
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === removingNodeId) {
                const newNode = {
                  ...node,
                  data: { ...node.data, color: "#ef4444", highlight: true },
                };

                // Only change position if both prevNode and nextNode exist
                if (prevNode && nextNode) {
                  newNode.position = {
                    ...node.position,
                    y: node.position.y + 50, // Move the node 50 pixels down
                  };
                }

                return newNode;
              }
              return node;
            })
          );
          break;
        case 2:
          // Remove the old edges and add the new edge (if not removing head or tail)
          setEdges((eds) => {
            const updatedEdges = eds.filter(
              (edge) => edge.target !== removingNodeId
            );
            if (prevNode && nextNode) {
              updatedEdges.push({
                id: `e${index - 1}-${index + 1}`,
                source: (index - 1).toString(),
                target: (index + 1).toString(),
                ...getEdgeStyle("removal"),
              });
            }
            return updatedEdges;
          });
          break;
        case 3:
          // Remove the node and update the visualization
          updateVisualization();
          setRemovingNodeId(null);
          setSelectedNode(null);
          break;
      }
    },
    [removingNodeId, setNodes, setEdges, updateVisualization]
  );

  const startRemoval = useCallback(async () => {
    if (removingNodeId === null) return;
    setIsRemoving(true);
    const index = parseInt(removingNodeId);
    await linkedList.remove(index, handleRemovalStep);
    setIsRemoving(false);
    setRemovingNodeId(null);
    setSelectedNode(null);
  }, [removingNodeId, linkedList, handleRemovalStep]);

  const handleSearchStep = useCallback(
    async ({ step, index }) => {
      switch (step) {
        case 1:
          // Highlight the current node being searched
          setNodes((nds) =>
            nds.map((n) => ({
              ...n,
              data: {
                ...n.data,
                highlight: n.id === index.toString(),
                color: n.id === index.toString() ? "#fbbf24" : "#3b82f6",
              },
            }))
          );
          break;
        case 2:
          // Node found
          setNodes((nds) =>
            nds.map((n) => ({
              ...n,
              data: {
                ...n.data,
                highlight: n.id === index.toString(),
                color: n.id === index.toString() ? "#22c55e" : "#3b82f6",
              },
            }))
          );
          break;
        case 3:
          // Node not found
          updateVisualization();
          break;
      }
    },
    [setNodes, updateVisualization]
  );

  const startSearch = useCallback(async () => {
    if (searchValue.trim() === "") return;
    setIsSearching(true);
    setSearchResult(null);
    const result = await linkedList.search(searchValue, handleSearchStep);
    setIsSearching(false);
    setSearchResult(result);
  }, [searchValue, linkedList, handleSearchStep]);

  const onNodeClick = useCallback(
    (_, node) => {
      if (!isInserting && !isRemoving) {
        setRemovingNodeId(node.id);
        setSelectedNode(node.id);
      }
    },
    [isInserting, isRemoving]
  );

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const viewportHeight = window.innerHeight;
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const newHeight = viewportHeight - containerTop;
        setContainerHeight(`${newHeight}px`);
      }
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);

    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);

  return (
    <div className="w-full flex">
      <div
        className="w-3/4 h-full"
        ref={containerRef}
        style={{ height: containerHeight }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <div className="w-1/4 h-full p-4 flex flex-col space-y-8 overflow-y-auto">
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
            placeholder={t("enter_node_value")}
            disabled={isInserting}
          />
          <button
            onClick={startInsertion}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={inputValue.trim() === "" || isInserting}
          >
            {t("insert")}
          </button>
          <span className="text-gray-600 text-sm">
            {selectedNode
              ? t("insert_after_pos", { index: selectedNode })
              : t("insert_at_end")}
          </span>
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={startRemoval}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            disabled={removingNodeId === null || isRemoving || isInserting}
          >
            {t("delete")}
          </button>
          <span className="text-gray-600 text-sm">
            {removingNodeId !== null
              ? t("remove_node_at", { index: removingNodeId })
              : t("click_node_to_remove")}
          </span>
        </div>

        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1"
            placeholder={t("enter_node_value")}
            disabled={isSearching}
          />
          <button
            onClick={startSearch}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            disabled={searchValue.trim() === "" || isSearching}
          >
            {t("search")}
          </button>

          <span className="text-gray-600 text-sm">
            {" "}
            {searchResult !== null &&
              (searchResult === -1
                ? t("node_not_found")
                : t("node_found_index", { index: searchResult }))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LinkedListVisualization;
