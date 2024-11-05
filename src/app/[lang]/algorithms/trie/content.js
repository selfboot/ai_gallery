"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useI18n } from "@/app/i18n/client";

class TrieNode {
  constructor() {
    this.children = {};
    this.isEndOfWord = false;
    this.highlighted = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insertSync(word) {
    let node = this.root;
    for (let char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
    }
    node.isEndOfWord = true;
  }

  async insert(word, onHighlight) {
    let node = this.root;
    for (let char of word) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode();
      }
      node = node.children[char];
      node.highlighted = true;
      await onHighlight();
    }
    node.isEndOfWord = true;
    await onHighlight();
    this.clearHighlights();
    await onHighlight();
  }

  async delete(word, onHighlight) {
    const deleteHelper = async (node, word, index) => {
      if (index === word.length) {
        if (node.isEndOfWord) {
          node.isEndOfWord = false;
          node.highlighted = true;
          await onHighlight();
          return Object.keys(node.children).length === 0;
        }
        return false;
      }

      const char = word[index];
      if (!node.children[char]) return false;

      node.highlighted = true;
      await onHighlight();

      const shouldDeleteChild = await deleteHelper(node.children[char], word, index + 1);

      if (shouldDeleteChild) {
        delete node.children[char];
        node.highlighted = true;
        await onHighlight();
      }
      return Object.keys(node.children).length === 0 && !node.isEndOfWord;
    };

    await deleteHelper(this.root, word, 0);
    this.clearHighlights();
    await onHighlight();
  }

  async search(word, onHighlight) {
    let node = this.root;
    for (let char of word) {
      if (!node.children[char]) {
        this.clearHighlights();
        await onHighlight();
        return false;
      }
      node = node.children[char];
      node.highlighted = true;
      await onHighlight();
    }
    const result = node.isEndOfWord;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.clearHighlights();
    await onHighlight();
    return result;
  }

  clearHighlights() {
    const clearNode = (node) => {
      node.highlighted = false;
      for (let child of Object.values(node.children)) {
        clearNode(child);
      }
    };
    clearNode(this.root);
  }
}

const NODE_RADIUS = 20;
const VERTICAL_SPACING = 80;
const HORIZONTAL_SPACING = 50;
const SIBLING_SPACING = 20;

const randomWords = [
  "apple",
  "app",
  "appid",
  "application",
  "banana",
  "blueberry",
  "cherry",
  "data",
  "date",
  "day",
  "dog",
  "elderberry",
  "fig",
  "fruit",
  "grape",
  "honeydew",
  "kiwi",
  "lemon",
  "xray",
  "zebra",
];

const TrieVisualization = () => {
  const [trie, setTrie] = useState(() => new Trie());
  const [word, setWord] = useState("");
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [words, setWords] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const svgRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { t } = useI18n();

  const updateWords = useCallback((newTrie) => {
    const wordList = [];
    const dfs = (node, currentWord) => {
      if (node.isEndOfWord) {
        wordList.push(currentWord);
      }
      for (const [char, childNode] of Object.entries(node.children)) {
        dfs(childNode, currentWord + char);
      }
    };
    dfs(newTrie.root, "");
    setWords(wordList.sort());
  }, []);

  const onHighlight = useCallback(() => {
    return new Promise((resolve) => {
      setTrie((prevTrie) => {
        const newTrie = new Trie();
        Object.assign(newTrie, prevTrie);
        return newTrie;
      });
      setTimeout(resolve, 500);
    });
  }, []);

  const handleInsert = useCallback(async () => {
    if (word && !isAnimating) {
      setIsAnimating(true);
      await trie.insert(word, onHighlight);
      updateWords(trie);
      setSearchResult(null);
      setWord("");

      setIsAnimating(false);
    }
  }, [word, updateWords, trie, isAnimating, onHighlight]);

  const handleDelete = useCallback(async () => {
    if (word && !isAnimating) {
      setIsAnimating(true);
      const exists = await trie.search(word, onHighlight);
      if (!exists) {
        setSearchResult(false);
        setIsAnimating(false);
        return;
      }
      await trie.delete(word, onHighlight);
      updateWords(trie);
      setSearchResult(null);
      setWord("");
      setIsAnimating(false);
    }
  }, [word, updateWords, trie, isAnimating, onHighlight]);

  const handleSearch = useCallback(async () => {
    if (word && !isAnimating) {
      setIsAnimating(true);
      const result = await trie.search(word, onHighlight);
      setSearchResult(result);
      setIsAnimating(false);
    }
  }, [word, trie, isAnimating, onHighlight]);

  const handleRandomInitialize = useCallback(() => {
    if (!isAnimating) {
      const newTrie = new Trie();
      const selectedWords = [];
      while (selectedWords.length < 10) {
        const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
        if (!selectedWords.includes(randomWord)) {
          selectedWords.push(randomWord);
          newTrie.insertSync(randomWord);
        }
      }
      setTrie(newTrie);
      updateWords(newTrie);
      setSearchResult(null);
    }
  }, [updateWords, isAnimating]);

  const calculateTreeDimensions = useCallback((node) => {
    const children = Object.values(node.children);
    if (children.length === 0) {
      return { width: HORIZONTAL_SPACING, height: NODE_RADIUS * 2 };
    }
    let totalWidth = 0;
    let maxHeight = 0;
    children.forEach((child, index) => {
      const childDim = calculateTreeDimensions(child);
      totalWidth += childDim.width;
      if (index > 0) totalWidth += SIBLING_SPACING;
      maxHeight = Math.max(maxHeight, childDim.height);
    });
    return {
      width: Math.max(totalWidth, HORIZONTAL_SPACING),
      height: maxHeight + VERTICAL_SPACING,
    };
  }, []);

  const renderNode = (node, x, y, char = "") => {
    const children = Object.values(node.children);
    const childrenKeys = Object.keys(node.children);
    const { width } = calculateTreeDimensions(node);
    const startX = x - width / 2;

    const elements = [];

    // Render current node
    elements.push(
      <g key={`node-${x}-${y}`}>
        <circle cx={x} cy={y} r={NODE_RADIUS} fill={node.highlighted ? "red" : "white"} stroke="black" />
        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="14">
          {char}
        </text>
        {node.isEndOfWord && <circle cx={x} cy={y + NODE_RADIUS + 5} r="3" fill="black" />}
      </g>
    );

    // Render children and connections
    let childX = startX;
    children.forEach((child, index) => {
      const childWidth = calculateTreeDimensions(child).width;
      const nextX = childX + childWidth / 2;
      const nextY = y + VERTICAL_SPACING;

      elements.push(
        <line
          key={`line-${x}-${y}-${index}`}
          x1={x}
          y1={y + NODE_RADIUS}
          x2={nextX}
          y2={nextY - NODE_RADIUS}
          stroke="black"
        />
      );

      elements.push(...renderNode(child, nextX, nextY, childrenKeys[index]));

      childX += childWidth + SIBLING_SPACING;
    });

    return elements;
  };

  useEffect(() => {
    if (svgRef.current) {
      const { width, height } = calculateTreeDimensions(trie.root);
      setDimensions({
        width: Math.max(800, width + 100),
        height: Math.max(600, height + 100),
      });
    }
  }, [trie, calculateTreeDimensions]);
  return (
    <div className="container mx-auto pt-4">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-4/5 order-last lg:order-first bg-white rounded-lg shadow">
          <div className="border rounded-lg overflow-auto">
            <svg ref={svgRef} width={dimensions.width} height={dimensions.height} className="w-full">
              <g transform={`translate(${dimensions.width / 2}, 40)`}>{renderNode(trie.root, 0, 0, "Root")}</g>
            </svg>
          </div>
        </div>

        <div className="lg:w-1/5 order-first lg:order-last">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={word}
              onChange={(e) => {
                setWord(e.target.value.toLowerCase());
                setSearchResult(null);
              }}
              className="w-full border p-2 rounded"
              placeholder={t("enter_word")}
              disabled={isAnimating}
            />

            <div className="flex flex-col gap-2">
              <button
                onClick={handleInsert}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                disabled={isAnimating}
              >
                {t("insert")}
              </button>
              <button
                onClick={handleDelete}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                disabled={isAnimating}
              >
                {t("delete")}
              </button>
              <button
                onClick={handleSearch}
                className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
                disabled={isAnimating}
              >
                {t("search")}
              </button>
              <button
                onClick={handleRandomInitialize}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={isAnimating}
              >
                {t("random_initialize")}
              </button>
            </div>

            {searchResult !== null && (
              <div className={`p-2 rounded ${searchResult ? "bg-green-100" : "bg-red-100"}`}>
                {searchResult ? t("find_word_in_trie", { word: word }) : t("no_word_in_trie", { word: word })}
              </div>
            )}

            {words.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 font-semibold border-b">{t("words_in_trie")}</div>
                <div className="max-h-[300px] overflow-auto">
                  <div className="flex flex-col">
                    {words.map((word, index) => (
                      <div key={index} className="px-3 py-2 hover:bg-gray-100 border-b last:border-b-0">
                        {word}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrieVisualization;
