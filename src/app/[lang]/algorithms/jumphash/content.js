"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { PlusCircle, MinusCircle } from "lucide-react";
import { useTransition, animated, useSpring } from "@react-spring/web";
import { useI18n } from "@/app/i18n/client";

const COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#FFA07A",
  "#98D8C8",
  "#F06292",
  "#AED581",
  "#7986CB",
  "#4DB6AC",
  "#FFF176",
];

const INITIAL_BUCKETS = 4;
const INITIAL_KEYS = 100;

const AnimatedBucket = ({ bucket, index, color, migrationInfo, onAnimationComplete }) => {
  const animationRef = useRef(0);
  const animationsToComplete = useRef(0);

  useEffect(() => {
    animationRef.current = 0;
    animationsToComplete.current = migrationInfo ? (migrationInfo.incoming ?? 0) + (migrationInfo.outgoing ?? 0) : 0;
  }, [migrationInfo]);

  const getAnimationConfig = useCallback(() => {
    const itemCount = migrationInfo ? (migrationInfo.incoming ?? 0) + (migrationInfo.outgoing ?? 0) : 0;
    const duration = itemCount === 0 ? 50 : 5000;
    const itemTrail = Math.max(10, duration / (itemCount || 1)); // 避免除以零
    return { trail: itemTrail, duration: 100 };
  }, [migrationInfo]);

  const { trail, duration } = getAnimationConfig();

  const transitions = useTransition(bucket, {
    from: { opacity: 0, transform: "translate3d(0,-40px,0)" },
    enter: { opacity: 1, transform: "translate3d(0,0px,0)" },
    leave: { opacity: 0, transform: "translate3d(0,-40px,0)" },
    trail: trail,
    onRest: () => {
      animationRef.current += 1;
      if (animationRef.current >= animationsToComplete.current && animationsToComplete.current > 0) {
        onAnimationComplete(index);
      }
    },
  });

  const migrationSpring = useSpring({
    opacity: migrationInfo ? 1 : 0,
    transform: migrationInfo ? "scale(1)" : "scale(0.5)",
    config: { duration: duration }, // Quick fade in/out
  });

  return (
    <div className="flex flex-col border rounded overflow-hidden">
      <div
        className="text-center py-1"
        style={{
          backgroundColor: color,
          color: getBrightness(color) > 128 ? "#000" : "#fff",
        }}
      >
        Bucket {index}
      </div>
      <div className="flex-grow p-2">
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(6px, 1fr))`,
            gridAutoRows: "6px",
          }}
        >
          {transitions((style, item, _, index) => (
            <animated.div
              key={index}
              style={{
                ...style,
                backgroundColor: color,
              }}
              className="w-full h-full rounded-full"
            />
          ))}
        </div>
      </div>
      <div className="text-center text-sm py-1 bg-gray-100">
        Keys: {bucket.length}
        <animated.span style={migrationSpring}>
          {migrationInfo && (
            <>
              {migrationInfo.outgoing > 0 && <span className="text-red-500"> (-{migrationInfo.outgoing})</span>}
              {migrationInfo.incoming > 0 && <span className="text-green-500"> (+{migrationInfo.incoming})</span>}
            </>
          )}
        </animated.span>
      </div>
    </div>
  );
};

const JumpHashVisualization = () => {
  const [numBuckets, setNumBuckets] = useState(INITIAL_BUCKETS);
  const [keys, setKeys] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [migrationInfo, setMigrationInfo] = useState(null);
  const [hashFunction, setHashFunction] = useState("jumpHash");
  const completedAnimations = useRef(new Set());
  const totalBuckets = useRef(INITIAL_BUCKETS);
  const { t } = useI18n();

  const handleAnimationComplete = useCallback((bucketIndex) => {
    completedAnimations.current.add(bucketIndex);
    // console.log("Animation complete for bucket", bucketIndex, totalBuckets.current, completedAnimations.current.size);
    if (completedAnimations.current.size === totalBuckets.current) {
      setTimeout(() => {
        // console.log("Animation complete");
        setMigrationInfo(null);
        completedAnimations.current.clear();
      }, 1000);
    }
  }, []);

  const simpleHash = useCallback((key, numBuckets) => {
    return Number(key % BigInt(numBuckets));
  }, []);

  const murmurhash = useCallback((key, numBuckets) => {
    const m = 0x5bd1e995n;
    const r = 24n;
    let h = 0n;
    key = key ^ (key >> 16n);
    key = (key * m) & 0xffffffffn;
    key = key ^ (key >> 24n);
    key = (key * m) & 0xffffffffn;
    h = (h * m) & 0xffffffffn;
    h = (h ^ key) & 0xffffffffn;
    h = h ^ (h >> 13n);
    h = (h * m) & 0xffffffffn;
    h = h ^ (h >> 15n);
    return Number(h % BigInt(numBuckets));
  }, []);

  const jumpHash = useCallback((key, numBuckets) => {
    let b = -1;
    let j = 0;

    while (j < numBuckets) {
      b = j;
      key = key * BigInt("2862933555777941757") + BigInt(1);
      key = key & BigInt("0xFFFFFFFFFFFFFFFF");
      j = Number(((BigInt(b) + BigInt(1)) * BigInt(Math.pow(2, 31))) / ((key >> BigInt(33)) + BigInt(1)));
    }

    return b;
  }, []);

  const getHashFunction = useCallback(
    (funcName) => {
      switch (funcName) {
        case "simpleHash":
          return simpleHash;
        case "murmurhash":
          return murmurhash;
        case "jumpHash":
        default:
          return jumpHash;
      }
    },
    [simpleHash, murmurhash, jumpHash]
  );

  const generateRandomKey = () => {
    const high = BigInt(Math.floor(Math.random() * 0x100000000)) << 32n;
    const low = BigInt(Math.floor(Math.random() * 0x100000000));
    return high | low;
  };

  const addKeys = useCallback(
    (amount) => {
      const addedKeys = Array(amount)
        .fill()
        .map(() => generateRandomKey());
      setKeys((prevKeys) => [...prevKeys, ...addedKeys]);

      const hashFunc = getHashFunction(hashFunction);
      const newMigrationInfo = Array(numBuckets)
        .fill()
        .map(() => ({
          incoming: 0,
          outgoing: 0,
        }));

      addedKeys.forEach((key) => {
        const bucketIndex = hashFunc(key, numBuckets);
        newMigrationInfo[bucketIndex].incoming++;
      });

      setMigrationInfo(newMigrationInfo);
      completedAnimations.current.clear();
      totalBuckets.current = numBuckets;
    },
    [numBuckets, hashFunction, getHashFunction]
  );

  const updateBuckets = useCallback(
    (currentNumBuckets, currentKeys, currentHashFunction) => {
      const hashFunc = getHashFunction(currentHashFunction);
      const newBuckets = Array(currentNumBuckets)
        .fill()
        .map(() => []);
      currentKeys.forEach((key) => {
        const bucketIndex = hashFunc(key, currentNumBuckets);
        newBuckets[bucketIndex].push(key);
      });
      setBuckets(newBuckets);
      completedAnimations.current.clear(); // Reset completed animations when buckets are updated
    },
    [getHashFunction]
  );

  // 初始化函数
  const initialize = useCallback(() => {
    const initialKeys = Array(INITIAL_KEYS)
      .fill()
      .map(() => generateRandomKey());
    setKeys(initialKeys);
    setNumBuckets(INITIAL_BUCKETS);
  }, []);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    updateBuckets(numBuckets, keys, hashFunction);
  }, [keys, numBuckets, hashFunction, updateBuckets]);

  const changeBuckets = useCallback(
    (delta) => {
      const oldNumBuckets = numBuckets;
      const newNumBuckets = Math.max(1, numBuckets + delta);
      const hashFunc = getHashFunction(hashFunction);

      const oldDistribution = keys.map((key) => hashFunc(key, oldNumBuckets));
      const newDistribution = keys.map((key) => hashFunc(key, newNumBuckets));

      const migrations = Array(Math.max(oldNumBuckets, newNumBuckets))
        .fill()
        .map(() => ({
          outgoing: 0,
          incoming: 0,
        }));

      for (let i = 0; i < keys.length; i++) {
        const oldBucket = oldDistribution[i];
        const newBucket = newDistribution[i];
        if (oldBucket !== newBucket) {
          migrations[oldBucket].outgoing++;
          migrations[newBucket].incoming++;
        }
      }

      setNumBuckets(newNumBuckets);
      setMigrationInfo(migrations);
      updateBuckets(newNumBuckets, keys, hashFunction);
      completedAnimations.current.clear();
      totalBuckets.current = newNumBuckets;
    },
    [numBuckets, keys, hashFunction, getHashFunction, updateBuckets]
  );

  const reset = useCallback(() => {
    setHashFunction("jumpHash");
    initialize();
  }, [initialize]);

  const changeHashFunction = useCallback(
    (newHashFunction) => {
      setHashFunction(newHashFunction);
      // console.log("changeHashFunction", newHashFunction, keys.length, numBuckets);
      updateBuckets(numBuckets, keys, newHashFunction);
    },
    [numBuckets, keys, updateBuckets]
  );

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="lg:w-3/4 pt-4 overflow-auto">
        <h2 className="text-2xl font-bold mb-4">{t('hashVisualization')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {buckets.map((bucket, i) => (
            <AnimatedBucket
              key={i}
              bucket={bucket}
              index={i}
              color={COLORS[i % COLORS.length]}
              migrationInfo={migrationInfo ? migrationInfo[i] : null}
              onAnimationComplete={handleAnimationComplete}
            />
          ))}
        </div>
      </div>
      <div className="lg:w-1/4 p-4 bg-gray-100">
        <h2 className="text-xl font-bold mb-4">{t('settings')}</h2>
        <div className="mb-4">
          <label className="block mb-2">{t('hashFunction')}:</label>
          <select
            value={hashFunction}
            onChange={(e) => changeHashFunction(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="jumpHash">{t('jumpHash')}</option>
            <option value="simpleHash">{t('simpleHash')}</option>
            <option value="murmurhash">{t('murmurhash')}</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-2">{t('numberOfBuckets')}: {numBuckets}</label>
          <div className="flex items-center space-x-2">
            <button onClick={() => changeBuckets(-1)} className="p-2 bg-red-500 text-white rounded">
              <MinusCircle size={20} />
            </button>
            <button onClick={() => changeBuckets(1)} className="p-2 bg-green-500 text-white rounded">
              <PlusCircle size={20} />
            </button>
          </div>
        </div>
        <div className="mb-4">
          <label className="block mb-2">{t('totalKeys')}: {keys.length}</label>
          <div className="flex flex-col space-y-2">
            <button onClick={() => addKeys(10)} className="p-2 bg-blue-500 text-white rounded">
              {t('add10Keys')}
            </button>
            <button onClick={() => addKeys(100)} className="p-2 bg-blue-500 text-white rounded">
              {t('add100Keys')}
            </button>
            <button onClick={() => addKeys(1000)} className="p-2 bg-blue-500 text-white rounded">
              {t('add1000Keys')}
            </button>
            <button onClick={reset} className="p-2 bg-yellow-500 text-white rounded">
              {t('reset')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to calculate brightness of a color
function getBrightness(color) {
  const hex = color.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export default JumpHashVisualization;
