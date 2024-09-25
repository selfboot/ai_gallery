"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useI18n } from "@/app/i18n/client";

const BloomFilterDemo = () => {
  const [n, setN] = useState(200);
  const [k, setK] = useState(6);
  const [m, setM] = useState(600);
  const [filter, setFilter] = useState(() => new Uint32Array(Math.ceil(600 / 32)));
  const [inputKey, setInputKey] = useState("");
  const [keyList, setKeyList] = useState([]);
  const gridRef = useRef(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [cols, setCols] = useState(0);
  const [searchResult, setSearchResult] = useState(null);
  const [keyPositions, setKeyPositions] = useState({});
  const { t } = useI18n();
  const CELL_SIZE = 20;

  useEffect(() => {
    const updateGridWidth = () => {
      if (gridRef.current) {
        const width = gridRef.current.offsetWidth;
        setGridWidth(width);
      }
    };

    updateGridWidth();
    window.addEventListener("resize", updateGridWidth);
    return () => window.removeEventListener("resize", updateGridWidth);
  }, []);

  useEffect(() => {
    if (gridWidth > 0) {
      setCols(Math.floor(gridWidth / CELL_SIZE) - 1);
    }
  }, [gridWidth]);

  useEffect(() => {
    resetFilter();
  }, [n, k]);

  const resetFilter = useCallback(() => {
    const newM = n * k;
    setM(newM);
    setFilter(new Uint32Array(Math.ceil(newM / 32)));
    setKeyList([]);
    setKeyPositions({});
    setSearchResult(null);
    setInputKey("");
  }, [n, k]);

  const decodeFixed32 = (data, offset) => {
    return (
      (data.charCodeAt(offset) |
        (data.charCodeAt(offset + 1) << 8) |
        (data.charCodeAt(offset + 2) << 16) |
        (data.charCodeAt(offset + 3) << 24)) >>>
      0
    );
  };

  const hash = (data, seed) => {
    const m = 0xc6a4a793;
    const r = 24;
    let h = seed ^ (data.length * m);
    let offset = 0;

    while (offset + 4 <= data.length) {
      let w = decodeFixed32(data, offset);
      offset += 4;
      h += w;
      h = (h * m) >>> 0;
      h ^= h >>> 16;
    }

    switch (data.length - offset) {
      case 3:
        h += data.charCodeAt(offset + 2) << 16;
      case 2:
        h += data.charCodeAt(offset + 1) << 8;
      case 1:
        h += data.charCodeAt(offset);
        h = (h * m) >>> 0;
        h ^= h >>> r;
        break;
    }

    return h >>> 0;
  };

  const addKeyPosition = useCallback((key, positions) => {
    setKeyPositions((prev) => {
      const newPositions = { ...prev };
      positions.forEach((pos) => {
        if (!newPositions[pos]) {
          newPositions[pos] = new Set();
        }
        newPositions[pos].add(key);
      });
      return newPositions;
    });
  }, []);

  const add = useCallback(
    (key, currentFilter) => {
      const newFilter = new Uint32Array(currentFilter);
      const positions = [];
      for (let i = 0; i < k; i++) {
        const h = hash(key, i);
        const bitpos = h % m;
        positions.push(bitpos);
        newFilter[Math.floor(bitpos / 32)] |= 1 << bitpos % 32;
      }
      addKeyPosition(key, positions);
      return newFilter;
    },
    [hash, k, m, addKeyPosition]
  );

  const addSingle = useCallback(
    (key) => {
      if (key.trim() === "") {
        return;
      }
      const newFilter = add(key, filter);
      setFilter(newFilter);
      setKeyList((prevList) => [...prevList, key]);
      setInputKey("");
    },
    [add, filter]
  );

  const addMultipleKeys = useCallback(
    (count) => {
      let newFilter = new Uint32Array(filter);
      const addedKeys = [];
      for (let i = 0; i < count; i++) {
        const key = Math.random().toString(36).substring(2, 8);
        newFilter = add(key, newFilter);
        addedKeys.push(key);
      }
      setFilter(newFilter);
      setKeyList((prevList) => [...prevList, ...addedKeys]);
    },
    [add, filter]
  );

  const check = useCallback(
    (key) => {
      if (key.trim() === "") {
        setSearchResult(null);
        return false;
      }
      const positions = [];
      for (let i = 0; i < k; i++) {
        const h = hash(key, i);
        const bitpos = h % m;
        positions.push(bitpos);
        if ((filter[Math.floor(bitpos / 32)] & (1 << bitpos % 32)) === 0) {
          setSearchResult({ key, exists: false, positions });
          return false;
        }
      }
      setSearchResult({ key, exists: true, positions });
      return true;
    },
    [hash, k, m, filter]
  );

  const filterBits = useMemo(() => {
    const bits = new Array(m);
    for (let i = 0; i < m; i++) {
      bits[i] = (filter[Math.floor(i / 32)] & (1 << i % 32)) !== 0;
    }
    return bits;
  }, [filter, m]);

  const Cell = React.memo(({ index, isSet }) => (
    <Popover key={index} className="relative">
      <PopoverButton
        className={`border border-gray-300 flex items-center justify-center w-full h-full ${
          isSet ? "bg-green-500" : "bg-white"
        } ${
          searchResult && searchResult.positions.includes(index)
            ? searchResult.exists
              ? "ring-2 ring-blue-500 ring-inset"
              : "ring-2 ring-red-500 ring-inset"
            : ""
        }`}
        style={{
          width: `${CELL_SIZE}px`,
          height: `${CELL_SIZE}px`,
        }}
      >
        {searchResult && searchResult.positions.includes(index) && (
          <span className="text-xs font-bold">{searchResult.positions.indexOf(index) + 1}</span>
        )}
      </PopoverButton>
      {keyPositions[index] && keyPositions[index].size > 0 && (
        <PopoverPanel className="z-10 w-48 p-2 mt-1 bg-white rounded-md shadow-lg" anchor="bottom">
          <div className="text-sm font-bold mb-1">{t("keysAtPosition", { index })}</div>
          <ul className="text-xs max-h-32 overflow-y-auto">
            {Array.from(keyPositions[index]).map((key) => (
              <li key={key} className="mb-1">
                {key}
              </li>
            ))}
          </ul>
        </PopoverPanel>
      )}
    </Popover>
  ));

  const Grid = useMemo(() => {
    return filterBits.map((isSet, index) => <Cell key={index} index={index} isSet={isSet} />);
  }, [filterBits, searchResult, keyPositions]);

  return (
    <div className="pt-4 max-w-full mx-auto">
      <div className="flex flex-col lg:flex-row">
        <div className="lg:w-3/4 lg:pr-4">
          {searchResult && (
            <div className="p-4">
              <p className="font-bold">
                "{searchResult.key}" {searchResult.exists ? t("mayExist") : t("definitelyNotExist")}
              </p>
            </div>
          )}
          <div ref={gridRef} className="bg-gray-100 p-2 rounded overflow-auto">
            {cols > 0 && (
              <div
                className="grid gap-0 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
                  width: `${cols * CELL_SIZE}px`,
                }}
              >
                {Grid}
              </div>
            )}
          </div>
        </div>
        <div className="lg:w-1/4 mt-4 lg:mt-0">
          <div className="bg-gray-100 p-4 rounded">
            <h2 className="text-lg font-bold mb-2">{t("settings")}</h2>
            <div className="mb-4">
              <label className="block mb-2">
                {t("predictedKeyCount")}:
                <input
                  type="number"
                  value={n}
                  onChange={(e) => setN(Math.min(Math.max(1, parseInt(e.target.value) || 1), 500))}
                  min="1"
                  max="500"
                  className="w-full border rounded px-2 py-1"
                />
              </label>
              <label className="block mb-2">
                {t("hashFunctionCount")}:
                <input
                  type="number"
                  value={k}
                  onChange={(e) => {
                    const newK = Math.min(Math.max(1, parseInt(e.target.value) || 1), 30);
                    setK(newK);
                  }}
                  min="1"
                  max="30"
                  className="w-full border rounded px-2 py-1"
                />
              </label>
            </div>
            <div className="mb-4">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={t("enterKey")}
                className="w-full border rounded px-2 py-1 mb-2"
              />
              <button
                onClick={() => addSingle(inputKey)}
                className="w-full mb-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                {t("add")}
              </button>
              <button
                onClick={() => check(inputKey)}
                className="w-full mb-2 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                {t("check")}
              </button>
              <button
                onClick={() => addMultipleKeys(10)}
                className="w-full mb-2 bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
              >
                {t("add10RandomKeys")}
              </button>
              <button
                onClick={() => addMultipleKeys(100)}
                className="w-full mb-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                {t("add100RandomKeys")}
              </button>
              <button
                onClick={resetFilter}
                className="w-full bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
              >
                {t("reset")}
              </button>
            </div>
            <div className="mb-4">
              <p>{t("bitArraySize", { m })}</p>
              <p>{t("bitsPerKey", { k })}</p>
              <p className="font-bold">{t("currentKeyCount", { count: keyList.length })}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BloomFilterDemo;
