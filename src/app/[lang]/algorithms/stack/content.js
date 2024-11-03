"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/app/i18n/client";

class Stack {
  constructor(maxSize = 10) {
    this.items = [];
    this.maxSize = maxSize;
  }

  push(element) {
    if (this.items.length >= this.maxSize) {
      throw new Error("Stack is full");
    }
    this.items.push(element);
    return element;
  }

  pop() {
    if (this.isEmpty()) {
      throw new Error("Stack is empty");
    }
    return this.items.pop();
  }

  isEmpty() {
    return this.items.length === 0;
  }

  isFull() {
    return this.items.length === this.maxSize;
  }

  getItems() {
    return [...this.items];
  }

  setMaxSize(newSize) {
    if (newSize < this.items.length) {
      throw new Error("New size is smaller than current stack size");
    }
    this.maxSize = newSize;
  }
}

const StackVisualization = () => {
  const [stack, setStack] = useState(new Stack(10));
  const [items, setItems] = useState([]);
  const [poppedItems, setPoppedItems] = useState([]);
  const [pushedItems, setPushedItems] = useState([]);
  const [nextNumber, setNextNumber] = useState(0);
  const [message, setMessage] = useState("");
  const [animatingItem, setAnimatingItem] = useState(null);
  const [stackHeight, setStackHeight] = useState(10);
  const nextItemRef = useRef(null);
  const stackRef = useRef(null);
  const { t } = useI18n();

  useEffect(() => {
    generateNextNumber();
  }, []);

  const updateStack = () => {
    setItems(stack.getItems());
  };

  const generateNextNumber = () => {
    setNextNumber(Math.floor(Math.random() * 100));
  };

  const push = () => {
    if (stack.isFull()) {
      setMessage({ key: "stackFull" });
      return;
    }
    const newItem = nextNumber;
    const nextItemRect = nextItemRef.current.getBoundingClientRect();
    const stackRect = stackRef.current.getBoundingClientRect();
    const startX = nextItemRect.left - stackRect.left + nextItemRect.width / 2;
    const startY = nextItemRect.top - stackRect.top;
    const endX = stackRect.width / 2;
    const endY = stackRect.height - (items.length + 1) * 50;

    setAnimatingItem({ value: newItem, startX, startY, endX, endY });

    setTimeout(() => {
      stack.push(newItem);
      updateStack();
      setAnimatingItem(null);
      setMessage({ key: "pushed", params: { item: newItem } });
      setPushedItems((prev) => [...prev, newItem]);
      generateNextNumber();
    }, 500);
  };

  const pop = () => {
    console.log(stack.isEmpty(), stack);
    if (stack.isEmpty()) {
      setMessage({ key: "stackEmpty" });
      return;
    }
    const poppedItem = stack.pop();
    updateStack();
    setMessage({ key: "popped", params: { item: poppedItem } });
    setPoppedItems((prev) => [...prev, poppedItem]);
  };

  const reset = () => {
    setItems([]);
    setStack(new Stack(stackHeight));
    setPoppedItems([]);
    setPushedItems([]);
    setMessage({ key: "stackReset" });
    generateNextNumber();
    setAnimatingItem(null);
  };

  const handleHeightChange = (e) => {
    const newHeight = parseInt(e.target.value, 10);
    if (newHeight >= items.length) {
      setStackHeight(newHeight);
      const newStack = new Stack(newHeight);
      items.forEach((item) => newStack.push(item));
      setStack(newStack);
      setMessage({ key: "stackHeightAdjusted", params: { height: newHeight } });
    } else {
      setMessage({ key: "invalidNewHeight" });
    }
  };

  useEffect(() => {
    const keyframes = animatingItem
      ? `
      @keyframes dropAnimation {
        0% {
          transform: translate(${animatingItem.startX}px, ${animatingItem.startY}px);
        }
        100% {
          transform: translate(${animatingItem.endX}px, ${animatingItem.endY}px);
        }
      }
    `
      : "";

    const styleElement = document.createElement("style");
    styleElement.innerHTML = keyframes;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, [animatingItem]);

  return (
    <div className="flex flex-col lg:flex-row w-full">
      <div className="w-full lg:w-4/5 mb-6 lg:mb-0 lg:pr-6 flex flex-col items-center">
        <div className="flex flex-col items-center lg:w-2/3">
          <div className="flex items-center justify-center mb-9">
            <div className="flex items-center mr-2 h-12 font-bold">
              {t("nextElement")}
            </div>
            <div
              ref={nextItemRef}
              className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center font-bold"
            >
              {nextNumber}
            </div>
          </div>

          {/* Stack and History Container */}
          <div className="flex flex-col lg:flex-row w-full gap-6">
            <div className="flex items-start">
              <div
                className="flex flex-col justify-between mr-2"
                style={{ height: `${stackHeight * 50}px`, minHeight: "50px" }}
              >
                <div className="flex-grow">
                  {items.length > 0 && (
                    <div
                      className="bg-red-500 text-white px-2 py-1 text-sm rounded-l mb-1 transition-all duration-300"
                      style={{
                        marginTop: `${(stackHeight - items.length) * 50}px`,
                      }}
                    >
                      {t("stackTop")}
                    </div>
                  )}
                </div>
                <div className="bg-blue-500 text-white px-2 py-1 text-sm rounded-l">
                  {t("stackBottom")}
                </div>
              </div>
              <div
                ref={stackRef}
                className="w-60 rounded-2xl overflow-hidden relative mb-9"
                style={{
                  display: "grid",
                  gridTemplateRows: `repeat(${stackHeight}, 50px)`,
                  height: `${stackHeight * 50}px`,
                  borderLeft: "4px solid #3b82f6",
                  borderRight: "4px solid #3b82f6",
                  borderBottom: "4px solid #3b82f6",
                  borderRadius: "0 0 20px 20px",
                }}
              >
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid place-items-center w-full p-3 bg-white border-2 border-blue-300 text-center text-lg font-semibold transition-all duration-500"
                    style={{ gridRowStart: stackHeight - index }}
                  >
                    {item}
                  </div>
                ))}
                {animatingItem && (
                  <div
                    className="absolute w-12 h-12 bg-yellow-300 rounded-full flex items-center justify-center text-lg font-semibold"
                    style={{
                      animation: "dropAnimation 0.5s forwards",
                    }}
                  >
                    {animatingItem.value}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col lg:flex-1 gap-6">
              {pushedItems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-center lg:text-left">{t("pushedElements")}</h3>
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                    {pushedItems.map((item, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center font-bold text-sm"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {poppedItems.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-center lg:text-left">{t("poppedElements")}</h3>
                  <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                    {poppedItems.map((item, index) => (
                      <div
                        key={index}
                        className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center font-bold text-sm"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-lg font-medium text-gray-700 text-center mt-6">
            {message.key ? t(message.key, message.params) : t(message)}
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/5">
        <h2 className="text-xl font-bold mb-4">{t("settings")}</h2>
        <div className="flex flex-col space-y-4">
          <label htmlFor="stackHeight" className="font-medium">
            {t("stackHeight")}:
          </label>
          <input
            id="stackHeight"
            type="number"
            min={items.length}
            value={stackHeight}
            onChange={handleHeightChange}
            className="w-full px-2 py-1 border border-gray-300 rounded"
          />
        </div>
        <div className="flex flex-col mt-4 space-y-4">
          <button
            onClick={push}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-300"
            disabled={animatingItem}
          >
            {t("push")}
          </button>
          <button
            onClick={pop}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-300"
            disabled={animatingItem}
          >
            {t("pop")}
          </button>
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition duration-300"
          >
            {t("reset")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StackVisualization;
