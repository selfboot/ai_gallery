import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

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
          width: "8px",
          height: "8px",
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
          width: "8px",
          height: "8px",
          opacity: 0, // Make it invisible
        }}
      />
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  style = {},
}) => {
  const edgePath = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path stroke-current text-gray-500"
        d={edgePath}
      />
      <text className="text-xs">
        <textPath
          href={`#${id}`}
          className="text-gray-700"
          startOffset="50%"
          textAnchor="middle"
        >
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

    // 初始化距离矩阵
    this.nodes.forEach((node, index) => {
      this.distances[node] = {};

      this.nodes.forEach((innerNode, innerIndex) => {
        if (matrix[index + 1][innerIndex + 1] === "inf") {
          this.distances[node][innerNode] = Infinity;
        } else {
          this.distances[node][innerNode] = matrix[index + 1][innerIndex + 1];
        }
      });
    });
  }

  findShortestPath(startNode) {
    let distances = {};
    let parents = {};
    let visited = new Set();
    let unvisited = new Set(this.nodes);

    // 初始化距离和父节点
    for (let node in this.distances) {
      distances[node] = Infinity;
      parents[node] = null;
    }
    distances[startNode] = 0;

    while (unvisited.size > 0) {
      // 从未访问过的节点中找到距离最小的节点
      let currentNode = Array.from(unvisited).reduce(
        (minNode, node) =>
          distances[node] < distances[minNode] ? node : minNode,
        Array.from(unvisited)[0]
      );

      unvisited.delete(currentNode);
      visited.add(currentNode);

      // 更新当前节点的所有邻接节点的距离
      for (let neighbor in this.distances[currentNode]) {
        if (visited.has(neighbor)) continue;
        let newDistance =
          distances[currentNode] + this.distances[currentNode][neighbor];
        if (newDistance < distances[neighbor]) {
          distances[neighbor] = newDistance;
          parents[neighbor] = currentNode;
        }
      }

      this.steps.push({
        currentNode,
        distances: { ...distances },
        visited: new Set(visited),
      });
    }

    return { distances, parents, steps: this.steps };
  }
}

const WeightModal = ({ isOpen, onClose, onSubmit, initialWeight = "" }) => {
  const [weight, setWeight] = useState(initialWeight);
  const { t } = useTranslation();

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

const GraphEditor = () => {
  const [matrix, setMatrix] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalParams, setModalParams] = useState({ edge: null, params: null });

  const [nodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const { t } = useTranslation();
  const flowRef = useRef(null);
  const [startNode, setStartNode] = useState(null);
  const [result, setResult] = useState(null);
  const [highlight, setHighlight] = useState({ cells: [] });

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
    if (nodes.length > 0) {
      setStartNode(nodes[0].data.label); // 设置默认起始节点
    }
  }, [nodes, edges]);

  const handleStartNodeChange = (event) => {
      setStartNode(event.target.value);
  };

  const handleCalculate = () => {
    const graph = new Dijkstra(matrix);
    const result = graph.findShortestPath(startNode);
    setResult(result);
  };

  const handleWeightSubmit = (weight) => {
    if (modalParams.edge) {
      const sourceIndex = nodes.findIndex(n => n.id === modalParams.edge.source);
      const targetIndex = nodes.findIndex(n => n.id === modalParams.edge.target);
      // 设置两个单元格高亮
      setHighlight({ cells: [{ row: sourceIndex + 1, col: targetIndex + 1 }, { row: targetIndex + 1, col: sourceIndex + 1 }] });

      // 更新现有连线的权重
      setEdges((eds) => eds.map((e) => e.id === modalParams.edge.id ? { ...e, label: weight } : e));

      setTimeout(() => {
        setHighlight({ cells: [] });
      }, 3000);
    } 
    setIsModalOpen(false);
    setModalParams({ params: null, edge: null }); // 清理参数，防止重复使用
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
          <button
            onClick={handleCalculate}
            className="px-4 py-2 bg-green-500 text-white rounded-md shadow-md hover:bg-green-600 focus:outline-none transition-colors duration-200"
          >
            {t("find_path")}
          </button>
        </div>
        <div className="h-[calc(100vh-20rem)] w-full min-h-[50rem]">
          <ReactFlow
            ref={flowRef}
            nodes={nodes}
            edges={edges}
            onEdgeDoubleClick={onEdgeDoubleClick}
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
                  // 检查当前单元格是否需要高亮
                  const isHighlighted = highlight.cells.some((h) => h.row === i + 1 && h.col === j);
                  return (
                    <td key={j} className={`text-center px-3 py-3 ${isHighlighted ? "bg-gray-100 text-red-500" : ""}`}>
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {result && (
          <div>
            <h2 className="text-2xl pt-5 pb-5">{t("search_process")}</h2>
            <pre>{JSON.stringify(result.steps, null, 2)}</pre>
          </div>
        )}
      </div>
      <WeightModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalParams({ params: null, edge: null }); // 关闭模态框时清理参数
        }}
        onSubmit={handleWeightSubmit}
        initialWeight={modalParams.edge ? modalParams.edge.label : ""}
      />
    </div>
  );
};

export default GraphEditor;
