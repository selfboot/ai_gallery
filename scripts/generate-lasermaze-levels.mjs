import { writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const levelsPath = path.join(projectRoot, "src", "app", "[lang]", "games", "lasermaze", "levels.json");

const GRID_SIZE = 15;
const CELL_SIZE = 48;
const LEVELS_PER_DIFFICULTY = 10;

const ensureModule = async (relativePath) => {
  const modulePath = path.join(projectRoot, relativePath);
  return import(pathToFileURL(modulePath));
};

const main = async () => {
  const { generateProceduralLevel } = await ensureModule("src/app/[lang]/games/lasermaze/levelGenerator.js");
  const { traceLaserBeams, targetKey } = await ensureModule("src/app/[lang]/games/lasermaze/gameLogic.js");

  const defaults = { gridSize: GRID_SIZE, cellSize: CELL_SIZE };
  const desiredCounts = new Map([
    [1, LEVELS_PER_DIFFICULTY],
    [2, LEVELS_PER_DIFFICULTY],
    [3, LEVELS_PER_DIFFICULTY],
  ]);

  const collected = [];
  const signatureSet = new Set();

  for (const [difficulty, targetCount] of desiredCounts) {
    let generatedForDifficulty = 0;
    let attempts = 0;
    const maxAttempts = 20000;

    while (generatedForDifficulty < targetCount) {
      attempts += 1;
      if (attempts > maxAttempts) {
        throw new Error(`无法在 ${maxAttempts} 次尝试内生成足够的难度 ${difficulty} 关卡`);
      }

      const level = generateProceduralLevel(difficulty, defaults);

      const { targetsHit } = traceLaserBeams({
        laser: level.laser,
        blocks: level.solutionBlocks ?? level.blocks,
        targets: level.targets,
        gridSize: level.gridSize ?? defaults.gridSize,
      });

      if ((targetsHit?.size ?? 0) !== level.targets.length) {
        continue;
      }

      const signature = JSON.stringify({
        difficulty: level.difficulty,
        laser: level.laser,
        targets: level.targets,
        solutionBlocks: level.solutionBlocks,
      });

      if (signatureSet.has(signature)) {
        continue;
      }
      signatureSet.add(signature);

      generatedForDifficulty += 1;

      const label = difficulty === 1 ? "easy" : difficulty === 2 ? "medium" : "hard";
      collected.push({
        id: `preset-${label}-${generatedForDifficulty}`,
        difficulty: level.difficulty,
        laser: level.laser,
        blocks: level.blocks,
        targets: level.targets,
        solutionBlocks: level.solutionBlocks,
      });
    }
  }

  collected.sort((a, b) => a.difficulty - b.difficulty || a.id.localeCompare(b.id));

  const output = {
    defaults,
    levels: collected,
  };

  await writeFile(levelsPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Generated ${collected.length} levels at ${levelsPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
