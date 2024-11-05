'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useI18n } from '@/app/i18n/client';

// MurmurHash3 implementation
function murmurhash3_32_gc(key, seed = 0) {
  let remainder, bytes, h1, h1b, c1, c2, k1, i;

  remainder = key.length & 3; // key.length % 4
  bytes = key.length - remainder;
  h1 = seed;
  c1 = 0xcc9e2d51;
  c2 = 0x1b873593;
  i = 0;

  while (i < bytes) {
    k1 =
      (key.charCodeAt(i) & 0xff) |
      ((key.charCodeAt(++i) & 0xff) << 8) |
      ((key.charCodeAt(++i) & 0xff) << 16) |
      ((key.charCodeAt(++i) & 0xff) << 24);
    ++i;

    k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    h1b = ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
    h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
    case 2:
      k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
    case 1:
      k1 ^= key.charCodeAt(i) & 0xff;
      k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
  }

  h1 ^= key.length;
  h1 ^= h1 >>> 16;
  h1 = ((h1 & 0xffff) * 0x85ebca6b + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 13;
  h1 = ((h1 & 0xffff) * 0xc2b2ae35 + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

function simpleHash(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function djb2Hash(key) {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) + hash + key.charCodeAt(i);
  }
  return Math.abs(hash);
}

const DEFAULT_HASH_FUNCTION = 'murmur3';
const DEFAULT_ADD_MODE = 'random';
const DEFAULT_CELL_SIZE = 50;

const HASH_FUNCTIONS = {
  murmur3: murmurhash3_32_gc,
  simple: simpleHash,
  djb2: djb2Hash,
};

const MAX_BUCKET_SIZE = 1000;

const HashTable = () => {
  const [bucketSize, setBucketSize] = useState(0);
  const [table, setTable] = useState([]);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [itemCount, setItemCount] = useState(0);
  const [searchSteps, setSearchSteps] = useState(null);
  const [cellSize, setCellSize] = useState(DEFAULT_CELL_SIZE);
  const gridRef = useRef(null);
  const [highlightedBucket, setHighlightedBucket] = useState(null);
  const [selectedHashFunction, setSelectedHashFunction] = useState(DEFAULT_HASH_FUNCTION);
  const [addMode, setAddMode] = useState(DEFAULT_ADD_MODE); // "random" or "sequential"
  const [deleteKey, setDeleteKey] = useState('');
  const { t } = useI18n();
  const isValidInsert = key.trim() !== '' && value.trim() !== '';
  const [isInitialized, setIsInitialized] = useState(false);

  const hash = useCallback(
    (key) => {
      return HASH_FUNCTIONS[selectedHashFunction](key) % bucketSize;
    },
    [bucketSize, selectedHashFunction]
  );

  const resetHashTable = useCallback(() => {
    setTable(
      Array(bucketSize)
        .fill()
        .map(() => [])
    );
    setKey('');
    setValue('');
    setSearchKey('');
    setMessage('');
    setMessageType('');
    setItemCount(0);
    setSearchSteps(null);
    setHighlightedBucket(null);
    setSelectedHashFunction(DEFAULT_HASH_FUNCTION);
    setAddMode(DEFAULT_ADD_MODE);
  }, [bucketSize]);

  const insert = useCallback(
    (key, value) => {
      const index = hash(key);
      setTable((prevTable) => {
        const newTable = [...prevTable];
        const existingItemIndex = newTable[index].findIndex((item) => item.key === key);

        if (existingItemIndex !== -1) {
          newTable[index][existingItemIndex] = { key, value };
        } else {
          newTable[index].push({ key, value });
          setItemCount((prev) => prev + 1);
        }

        return newTable;
      });
      return index;
    },
    [hash]
  );

  const search = useCallback(
    (searchKey) => {
      const index = hash(searchKey);
      let steps = 1;

      for (let i = 0; i < table[index].length; i++) {
        steps++;
        if (table[index][i].key === searchKey) {
          setSearchSteps({ index, steps, found: true });
          setHighlightedBucket(index);
          return { value: table[index][i].value, index };
        }
      }

      setSearchSteps({ index, steps, found: false });
      setHighlightedBucket(index);
      return { value: null, index };
    },
    [hash, table]
  );

  const deleteItem = useCallback(() => {
    const index = hash(deleteKey);
    let deleted = false;
    setSearchSteps(null);
    setTable((prevTable) => {
      const newTable = [...prevTable];
      const bucketIndex = newTable[index].findIndex((item) => item.key === deleteKey);
      if (bucketIndex !== -1) {
        newTable[index].splice(bucketIndex, 1);
        setItemCount((prev) => prev - 1);
        deleted = true;
      }
      return newTable;
    });

    if (deleted) {
      setMessage(t('deletedKey', { key: deleteKey }));
      setMessageType('success');
    } else {
      setMessage(t('keyNotFoundForDelete', { key: deleteKey }));
      setMessageType('error');
    }
    setHighlightedBucket(index);
    setDeleteKey('');
  }, [deleteKey, hash, setTable, setItemCount, setMessage, setMessageType, setHighlightedBucket, t]);

  const generateRandomData = useCallback(
    (count) => {
      const keys = new Set();

      for (let i = 0; i < count; i++) {
        let key;
        if (addMode === 'random') {
          do {
            key = Math.random().toString(36).slice(2, 8);
          } while (keys.has(key));
        } else {
          key = `key${itemCount + i}`;
        }

        keys.add(key);
        const value = Math.floor(Math.random() * 1000);
        insert(key, value.toString());
      }
    },
    [insert, addMode, itemCount]
  );

  const changeBucketSize = useCallback(
    (newSize) => {
      const validSize = Math.min(Math.max(1, newSize), MAX_BUCKET_SIZE);

      setBucketSize(validSize);
      const newTable = Array(validSize)
        .fill()
        .map(() => []);

      // Rehash all existing items
      table.forEach((bucket) => {
        bucket.forEach((item) => {
          const newIndex = HASH_FUNCTIONS[selectedHashFunction](item.key) % validSize;
          newTable[newIndex].push(item);
        });
      });

      setTable(newTable);
    },
    [table, selectedHashFunction]
  );

  const changeHashFunction = useCallback(
    (newHashFunction) => {
      setSelectedHashFunction(newHashFunction);
      const newTable = Array(bucketSize)
        .fill()
        .map(() => []);

      // Rehash all existing items
      table.forEach((bucket) => {
        bucket.forEach((item) => {
          const newIndex = HASH_FUNCTIONS[newHashFunction](item.key) % bucketSize;
          newTable[newIndex].push(item);
        });
      });

      setTable(newTable);
    },
    [bucketSize, table]
  );

  useEffect(() => {
    if (!isInitialized && gridRef.current) {
      const GRID_GAP = 4;
      const CELL_WITH_GAP = DEFAULT_CELL_SIZE + GRID_GAP;

      const containerWidth = gridRef.current.offsetWidth;
      const availableHeight = Math.max(window.innerHeight * 0.6, 200);

      const cellsPerRow = Math.floor(containerWidth / (CELL_WITH_GAP + GRID_GAP));
      const numberOfRows = Math.floor(availableHeight / (CELL_WITH_GAP + GRID_GAP));

      const newBucketSize = cellsPerRow * numberOfRows;
      setBucketSize(newBucketSize);
      setTable(
        Array(newBucketSize)
          .fill()
          .map(() => [])
      );
      setIsInitialized(true);
    }
  }, [isInitialized]);

  useEffect(() => {
    const updateCellSize = () => {
      if (gridRef.current) {
        const gridWidth = gridRef.current.offsetWidth;
        const maxCells = Math.floor(gridWidth / DEFAULT_CELL_SIZE);
        const newCellSize = Math.floor(gridWidth / maxCells);
        setCellSize(newCellSize);
      }
    };

    updateCellSize();
    window.addEventListener('resize', updateCellSize);
    return () => window.removeEventListener('resize', updateCellSize);
  }, []);

  useEffect(() => {
    if (highlightedBucket !== null) {
      const element = document.getElementById(`bucket-${highlightedBucket}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedBucket]);

  const getBucketColor = (itemCount) => {
    if (itemCount === 0) return 'bg-gray-100';
    if (itemCount < 5) return 'bg-green-100';
    if (itemCount < 10) return 'bg-green-200';
    if (itemCount < 15) return 'bg-green-300';
    if (itemCount < 20) return 'bg-green-400';
    if (itemCount < 25) return 'bg-green-500';
    if (itemCount < 30) return 'bg-green-600';
    return 'bg-green-800';
  };

  const BucketDialog = ({ bucket, index, cellSize, highlightedBucket, getBucketColor }) => {
    return (
      <Popover className="relative" id={`bucket-${index}`}>
        {({ open }) => (
          <>
            <PopoverButton
              className={`w-full h-full cursor-pointer p-1 text-xs ${getBucketColor(
                bucket.length
              )} hover:bg-blue-500 hover:text-white transition-colors duration-200 flex items-center justify-center ${
                highlightedBucket === index ? 'ring-2 ring-red-500' : ''
              } border border-gray-300`}
              style={{ width: cellSize, height: cellSize }}
            >
              {index}
            </PopoverButton>

            <PopoverPanel className="absolute z-10 w-64 bg-white shadow-lg rounded-lg p-4" anchor="bottom">
              <h3 className="text-lg font-semibold mb-2">
                {t('bucket')} {index} ({bucket.length} {t('key')})
              </h3>
              <div className="max-h-60 overflow-auto">
                {bucket.map((item, i) => (
                  <div key={i} className="mb-2 p-2 bg-gray-100 rounded">
                    {item.key}: {item.value}
                  </div>
                ))}
              </div>
            </PopoverPanel>
          </>
        )}
      </Popover>
    );
  };

  return (
    <div className="pt-4 max-w-full mx-auto">
      <div className="flex flex-col lg:flex-row">
        {/* Hash Table Visualization (大屏幕左侧，小屏幕下方) */}
        <div className="w-full lg:w-4/5 order-2 lg:order-1 lg:pr-10">
          <div>
            <p className="mb-2">
              {t('totalItems')}: {itemCount}, {t('loadFactor')}: {(itemCount / bucketSize).toFixed(2)}
            </p>

            {message && (
              <div
                className={`p-2 mt-4 mb-4 rounded ${
                  messageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {message}
              </div>
            )}
            {searchSteps && (
              <div className="mt-4 mb-4 p-2 bg-blue-100 text-blue-800 rounded">
                {t('searchCompleted', { steps: searchSteps.steps })}
                {searchSteps.found
                  ? t('keyFoundInBucket', { index: searchSteps.index })
                  : t('keyNotFound', { index: searchSteps.index })}
              </div>
            )}

            <div
              ref={gridRef}
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))`,
                gridAutoRows: `${cellSize}px`,
                width: '100%',
                height: '100%',
                minHeight: '200px',
              }}
            >
              {table.map((bucket, index) => (
                <BucketDialog
                  key={index}
                  bucket={bucket}
                  index={index}
                  cellSize={cellSize}
                  highlightedBucket={highlightedBucket}
                  getBucketColor={getBucketColor}
                />
              ))}
            </div>
          </div>
        </div>

        {/* 控制面板 (大屏幕右侧，小屏幕上方) */}
        <div className="w-full lg:w-1/5 mb-4 mr-4 lg:mb-0 order-1 lg:order-2">
          <h2 className="text-xl font-bold mb-4 mt-4">{t('hashTableVisualization')}</h2>
          <div className="space-y-4">
            <div className="flex items-center">
              <label className="w-1/3 font-medium">{t('bucketSize')}:</label>
              <input
                type="number"
                value={bucketSize}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    changeBucketSize(value);
                  }
                }}
                className="w-2/3 p-2 border rounded"
                min="1"
                max={MAX_BUCKET_SIZE}
              />
            </div>

            <div className="flex items-center">
              <label className="w-1/3 font-medium">{t('hashFunction')}:</label>
              <select
                value={selectedHashFunction}
                onChange={(e) => changeHashFunction(e.target.value)}
                className="w-2/3 p-2 border rounded"
              >
                <option value="murmur3">MurmurHash3</option>
                <option value="simple">{t('simpleHash')}</option>
                <option value="djb2">DJB2 Hash</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="w-1/3 font-medium">{t('addMode')}:</label>
              <select value={addMode} onChange={(e) => setAddMode(e.target.value)} className="w-2/3 p-2 border rounded">
                <option value="random">{t('random')}</option>
                <option value="sequential">{t('sequential')}</option>
              </select>
            </div>

            <div className="flex justify-between">
              {[10, 100, 1000].map((count) => (
                <button
                  key={count}
                  onClick={() => generateRandomData(count)}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 "
                >
                  {t('add')} {count}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const { value, index } = search(searchKey);
                  setMessage(
                    value !== null ? t('found', { key: searchKey, value }) : t('notFound', { key: searchKey })
                  );
                  setMessageType(value !== null ? 'success' : 'error');
                  setHighlightedBucket(index);
                }}
                className={`w-1/3 px-4 py-2 text-white rounded ${
                  searchKey.trim() !== '' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={searchKey.trim() === ''}
              >
                {t('search')}
              </button>
              <input
                type="text"
                placeholder={t('enterKeyToSearch')}
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                className="w-2/3 p-2 border rounded"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={deleteItem}
                className={`w-1/3 px-4 py-2 text-white rounded ${
                  deleteKey.trim() !== '' ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={deleteKey.trim() === ''}
              >
                {t('delete')}
              </button>
              <input
                type="text"
                placeholder={t('enterKeyToDelete')}
                value={deleteKey}
                onChange={(e) => setDeleteKey(e.target.value)}
                className="w-2/3 p-2 border rounded"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const index = insert(key, value);
                  setMessage(t('inserted', { key, value, index }));
                  setMessageType('success');
                  setHighlightedBucket(index);
                  setKey('');
                  setValue('');
                }}
                className={`w-1/5 py-2 text-white rounded whitespace-nowrap flex-shrink-0 ${
                  isValidInsert ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400 cursor-not-allowed'
                }`}
                disabled={!isValidInsert}
              >
                {t('insert')}
              </button>
              <input
                type="text"
                placeholder={t('key')}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-2/5 p-2 border rounded min-w-0"
              />
              <input
                type="text"
                placeholder={t('value')}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-2/5 p-2 border rounded min-w-0"
              />
            </div>
            <button
              onClick={resetHashTable}
              className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              {t('reset')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HashTable;
