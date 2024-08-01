"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import crypto from "crypto";
import { useI18n } from "@/app/i18n/client";

// Utility functions
const createHash = (key) => {
  const md5 = crypto.createHash("md5");
  md5.update(key);
  return md5.digest();
};

const getRandomString = () => Math.random().toString(36).substring(2, 8);

const ketamaHash = (key) => {
  const digest = createHash(key);
  return ((digest[3] & 0xff) << 24) | ((digest[2] & 0xff) << 16) | ((digest[1] & 0xff) << 8) | (digest[0] & 0xff);
};

// Main component
const ConsistentHashRing = () => {
  // State declarations
  const [nodes, setNodes] = useState([]);
  const [virtualNodes, setVirtualNodes] = useState([]);
  const [keys, setKeys] = useState([]);
  const [nodeCount, setNodeCount] = useState(3);
  const [virtualNodeCount, setVirtualNodeCount] = useState(0);
  const [ringSize] = useState(2 ** 32);
  const [migratedKeys, setMigratedKeys] = useState([]);
  const [notification, setNotification] = useState("");
  const { t } = useI18n();

  // Memoized values
  const colors = useMemo(
    () => [
      "red",
      "blue",
      "green",
      "purple",
      "orange",
      "pink",
      "indigo",
      "cyan",
      "lime",
      "amber",
      "emerald",
      "fuchsia",
      "rose",
      "sky",
      "violet",
      "slate",
      "stone",
      "neutral",
    ],
    []
  );

  // Helper functions
  const createVirtualNodes = useCallback((physicalNode, count) => {
    const vNodes = [];
    for (let i = 0; i < count; i++) {
      const vNodeName = `${physicalNode.name}-${i}`;
      vNodes.push({
        name: vNodeName,
        position: ketamaHash(vNodeName),
        physicalNode: physicalNode.name,
      });
    }
    return vNodes;
  }, []);

  const getNodeForKey = useCallback(
    (keyPosition, currentNodes, currentVirtualNodes) => {
      const nodeList = virtualNodeCount > 0 ? currentVirtualNodes : currentNodes;
      if (nodeList.length === 0) return null;
      for (let i = 0; i < nodeList.length; i++) {
        if (keyPosition <= nodeList[i].position) {
          return virtualNodeCount > 0 ? currentNodes.find((n) => n.name === nodeList[i].physicalNode) : nodeList[i];
        }
      }
      return virtualNodeCount > 0 ? currentNodes.find((n) => n.name === nodeList[0].physicalNode) : nodeList[0];
    },
    [virtualNodeCount]
  );

  // Main functions
  const initializeRing = useCallback(() => {
    let newNodes = [];
    let newVirtualNodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const nodeName = `Node-${getRandomString()}`;
      const nodeHash = ketamaHash(nodeName);
      const newNode = {
        name: nodeName,
        position: nodeHash,
        color: colors[i % colors.length],
      };
      newNodes.push(newNode);
      if (virtualNodeCount > 0) {
        newVirtualNodes = [...newVirtualNodes, ...createVirtualNodes(newNode, virtualNodeCount)];
      }
    }
    newNodes.sort((a, b) => a.position - b.position);
    if (virtualNodeCount > 0) {
      newVirtualNodes.sort((a, b) => a.position - b.position);
    }
    setNodes(newNodes);
    setVirtualNodes(newVirtualNodes);
    setKeys([]);
    setMigratedKeys([]);
    setNotification("");
  }, [nodeCount, virtualNodeCount, colors, createVirtualNodes]);

  const resetAll = useCallback(() => {
    setNodeCount(3);
    setVirtualNodeCount(0);
    initializeRing();
  }, [initializeRing]);

  const addKeys = useCallback(
    (count) => {
      const newKeys = [];
      for (let i = 0; i < count; i++) {
        const newKey = `Key${keys.length + i + 1}`;
        const position = ketamaHash(newKey);
        const assignedNode = getNodeForKey(position, nodes, virtualNodes);
        newKeys.push({ name: newKey, position, assignedNode: assignedNode.name });
      }
      setKeys([...keys, ...newKeys]);
    },
    [keys, nodes, virtualNodes, getNodeForKey]
  );

  const addNode = useCallback(() => {
    const nodeName = `Node-${getRandomString()}`;
    const nodeHash = ketamaHash(nodeName);
    const newNode = {
      name: nodeName,
      position: nodeHash,
      color: colors[nodes.length % colors.length],
    };

    let newNodes = [...nodes, newNode];
    newNodes.sort((a, b) => a.position - b.position);

    let newVirtualNodes = virtualNodes;
    if (virtualNodeCount > 0) {
      const newVirtualNodesForNewNode = createVirtualNodes(newNode, virtualNodeCount);
      newVirtualNodes = [...virtualNodes, ...newVirtualNodesForNewNode];
      newVirtualNodes.sort((a, b) => a.position - b.position);
    }

    let migratedCount = 0;
    const updatedKeys = keys.map((key) => {
      const newAssignedNode = getNodeForKey(key.position, newNodes, newVirtualNodes);
      if (newAssignedNode.name !== key.assignedNode) {
        migratedCount++;
        setMigratedKeys((prev) => [...prev, { ...key, oldNode: key.assignedNode, newNode: newAssignedNode.name }]);
        setTimeout(() => {
          setMigratedKeys((prev) => prev.filter((k) => k.name !== key.name));
        }, 1000);
        return { ...key, assignedNode: newAssignedNode.name };
      }
      return key;
    });

    setNodes(newNodes);
    setVirtualNodes(newVirtualNodes);
    setKeys(updatedKeys);
    setNotification(t('nodeAdded', { nodeName, migratedCount }));
  }, [nodes, virtualNodes, keys, colors, virtualNodeCount, createVirtualNodes, getNodeForKey]);

  const removeNode = useCallback(
    (nodeName) => {
      if (nodes.length <= 1) {
        setNotification(t('cannotRemoveLastNode'));
        return;
      }

      let newNodes = nodes.filter((n) => n.name !== nodeName);
      let newVirtualNodes = virtualNodes.filter((n) => n.physicalNode !== nodeName);

      let migratedCount = 0;
      const updatedKeys = keys.map((key) => {
        if (key.assignedNode === nodeName) {
          const newAssignedNode = getNodeForKey(key.position, newNodes, newVirtualNodes);
          migratedCount++;
          setMigratedKeys((prev) => [...prev, { ...key, oldNode: key.assignedNode, newNode: newAssignedNode.name }]);
          setTimeout(() => {
            setMigratedKeys((prev) => prev.filter((k) => k.name !== key.name));
          }, 1000);
          return { ...key, assignedNode: newAssignedNode.name };
        }
        return key;
      });

      setNodes(newNodes);
      setVirtualNodes(newVirtualNodes);
      setKeys(updatedKeys);
      setNotification(t('nodeRemoved', { nodeName, migratedCount }));
    },
    [nodes, virtualNodes, keys, getNodeForKey]
  );

  const getKeysForNode = useCallback(
    (nodeName) => {
      return keys.filter((key) => key.assignedNode === nodeName);
    },
    [keys]
  );

  const getNodeColor = useCallback(
    (nodeName) => {
      const node = nodes.find((n) => n.name === nodeName);
      return node ? node.color : "gray";
    },
    [nodes]
  );

  const getNodePosition = useCallback(
    (position) => {
      const angle = (2 * Math.PI * (position / ringSize) * 360) / 360;
      const radius = 50;
      return {
        x: 50 + radius * Math.cos(angle),
        y: 50 + radius * Math.sin(angle),
      };
    },
    [ringSize]
  );

  const getAutoSamplingRate = useCallback((count) => {
    if (count <= 1000) return 1;
    if (count <= 10000) return 0.1;
    return 0.01;
  }, []);

  useEffect(() => {
    initializeRing();
  }, [nodeCount, virtualNodeCount, initializeRing]);

  // Sub-components
  const NodeCircle = React.memo(({ node }) => {
    const keyCount = getKeysForNode(node.name).length;
    const { x, y } = getNodePosition(node.position);
    return (
      <Popover>
        {({ open }) => (
          <>
            <PopoverButton
              className="absolute w-8 h-8 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center focus:outline-none z-10"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: node.color,
                display: virtualNodeCount > 0 ? "none" : "flex",
              }}
            >
              <span className="text-white text-xs z-10">{keyCount}</span>
            </PopoverButton>
            <PopoverPanel className="absolute z-20 w-64 p-4 mt-2 bg-white rounded-md shadow-lg" anchor="bottom">
              <h3 className="font-bold text-lg mb-2">{node.name}</h3>
              <p>
                {t("position")}: {node.position}
              </p>
              <p>{t("keysOnNode", { count: keyCount })}</p>
              {virtualNodeCount > 0 && <p>{t("virtualNodes", { count: virtualNodeCount })}</p>}
              <p>{t("first10Keys")}:</p>
              <ul className="list-disc pl-5">
                {getKeysForNode(node.name)
                  .slice(0, 10)
                  .map((key) => (
                    <li key={key.name}>{key.name}</li>
                  ))}
              </ul>
              <button
                onClick={() => removeNode(node.name)}
                className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600 transition-colors"
              >
                {t("removeNode")}
              </button>
            </PopoverPanel>
          </>
        )}
      </Popover>
    );
  });

  const KeyPopover = React.memo(({ keyData }) => {
    const { x, y } = getNodePosition(keyData.position);
    const migratedKey = migratedKeys.find((k) => k.name === keyData.name);
    const keyColor = migratedKey ? getNodeColor(migratedKey.oldNode) : getNodeColor(keyData.assignedNode);
    const newColor = migratedKey ? getNodeColor(migratedKey.newNode) : keyColor;

    return (
      <Popover className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
        <PopoverButton
          className="absolute w-2 h-2 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2"
          style={{
            backgroundColor: keyColor,
            transition: "background-color 1s",
          }}
          onAnimationEnd={() => {
            if (migratedKey) {
              setMigratedKeys((prev) => prev.filter((k) => k.name !== keyData.name));
            }
          }}
        >
          {migratedKey && (
            <div
              className="absolute inset-0 rounded-full"
              style={{
                animation: `colorChange-${keyData.name} 1s forwards`,
              }}
            />
          )}
          <style>{`
            @keyframes colorChange-${keyData.name} {
              from { background-color: ${keyColor}; }
              to { background-color: ${newColor}; }
            }
          `}</style>
        </PopoverButton>
        <PopoverPanel className="absolute w-64 p-4 mt-2 bg-white rounded-md shadow-lg" anchor="bottom">
          <h3 className="font-bold text-lg mb-2">{keyData.name}</h3>
          <p>
            {t("hash")}: {keyData.position}
          </p>
          <p>
            {t("assignedTo")}: {keyData.assignedNode}
          </p>
          {migratedKey && (
            <p className="text-orange-500">
              {t("migratingTo")}: {migratedKey.newNode}
            </p>
          )}
        </PopoverPanel>
      </Popover>
    );
  });

  const NodeSummary = React.memo(() => {
    return (
      <div className="mt-4 w-full overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-4 py-2">{t("node")}</th>
              <th className="px-4 py-2">{t("totalKeys")}</th>
              <th className="px-4 py-2">{t("sampleKeys")}</th>
              <th className="px-4 py-2">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node) => {
              const nodeKeys = getKeysForNode(node.name);
              return (
                <tr key={node.name}>
                  <td className="border px-4 py-2">
                    <span style={{ color: node.color }}>{node.name}</span>
                  </td>
                  <td className="border px-4 py-2">{nodeKeys.length}</td>
                  <td className="border px-4 py-2">
                    {nodeKeys
                      .slice(0, 10)
                      .map((key) => key.name)
                      .join(", ")}
                    {nodeKeys.length > 10 ? "..." : ""}
                  </td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => removeNode(node.name)}
                      disabled={nodes.length <= 1}
                      className={`px-2 py-1 rounded text-sm ${
                        nodes.length > 1
                          ? "bg-red-500 text-white hover:bg-red-600"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {t("remove")}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  });

  const ControlPanel = React.memo(() => {
    return (
      <div className="lg:w-1/4 p-4 bg-white shadow-lg">
        <h2 className="text-2xl font-bold mb-4">{t("settings")}</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="nodeCount" className="block mb-2">
              {t("numberOfNodes")}:
            </label>
            <input
              id="nodeCount"
              type="number"
              value={nodeCount}
              onChange={(e) => setNodeCount(parseInt(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label htmlFor="virtualNodeCount" className="block mb-2">
              {t("virtualNodesPerNode")}:
            </label>
            <input
              id="virtualNodeCount"
              type="number"
              min="0"
              max="1000"
              value={virtualNodeCount}
              onChange={(e) => setVirtualNodeCount(Math.min(Math.max(parseInt(e.target.value), 0), 1000))}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block mb-2">{t("totalKeys_count", { count: keys ? keys.length : 0 })}</label>
          </div>
          <div>
            <label className="block mb-2">{t("samplingRate", { rate: getAutoSamplingRate(keys.length) })}</label>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <button
            onClick={initializeRing}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            {t("initializeRing")}
          </button>
          <button
            onClick={resetAll}
            className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            {t("reset")}
          </button>
          <button
            onClick={addNode}
            className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            {t("addNode")}
          </button>
          <button
            onClick={() => addKeys(100)}
            className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
          >
            {t("add100Keys")}
          </button>
          <button
            onClick={() => addKeys(1000)}
            className="w-full bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 transition-colors"
          >
            {t("add1000Keys")}
          </button>
        </div>
        {notification && (
          <div className="mt-4 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">{notification}</div>
        )}
      </div>
    );
  });

  // Main render
  return (
    <div className="flex flex-col lg:flex-row font-sans">
      <div className="lg:w-3/4 p-4 flex flex-col items-center justify-center bg-gray-100">
        <div className="relative w-full max-w-[700px] aspect-square">
          <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
          {virtualNodeCount === 0 && nodes.map((node) => <NodeCircle key={node.name} node={node} />)}
          {keys
            .filter((_, index) => index % Math.round(1 / getAutoSamplingRate(keys.length)) === 0)
            .map((key) => (
              <KeyPopover key={key.name} keyData={key} />
            ))}
        </div>
        {virtualNodeCount > 0 && <NodeSummary />}
      </div>
      <ControlPanel />
    </div>
  );
};

export default ConsistentHashRing;
