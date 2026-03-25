"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useI18n } from "@/app/i18n/client";

// Pure JS MD5 implementation (replaces Node.js crypto dependency)
function md5Bytes(str) {
  function toUTF8(s) {
    const buf = [];
    for (let i = 0; i < s.length; i++) {
      let c = s.charCodeAt(i);
      if (c < 0x80) buf.push(c);
      else if (c < 0x800) { buf.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
      else if (c < 0xd800 || c >= 0xe000) { buf.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
      else { c = 0x10000 + (((c & 0x3ff) << 10) | (s.charCodeAt(++i) & 0x3ff)); buf.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    }
    return buf;
  }
  function add32(a, b) { return (a + b) & 0xffffffff; }
  function cmn(q, a, b, x, s, t) { a = add32(add32(a, q), add32(x, t)); return add32((a << s) | (a >>> (32 - s)), b); }
  function ff(a, b, c, d, x, s, t) { return cmn((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  const bytes = toUTF8(str);
  const origLen = bytes.length;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLen = origLen * 8;
  bytes.push(bitLen & 0xff, (bitLen >> 8) & 0xff, (bitLen >> 16) & 0xff, (bitLen >> 24) & 0xff, 0, 0, 0, 0);

  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < bytes.length; i += 64) {
    const w = [];
    for (let j = 0; j < 16; j++) w[j] = bytes[i + j * 4] | (bytes[i + j * 4 + 1] << 8) | (bytes[i + j * 4 + 2] << 16) | (bytes[i + j * 4 + 3] << 24);
    let aa = a, bb = b, cc = c, dd = d;
    a=ff(a,b,c,d,w[0],7,0xd76aa478);d=ff(d,a,b,c,w[1],12,0xe8c7b756);c=ff(c,d,a,b,w[2],17,0x242070db);b=ff(b,c,d,a,w[3],22,0xc1bdceee);
    a=ff(a,b,c,d,w[4],7,0xf57c0faf);d=ff(d,a,b,c,w[5],12,0x4787c62a);c=ff(c,d,a,b,w[6],17,0xa8304613);b=ff(b,c,d,a,w[7],22,0xfd469501);
    a=ff(a,b,c,d,w[8],7,0x698098d8);d=ff(d,a,b,c,w[9],12,0x8b44f7af);c=ff(c,d,a,b,w[10],17,0xffff5bb1);b=ff(b,c,d,a,w[11],22,0x895cd7be);
    a=ff(a,b,c,d,w[12],7,0x6b901122);d=ff(d,a,b,c,w[13],12,0xfd987193);c=ff(c,d,a,b,w[14],17,0xa679438e);b=ff(b,c,d,a,w[15],22,0x49b40821);
    a=gg(a,b,c,d,w[1],5,0xf61e2562);d=gg(d,a,b,c,w[6],9,0xc040b340);c=gg(c,d,a,b,w[11],14,0x265e5a51);b=gg(b,c,d,a,w[0],20,0xe9b6c7aa);
    a=gg(a,b,c,d,w[5],5,0xd62f105d);d=gg(d,a,b,c,w[10],9,0x02441453);c=gg(c,d,a,b,w[15],14,0xd8a1e681);b=gg(b,c,d,a,w[4],20,0xe7d3fbc8);
    a=gg(a,b,c,d,w[9],5,0x21e1cde6);d=gg(d,a,b,c,w[14],9,0xc33707d6);c=gg(c,d,a,b,w[3],14,0xf4d50d87);b=gg(b,c,d,a,w[8],20,0x455a14ed);
    a=gg(a,b,c,d,w[13],5,0xa9e3e905);d=gg(d,a,b,c,w[2],9,0xfcefa3f8);c=gg(c,d,a,b,w[7],14,0x676f02d9);b=gg(b,c,d,a,w[12],20,0x8d2a4c8a);
    a=hh(a,b,c,d,w[5],4,0xfffa3942);d=hh(d,a,b,c,w[8],11,0x8771f681);c=hh(c,d,a,b,w[11],16,0x6d9d6122);b=hh(b,c,d,a,w[14],23,0xfde5380c);
    a=hh(a,b,c,d,w[1],4,0xa4beea44);d=hh(d,a,b,c,w[4],11,0x4bdecfa9);c=hh(c,d,a,b,w[7],16,0xf6bb4b60);b=hh(b,c,d,a,w[10],23,0xbebfbc70);
    a=hh(a,b,c,d,w[13],4,0x289b7ec6);d=hh(d,a,b,c,w[0],11,0xeaa127fa);c=hh(c,d,a,b,w[3],16,0xd4ef3085);b=hh(b,c,d,a,w[6],23,0x04881d05);
    a=hh(a,b,c,d,w[9],4,0xd9d4d039);d=hh(d,a,b,c,w[12],11,0xe6db99e5);c=hh(c,d,a,b,w[15],16,0x1fa27cf8);b=hh(b,c,d,a,w[2],23,0xc4ac5665);
    a=ii(a,b,c,d,w[0],6,0xf4292244);d=ii(d,a,b,c,w[7],10,0x432aff97);c=ii(c,d,a,b,w[14],15,0xab9423a7);b=ii(b,c,d,a,w[5],21,0xfc93a039);
    a=ii(a,b,c,d,w[12],6,0x655b59c3);d=ii(d,a,b,c,w[3],10,0x8f0ccc92);c=ii(c,d,a,b,w[10],15,0xffeff47d);b=ii(b,c,d,a,w[1],21,0x85845dd1);
    a=ii(a,b,c,d,w[8],6,0x6fa87e4f);d=ii(d,a,b,c,w[15],10,0xfe2ce6e0);c=ii(c,d,a,b,w[6],15,0xa3014314);b=ii(b,c,d,a,w[13],21,0x4e0811a1);
    a=ii(a,b,c,d,w[4],6,0xf7537e82);d=ii(d,a,b,c,w[11],10,0xbd3af235);c=ii(c,d,a,b,w[2],15,0x2ad7d2bb);b=ii(b,c,d,a,w[9],21,0xeb86d391);
    a = add32(a, aa); b = add32(b, bb); c = add32(c, cc); d = add32(d, dd);
  }
  const result = new Uint8Array(16);
  [a, b, c, d].forEach((v, i) => { result[i*4]=v&0xff; result[i*4+1]=(v>>8)&0xff; result[i*4+2]=(v>>16)&0xff; result[i*4+3]=(v>>24)&0xff; });
  return result;
}

// Utility functions
const createHash = (key) => {
  return md5Bytes(key);
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
