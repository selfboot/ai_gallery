import fs from "node:fs";
import path from "node:path";

const appRoot = path.join(process.cwd(), "src/app");
const langRoot = path.join(appRoot, "[lang]");
const outputPath = path.join(appRoot, "i18n/scope-map.json");
const dictionaryPaths = [
  path.join(appRoot, "dictionaries/en.json"),
  path.join(appRoot, "dictionaries/zh.json"),
];

const JS_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const EXCLUDED_DIRS = new Set(["__tests__", "__fixtures__", "node_modules"]);

const COMMON_FALLBACK_KEYS = [
  "hint",
  "close",
  "cancel",
  "confirm",
  "submit",
  "reset",
  "go_back",
  "fileUpload_dragHere",
  "fileUpload_clickUpload",
  "fileUpload_sizeExceeded",
  "fileUpload_filesSelected",
  "games",
  "games_title",
  "algorithms",
  "algorithms_title",
  "tools",
  "tools_title",
  "blog",
  "blog_title",
  "try",
  "mini_program_cta_label",
  "mini_program_cta_mobile_label",
  "mini_program_modal_title",
  "mini_program_modal_description",
  "mini_program_modal_close",
  "tableofcontents",
];

const COMMON_PREFIXES = [
  "fileUpload_",
  "modal_",
  "common_",
  "toolContentLoading_",
];

function flattenDictionaryKeys(value, keys = new Set()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return keys;
  }

  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    flattenDictionaryKeys(child, keys);
  }

  return keys;
}

function loadDictionaryKeys() {
  const keys = new Set();

  for (const dictionaryPath of dictionaryPaths) {
    if (!fs.existsSync(dictionaryPath)) {
      continue;
    }

    const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, "utf8"));
    for (const key of flattenDictionaryKeys(dictionary)) {
      keys.add(key);
    }
  }

  return keys;
}

const dictionaryKeys = loadDictionaryKeys();

function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (JS_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function addMatch(set, value) {
  if (value && !value.includes("${")) {
    set.add(value);
  }
}

function extractFromFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const keys = new Set();
  const prefixes = new Set();

  for (const match of source.matchAll(/\bt\s*\(\s*["'`]([^"'`$]+)["'`]/g)) {
    addMatch(keys, match[1]);
  }

  for (const match of source.matchAll(/\bt\s*\(\s*`([^`$]*)\$\{/g)) {
    if (match[1]) {
      prefixes.add(match[1]);
    }
  }

  for (const match of source.matchAll(/\bdictionary\.([A-Za-z0-9_]+)/g)) {
    addMatch(keys, match[1]);
  }

  for (const match of source.matchAll(/["'`]([^"'`\n$]+)["'`]/g)) {
    const value = match[1].trim();
    if (dictionaryKeys.has(value)) {
      keys.add(value);
      continue;
    }

    const normalized = value.toLowerCase();
    if (dictionaryKeys.has(normalized)) {
      keys.add(normalized);
    }
  }

  return { keys, prefixes };
}

function mergeExtracted(target, extracted) {
  for (const key of extracted.keys) {
    target.keys.add(key);
  }
  for (const prefix of extracted.prefixes) {
    target.prefixes.add(prefix);
  }
}

function findRouteDirs(root) {
  const routeDirs = [];

  function visit(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const hasPage = entries.some((entry) => entry.isFile() && entry.name === "page.js");

    if (hasPage && dir !== langRoot) {
      routeDirs.push(dir);
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }
      visit(path.join(dir, entry.name));
    }
  }

  visit(root);
  return routeDirs;
}

function makeScopeName(routeDir) {
  return path.relative(langRoot, routeDir).split(path.sep).join("/");
}

function makeRouteScope(routeDir) {
  const scope = makeScopeName(routeDir);
  const segment = path.basename(routeDir).replace(/^\[(.+)\]$/, "$1");
  const extracted = { keys: new Set(), prefixes: new Set() };

  for (const file of walkFiles(routeDir)) {
    const base = path.basename(file);
    if (base.endsWith(".test.js") || base.endsWith(".test.jsx")) {
      continue;
    }
    mergeExtracted(extracted, extractFromFile(file));
  }

  extracted.keys.add(`${segment}_title`);
  extracted.keys.add(`${segment}_description`);
  extracted.prefixes.add(`${segment}_`);

  if (/^\d/.test(segment)) {
    extracted.keys.add(`game${segment}_title`);
    extracted.keys.add(`game${segment}_description`);
    extracted.prefixes.add(`game${segment}_`);
  }

  return {
    scope,
    keys: [...extracted.keys].sort(),
    prefixes: [...extracted.prefixes].sort(),
  };
}

const common = { keys: new Set(COMMON_FALLBACK_KEYS), prefixes: new Set(COMMON_PREFIXES) };
for (const file of walkFiles(path.join(appRoot, "components"))) {
  mergeExtracted(common, extractFromFile(file));
}

const scopes = {};
for (const routeDir of findRouteDirs(langRoot)) {
  const routeScope = makeRouteScope(routeDir);
  scopes[routeScope.scope] = {
    keys: routeScope.keys,
    prefixes: routeScope.prefixes,
  };
}

const output = {
  common: {
    keys: [...common.keys].sort(),
    prefixes: [...common.prefixes].sort(),
  },
  scopes,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Generated i18n scope map: ${Object.keys(scopes).length} scopes`);
