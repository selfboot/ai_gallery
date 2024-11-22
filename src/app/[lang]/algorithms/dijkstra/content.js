"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";

import "reactflow/dist/style.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import { useI18n } from "@/app/i18n/client";

const initialNodes = [
  {
    id: "A",
    position: { x: 0, y: 100 },
    data: { label: "A" },
    type: "customNode",
  },
  {
    id: "B",
    position: { x: 100, y: 0 },
    data: { label: "B" },
    type: "customNode",
  },
  {
    id: "C",
    position: { x: 200, y: 0 },
    data: { label: "C" },
    type: "customNode",
  },
  {
    id: "D",
    position: { x: 100, y: 200 },
    data: { label: "D" },
    type: "customNode",
  },
  {
    id: "E",
    position: { x: 200, y: 200 },
    data: { label: "E" },
    type: "customNode",
  },
  {
    id: "F",
    position: { x: 300, y: 100 },
    data: { label: "F" },
    type: "customNode",
  },
];

const initialEdges = [
  { id: "AB", source: "A", target: "B", label: "10", type: "customEdge" },
  { id: "AD", source: "A", target: "D", label: "4", type: "customEdge" },
  { id: "BC", source: "B", target: "C", label: "8", type: "customEdge" },
  { id: "BD", source: "B", target: "D", label: "2", type: "customEdge" },
  { id: "BE", source: "B", target: "E", label: "6", type: "customEdge" },
  { id: "CE", source: "C", target: "E", label: "1", type: "customEdge" },
  { id: "CF", source: "C", target: "F", label: "5", type: "customEdge" },
  { id: "DE", source: "D", target: "E", label: "6", type: "customEdge" },
  { id: "EF", source: "E", target: "F", label: "12", type: "customEdge" },
];

const CustomNode = ({ data }) => {
  return (
    <div className="relative">
      <div className="bg-pink-500 text-white p-2 rounded-full w-6 h-6 flex justify-center items-center text-sm font-bold">
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="s-center"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "1px",
          height: "1px",
          opacity: 0, // Make it invisible
        }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="t-center"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "1px",
          height: "1px",
          opacity: 0, // Make it invisible
        }}
      />
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, label, style = {} }) => {
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  return (
    <>
      <path id={id} style={style} className="react-flow__edge-path stroke-current text-gray-500" d={edgePath} />
      <text className="text-xs">
        <textPath href={`#${id}`} className="text-gray-700" startOffset="50%" textAnchor="middle">
          {label}
        </textPath>
      </text>
    </>
  );
};

const edgeTypes = {
  customEdge: CustomEdge,
};

class Dijkstra {
  constructor(matrix) {
    this.nodes = matrix[0].slice(1);
    this.distances = {};
    this.matrix = matrix;
    this.steps = [];

    this.nodes.forEach((node, index) => {
      this.distances[node] = {};

      this.nodes.forEach((innerNode, innerIndex) => {
        let weight = matrix[index + 1][innerIndex + 1];
        if (weight === "inf") {
          this.distances[node][innerNode] = Infinity;
        } else {
          this.distances[node][innerNode] = parseFloat(weight);
        }
      });
    });
  }

  findShortestPath(startNode) {
    let distances = {};
    let parents = {};
    let visited = new Set();
    let unvisited = new Set(this.nodes);

    for (let node in this.distances) {
      distances[node] = Infinity;
      parents[node] = null;
    }
    distances[startNode] = 0;

    while (unvisited.size > 0) {
      // Find the node with the smallest distance from the unvisited set
      let currentNode = Array.from(unvisited).reduce(
        (minNode, node) => (distances[node] < distances[minNode] ? node : minNode),
        Array.from(unvisited)[0]
      );

      unvisited.delete(currentNode);
      visited.add(currentNode);

      // Update the distances of all adjacent nodes of the current node
      for (let neighbor in this.distances[currentNode]) {
        if (visited.has(neighbor)) continue;
        let newDistance = distances[currentNode] + this.distances[currentNode][neighbor];
        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          parents[neighbor] = currentNode;
        }
      }

      // console.log({ currentNode, visited: new Set([...visited]) });
      this.steps.push({
        currentNode,
        distances: { ...distances },
        visited: [...visited],
      });
    }

    return { distances, parents, steps: this.steps };
  }
}

const StepsTable = ({ steps, nodes }) => {
  const { t } = useI18n();
  return (
    <table className="w-full text-sm text-left text-gray-500">
      <thead className="text-xs text-gray-700 uppercase bg-gray-50 text-center">
        <tr>
          <th scope="col" className="px-3 py-3">
            {t("round")}
          </th>
          {nodes.map((node) => (
            <th key={node.id} scope="col" className="px-3 py-3">
              {node.data.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {steps.map((step, index) => (
          <tr key={index} className="bg-white border-b">
            <td className="text-center px-3 py-3">{index + 1}</td>
            {nodes.map((node) => (
              <td
                key={node.id}
                className={`text-center px-3 py-3 ${
                  step.visited.some((v) => v === node.id) ? "text-green-500 bg-gray-100 font-bold" : ""
                }`}
              >
                {step.distances[node.data.label] === Infinity ? "∞" : step.distances[node.data.label]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const WeightModal = ({ isOpen, onClose, onSubmit, initialWeight = "" }) => {
  const [weight, setWeight] = useState(initialWeight);
  const { t } = useI18n();

  useEffect(() => {
    setWeight(initialWeight);
  }, [initialWeight]);

  const handleSubmit = () => {
    onSubmit(weight);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <FontAwesomeIcon icon={faTimes} className="h-6 w-6" />
        </button>
        <div className="flex items-center space-x-4 mt-8">
          <label className="font-semibold text-gray-700">{t("weight")}</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="border-2 border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500 transition duration-200"
            style={{ minWidth: "100px" }}
          />
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
          >
            {t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
};

const DijkstraVisualization = () => {
  const [matrix, setMatrix] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalParams, setModalParams] = useState({ edge: null, params: null });

  const defaultEdgeStyle = useMemo(
    () => ({
      stroke: "#999",
      strokeWidth: 2,
    }),
    []
  );

  const initializeEdges = (edges) => {
    return edges.map((edge) => ({ ...edge, style: { ...defaultEdgeStyle } }));
  };
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initializeEdges(initialEdges));

  const { t } = useI18n();
  const flowRef = useRef(null);
  const [startNode, setStartNode] = useState("");
  const [result, setResult] = useState(null);
  const [highlight, setHighlight] = useState({ cells: [] });
  const [showSteps, setShowSteps] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const updateEdgeStyles = (path, edges) => {
    // Build edge identifiers, in the form "start-end"
    const pathEdges = new Set();
    for (let i = 1; i < path.length; i++) {
      pathEdges.add(`${path[i - 1]}-${path[i]}`);
      pathEdges.add(`${path[i]}-${path[i - 1]}`);
    }

    // Update the styles of the edges
    return edges.map((edge) => {
      if (pathEdges.has(`${edge.source}-${edge.target}`)) {
        return { ...edge, style: { stroke: "#32CD32", strokeWidth: 3 } }; // 用绿色高亮路径上的边
      }
      return edge;
    });
  };

  const calculatePath = (currentNode, parents) => {
    let path = [];
    let node = currentNode;
    while (node !== null) {
      path.push(node);
      node = parents[node];
    }
    return path.reverse(); // reverse the path to get the correct order
  };

  const handleStepForward = () => {
    if (!result || currentStepIndex >= result.steps.length - 1) return;
    
    setCurrentStepIndex(currentStepIndex + 1);
    const path = calculatePath(result.steps[currentStepIndex + 1].currentNode, result.parents);
    const updatedEdges = updateEdgeStyles(path, edges);
    setEdges(updatedEdges);
  };

  useEffect(() => {
    if (!result || !isAutoPlay) return;

    const intervalId = setInterval(() => {
      if (currentStepIndex < result.steps.length - 1) {
        handleStepForward();
      } else {
        setIsAutoPlay(false);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [currentStepIndex, result, isAutoPlay]);

  const updateMatrix = (nodes, edges) => {
    const size = nodes.length;
    const newMatrix = Array(size + 1)
      .fill(null)
      .map(() => Array(size + 1).fill("Inf"));

    for (let i = 1; i <= size; i++) {
      newMatrix[0][i] = nodes[i - 1].data.label;
      newMatrix[i][0] = nodes[i - 1].data.label;
    }

    edges.forEach((edge) => {
      const sourceIndex = nodes.findIndex((n) => n.id === edge.source) + 1;
      const targetIndex = nodes.findIndex((n) => n.id === edge.target) + 1;
      if (sourceIndex && targetIndex) {
        newMatrix[sourceIndex][targetIndex] = edge.label;
        newMatrix[targetIndex][sourceIndex] = edge.label; // 因为是无向图
      }
    });

    setMatrix(newMatrix);
  };
  useEffect(() => {
    updateMatrix(nodes, edges);
    if (startNode === "") {
      setStartNode(nodes[0].data.label); // set the first node as the default node
    }
  }, [nodes, edges, startNode]);

  const handleStartNodeChange = (event) => {
    setResult(null);
    setCurrentStepIndex(0);
    setShowSteps(false);
    setStartNode(event.target.value);
    setEdges(resetEdgeStyles(edges));
  };

  const handleCalculate = () => {
    const graph = new Dijkstra(matrix);
    setResult(null);
    setCurrentStepIndex(0);
    setShowSteps(false);
    setEdges(resetEdgeStyles(edges));
    const result = graph.findShortestPath(startNode);
    setResult(result);
    setShowSteps(true);
    setIsAutoPlay(false);
  };

  const resetEdgeStyles = useCallback(
    (edges) => {
      return edges.map((edge) => ({ ...edge, style: defaultEdgeStyle }));
    },
    [defaultEdgeStyle]
  );

  const onNodesChange = useCallback(
    (changes) => {
      setNodes((ns) => applyNodeChanges(changes, ns));
      if (changes.some((change) => change.type === "remove")) {
        setEdges(resetEdgeStyles(edges));
        setResult(null);
        setCurrentStepIndex(0);
        setShowSteps(false);
      }
    },
    [setNodes, edges, setEdges, resetEdgeStyles]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      if (changes.some((change) => change.type === "remove")) {
        setEdges((es) => {
          const updatedEdges = applyEdgeChanges(changes, es);
          return resetEdgeStyles(updatedEdges);
        });
        setResult(null);
        setCurrentStepIndex(0);
        setShowSteps(false);
      }
    },
    [resetEdgeStyles, setEdges]
  );

  const handleWeightSubmit = (weight) => {
    if (modalParams.edge) {
      const sourceIndex = nodes.findIndex((n) => n.id === modalParams.edge.source);
      const targetIndex = nodes.findIndex((n) => n.id === modalParams.edge.target);
      // highlight the edge
      setHighlight({
        cells: [
          { row: sourceIndex + 1, col: targetIndex + 1 },
          { row: targetIndex + 1, col: sourceIndex + 1 },
        ],
      });

      // change the weight of the edge
      const newEdges = edges.map((e) => (e.id === modalParams.edge.id ? { ...e, label: weight } : e));
      const resetEdges = resetEdgeStyles(newEdges);
      setEdges(resetEdges);
      setTimeout(() => {
        setHighlight({ cells: [] });
      }, 3000);
    }
    setIsModalOpen(false);
    setModalParams({ params: null, edge: null }); // clear the params
    setResult(null); // clear the result
    setCurrentStepIndex(0);
    setShowSteps(false);
  };

  const onEdgeDoubleClick = (event, edge) => {
    setModalParams({ edge, params: null });
    setIsModalOpen(true);
  };

  return (
    <div className="flex w-full h-full overflow-auto">
      <div className="w-3/5 h-full relative">
        <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
          <div className="flex items-center">
            <label htmlFor="startNodeSelect" className="mr-2 flex-none">
              {t("select_start")}
            </label>
            <select value={startNode} onChange={handleStartNodeChange} className="px-4 py-2 mr-2 rounded-md w-full">
              {matrix[0] &&
                matrix[0].slice(1).map((node) => (
                  <option key={node} value={node}>
                    {" "}
                    {node}{" "}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleCalculate}
              className="px-4 py-2 bg-green-500 text-white rounded-md shadow-md hover:bg-green-600 focus:outline-none transition-colors duration-200"
            >
              {t("find_path")}
            </button>
            {result && (
              <>
                <button
                  onClick={handleStepForward}
                  disabled={currentStepIndex >= result.steps.length - 1 || isAutoPlay}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-md hover:bg-blue-600 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("next_step")}
                </button>
                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  disabled={currentStepIndex >= result.steps.length - 1}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md shadow-md hover:bg-purple-600 focus:outline-none transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAutoPlay ? t("pause") : t("auto_play")}
                </button>
              </>
            )}
          </div>
        </div>
        <div className="h-[calc(100vh-20rem)] w-full min-h-[50rem]">
          <ReactFlow
            ref={flowRef}
            nodes={nodes}
            edges={edges}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            style={{ width: "100%", height: "100%" }}
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>
      <div className="w-2/5 p-5 overflow-auto">
        <h2 className="text-2xl pb-5">{t("weight_matrix")}</h2>
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 text-center">
            <tr>
              {matrix[0] &&
                matrix[0].map((id, index) => (
                  <th key={index} scope="col" className="px-3 py-3">
                    {id || ""}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {matrix.slice(1).map((row, i) => (
              <tr key={i} className="bg-white border-b">
                {row.map((cell, j) => {
                  // Check if the current cell needs to be highlighted
                  const isHighlighted = highlight.cells.some((h) => h.row === i + 1 && h.col === j);
                  return (
                    <td
                      key={j}
                      className={`text-center px-3 py-3 ${isHighlighted ? "bg-gray-100 text-green-500 font-bold" : ""}`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {showSteps && result && (
          <div>
            <h2 className="text-2xl pt-5 pb-5">{t("search_process")}</h2>
            <StepsTable steps={result.steps.slice(0, currentStepIndex + 1)} nodes={nodes} />
          </div>
        )}
      </div>
      <WeightModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalParams({ params: null, edge: null });
        }}
        onSubmit={handleWeightSubmit}
        initialWeight={modalParams.edge ? modalParams.edge.label : ""}
      />
    </div>
  );
};

export default DijkstraVisualization;
