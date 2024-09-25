"use client";

import React, { useState, useCallback, useRef } from "react";
import { Plus, X, Play, FastForward, Pause, RefreshCw, ArrowRight } from "lucide-react";
import { useI18n } from "@/app/i18n/client";

const CoinVisual = React.memo(({ value, isHighlighted, onDelete, showDelete = false, isSmall = false }) => {
  const { t } = useI18n();
  const size = isSmall ? "w-6 h-6" : "w-12 h-12";
  const fontSize = isSmall ? "text-xxs" : "text-xs";
  return (
    <div className={`relative inline-block mr-1 mb-1`}>
      <div
        className={`flex items-center justify-center ${size} rounded-full text-white ${fontSize} font-bold transition-all duration-300`}
        style={{
          background: isHighlighted
            ? `radial-gradient(circle at 35% 35%, #FF4136, #85144b)`
            : `radial-gradient(circle at 35% 35%, #FFD700, #DAA520)`,
          border: isHighlighted ? "2px solid #FF4136" : "2px solid #B8860B",
          boxShadow: "inset 0 0 10px rgba(0,0,0,0.3), 0 0 5px rgba(0,0,0,0.3)",
          textShadow: "0 1px 1px rgba(0,0,0,0.5)",
        }}
      >
        {value}
      </div>
      {showDelete && (
        <button
          onClick={() => onDelete(value)}
          className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-xxs hover:bg-red-600 focus:outline-none"
          aria-label={t("removeCoin")}
        >
          <X size={8} />
        </button>
      )}
    </div>
  );
});

const TransitionStep = React.memo(({ transition, isBest }) => (
  <div className={`flex items-center p-1 rounded ${isBest ? "bg-green-100 border border-green-300" : ""}`}>
    <span className="mr-1">{transition.prevAmount}</span>
    <Plus size={12} className="mx-1" />
    <CoinVisual value={transition.coin} isSmall={true} />
    <ArrowRight size={12} className="mx-1" />
    <span className={`font-bold ${isBest ? "text-green-600" : ""}`}>{transition.numCoins}</span>
  </div>
));

const DPCoin = () => {
  const [amount, setAmount] = useState(11);
  const [coins, setCoins] = useState([1, 2, 5]);
  const [newCoin, setNewCoin] = useState("");
  const [dpTable, setDpTable] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [highlightedCoins, setHighlightedCoins] = useState({});

  const abortControllerRef = useRef(null);
  const dpStateRef = useRef(null);
  const { t } = useI18n();

  const calculateStep = useCallback(
    (i, dp, coinUsed) => {
      let bestCoin = null;
      let minCoins = Infinity;
      const allTransitions = coins.reduce((acc, coin) => {
        if (coin <= i) {
          const numCoins = dp[i - coin] + 1;
          if (numCoins < minCoins) {
            minCoins = numCoins;
            bestCoin = coin;
          }
          acc.push({ coin, numCoins, prevAmount: i - coin, isBest: false });
        }
        return acc;
      }, []);

      dp[i] = minCoins;
      coinUsed[i] = bestCoin ? [...coinUsed[i - bestCoin], bestCoin] : [];

      return {
        amount: i,
        coins: minCoins,
        combination: coinUsed[i],
        allTransitions: allTransitions.map((t) => ({ ...t, isBest: t.coin === bestCoin })),
      };
    },
    [coins]
  );

  const calculateCoinChange = useCallback(
    async (mode = "step", startFrom = 1) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setIsCalculating(true);
      let dp, coinUsed, newDpTable;

      if (startFrom === 1 || !dpStateRef.current) {
        dp = new Array(amount + 1).fill(Infinity);
        coinUsed = new Array(amount + 1).fill([]);
        dp[0] = 0;
        coinUsed[0] = [];
        newDpTable = [];
      } else {
        ({ dp, coinUsed, newDpTable } = dpStateRef.current);
      }

      try {
        for (let i = Math.max(1, startFrom); i <= amount; i++) {
          if (signal.aborted) break;

          const step = calculateStep(i, dp, coinUsed);
          newDpTable[i - 1] = step;

          setDpTable([...newDpTable]);
          setCurrentStep(i);
          dpStateRef.current = { dp, coinUsed, newDpTable };

          if (mode === "step") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      } finally {
        setIsCalculating(false);
      }
    },
    [amount, calculateStep]
  );

  const handleStepCalculation = useCallback(() => {
    if (isCalculating) {
      abortControllerRef.current?.abort();
      setIsCalculating(false);
    } else {
      const startFrom = currentStep < amount ? currentStep + 1 : 1;
      calculateCoinChange("step", startFrom);
    }
  }, [isCalculating, currentStep, amount, calculateCoinChange]);

  const handleFastCalculation = useCallback(() => {
    if (isCalculating) {
      abortControllerRef.current?.abort();
    }
    calculateCoinChange("fast");
  }, [isCalculating, calculateCoinChange]);

  const handleReset = useCallback(() => {
    abortControllerRef.current?.abort();
    setDpTable([]);
    setCurrentStep(0);
    setIsCalculating(false);
    dpStateRef.current = null;
  }, []);

  const addCoin = useCallback(() => {
    const coinValue = parseInt(newCoin);
    if (coinValue && !coins.includes(coinValue)) {
      setCoins((prev) => [...prev, coinValue].sort((a, b) => a - b));
      setNewCoin("");
    } else if (coins.includes(coinValue)) {
      setHighlightedCoins((prev) => ({ ...prev, [coinValue]: true }));
      setTimeout(() => setHighlightedCoins((prev) => ({ ...prev, [coinValue]: false })), 2000);
    }
  }, [newCoin, coins]);

  const removeCoin = useCallback((coin) => {
    setCoins((prev) => prev.filter((c) => c !== coin));
  }, []);

  return (
    <div className="pt-4 md:flex flex-row-reverse">
      {/* Settings Panel */}
      <div className="md:w-1/5 md:pl-4 mb-4 md:mb-0">
        <h2 className="text-2xl font-bold mb-4">{t("settings")}</h2>
        <div className="mb-4">
          <label className="block mb-2">{t("targetAmount")}:</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className="border rounded px-2 py-1 w-full"
            min="1"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">{t("addCoinDenomination")}:</label>
          <div className="flex">
            <input
              type="number"
              value={newCoin}
              onChange={(e) => setNewCoin(e.target.value)}
              className="border rounded-l px-2 py-1 w-full"
              min="1"
            />
            <button onClick={addCoin} className="px-4 py-2 bg-green-500 text-white rounded-r flex items-center">
              <Plus size={18} />
            </button>
          </div>
        </div>
        <div className="mb-4">
          <label className="block mb-2">{t("currentCoinDenominations")}:</label>
          <div className="flex flex-wrap">
            {coins.map((coin) => (
              <CoinVisual
                key={coin}
                value={coin}
                onDelete={removeCoin}
                showDelete={true}
                isHighlighted={highlightedCoins[coin]}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col space-y-4 mb-4">
          <button
            onClick={handleStepCalculation}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            <div className="flex items-center justify-start">
              <div className="w-8">{isCalculating ? <Pause size={18} /> : <Play size={18} />}</div>
              <span>{isCalculating ? t("pause") : t("stepByStep")}</span>
            </div>
          </button>
          <button
            onClick={handleFastCalculation}
            className="w-full px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            <div className="flex items-center justify-start">
              <div className="w-8">
                <FastForward size={18} />
              </div>
              <span>{t("quickComplete")}</span>
            </div>
          </button>
          <button
            onClick={handleReset}
            className="w-full px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            <div className="flex items-center justify-start">
              <div className="w-8">
                <RefreshCw size={18} />
              </div>
              <span>{t("reset")}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="md:w-4/5 md:pr-4">
        <h2 className="text-2xl font-bold mb-4">{t("calculationResults", { coins: currentStep })}</h2>
        <div className="overflow-x-auto mt-4">
          <table className="w-full border">
            <thead>
              <tr>
                <th className="border px-4 py-2">{t("amount")}</th>
                <th className="border px-4 py-2">{t("minCoins")}</th>
                <th className="border px-4 py-2">{t("optimalCombination")}</th>
                <th className="border px-4 py-2">{t("stateTransitionProcess")}</th>
              </tr>
            </thead>
            <tbody>
              {dpTable.map((row) => (
                <tr key={row.amount} className={row.amount === currentStep ? "bg-yellow-100" : ""}>
                  <td className="border px-4 py-2">{row.amount}</td>
                  <td className="border px-4 py-2">{row.coins === Infinity ? "∞" : row.coins}</td>
                  <td className="border px-4 py-2">
                    <div className="flex flex-wrap">
                      {row.combination.map((coin, index) => (
                        <CoinVisual key={index} value={coin} isSmall={true} />
                      ))}
                    </div>
                  </td>
                  <td className="border px-4 py-2">
                    <div className="flex flex-wrap gap-2">
                      {row.allTransitions.map((transition, index) => (
                        <TransitionStep key={index} transition={transition} isBest={transition.isBest} />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DPCoin;
