import React, { useState, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../../components/layout";
import PageHeader from "../../components/header";
import SEO from "../../components/seo";

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

  // 添加新的同步插入方法
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
  const { t } = useTranslation();

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
    return new Promise(resolve => {
      setTrie(prevTrie => {
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
      await trie.delete(word, onHighlight);  // 这里传递 onHighlight
      updateWords(trie);
      setSearchResult(null);
      setWord("");
      setIsAnimating(false);
    }
  }, [word, updateWords, trie, isAnimating, onHighlight]);

  const handleSearch = useCallback(async () => {
    if (word && !isAnimating) {
      setIsAnimating(true);
      const result = await trie.search(word, onHighlight);  // 这里传递 onHighlight
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
          newTrie.insertSync(randomWord);  // 使用同步插入方法
        }
      }
      setTrie(newTrie);
      updateWords(newTrie);
      setSearchResult(null);
    }
  }, [updateWords, isAnimating]);

  const calculateTreeDimensions = (node) => {
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
  };

  const renderNode = (node, x, y, char = "") => {
    const children = Object.values(node.children);
    const childrenKeys = Object.keys(node.children);
    const { width } = calculateTreeDimensions(node);
    const startX = x - width / 2;

    const elements = [];

    // Render current node
    elements.push(
      <g key={`node-${x}-${y}`}>
        <circle
          cx={x}
          cy={y}
          r={NODE_RADIUS}
          fill={node.highlighted ? "red" : "white"}
          stroke="black"
        />
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
      setDimensions({ width: Math.max(800, width + 100), height: Math.max(600, height + 100) });
    }
  }, [trie]);
  return (
    <Layout>
      <PageHeader />
      <div className="p-4 max-w-full mx-auto">
        <div className="flex mb-4 space-x-2">
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value.toLowerCase())}
            className="border p-2 rounded"
            placeholder={t("enter_word")}
            disabled={isAnimating}
          />
          <button
            onClick={handleInsert}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            disabled={isAnimating}
          >
            {t("insert")}
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            disabled={isAnimating}
          >
            {t("delete")}
          </button>
          <button
            onClick={handleSearch}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
            disabled={isAnimating}
          >
            {t("search")}
          </button>
          <button
            onClick={handleRandomInitialize}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={isAnimating}
          >
            {t("random_initialize")}
          </button>
        </div>
        {searchResult !== null && (
          <div className={`mb-4 p-2 rounded ${searchResult ? "bg-green-100" : "bg-red-100"}`}>
            {searchResult ? t("find_word_in_trie", { word: word }) : t("no_word_in_trie", { word: word })}
          </div>
        )}
        <div className="flex flex-row">
          <div className="flex-grow pr-4" style={{ flex: "8" }}>
            <div className="border p-4 rounded overflow-auto">
              <svg ref={svgRef} width={dimensions.width} height={dimensions.height}>
                <g transform={`translate(${dimensions.width / 2}, 40)`}>{renderNode(trie.root, 0, 0, "Root")}</g>
              </svg>
            </div>
          </div>
          <div className="pl-4" style={{ flex: "2" }}>
            <div className="border rounded overflow-auto max-h-[600px]">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 bg-gray-100 sticky top-0">{t("words_in_trie")}</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map((word, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : ""}>
                      <td className="px-4 py-2">{word}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TrieVisualization;

export const Head = () => (
  <SEO
    title="Trie Visualization"
    description=""
    keywords=""
    canonicalUrl="https://gallery.selfboot.cn/algorithms/trie/"
  />
);
