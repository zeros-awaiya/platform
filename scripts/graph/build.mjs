// グラフ生成: 走査 → ノード/エッジ → staging → 検証 → current へ昇格 + manifest
// 使い方: node scripts/graph/build.mjs [--root <path>]
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  SCHEMA_VERSION,
  buildGraph,
  graphPaths,
  resolveRoot,
  sha256File,
  validateGraph,
  writeJson,
} from "./lib.mjs";
import { applySemantics } from "./semantics.mjs";

const { values } = parseArgs({ options: { root: { type: "string" } } });
const rootDir = resolveRoot(values.root);
const { stagingDir, currentDir } = graphPaths(rootDir);

// Dropbox等の同期プロセスがファイルを掴んでいると削除/リネームが一時的に失敗するため、
// ロック起因のエラーコードに限り指数バックオフで再試行する
const LOCK_ERROR_CODES = new Set(["EPERM", "EBUSY", "EACCES", "ENOTEMPTY"]);

async function withRetry(label, action, attempts = 5) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return action();
    } catch (error) {
      if (!LOCK_ERROR_CODES.has(error.code) || attempt >= attempts) {
        throw error;
      }
      const delayMs = 500 * 2 ** (attempt - 1);
      console.log(`${label} が ${error.code} で失敗。${delayMs}ms 後に再試行（${attempt}/${attempts - 1}）`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

console.log(`走査対象: ${rootDir}`);

// 前回失敗時の中間生成物が残っていれば片付ける（stagingは再生成可能な作業領域）
if (fs.existsSync(stagingDir)) {
  for (const leftover of fs.readdirSync(stagingDir)) {
    await withRetry(`staging残置物 ${leftover} の削除`, () =>
      fs.rmSync(path.join(stagingDir, leftover), { recursive: true, force: true })
    );
    console.log(`前回の中間生成物を削除: staging/${leftover}`);
  }
}

const graph = buildGraph(rootDir);
applySemantics(graph, rootDir);
const validation = validateGraph(graph, rootDir);

const runId = `graph_${graph.generatedAt.replaceAll(":", "-").replace(/\..*$/, "")}`;
const runDir = path.join(stagingDir, runId);
fs.mkdirSync(runDir, { recursive: true });

writeJson(path.join(runDir, "knowledge-graph.json"), graph);
writeJson(path.join(runDir, "validation-report.json"), validation);

const manifest = {
  runId,
  generatedAt: graph.generatedAt,
  schemaVersion: SCHEMA_VERSION,
  counts: graph.counts,
  artifacts: {
    json: {
      path: "knowledge-graph.json",
      hash: sha256File(path.join(runDir, "knowledge-graph.json")),
    },
    validation: {
      path: "validation-report.json",
      hash: sha256File(path.join(runDir, "validation-report.json")),
    },
  },
};
writeJson(path.join(runDir, "manifest.json"), manifest);

// 検証エラーがある場合は staging に残し、current を汚さない（生成物の混在防止）
if (!validation.ok) {
  console.error("検証エラーのため current へ昇格しません:");
  for (const error of validation.errors) {
    console.error(`  - ${error}`);
  }
  console.error(`生成物は ${runDir} に残っています`);
  process.exit(1);
}

await withRetry("current の削除", () =>
  fs.rmSync(currentDir, { recursive: true, force: true })
);
await withRetry("current への昇格", () => fs.renameSync(runDir, currentDir));
if (fs.existsSync(stagingDir) && fs.readdirSync(stagingDir).length === 0) {
  await withRetry("空stagingの削除", () => fs.rmdirSync(stagingDir));
}

console.log(`生成完了: ノード ${graph.counts.nodes}件 / エッジ ${graph.counts.edges}件`);
for (const warning of validation.warnings) {
  console.log(`警告: ${warning}`);
}
const isolated = validation.details.isolatedNodes;
if (isolated.length > 0) {
  console.log("孤立ノード（どのノードともつながっていない）:");
  for (const node of isolated) {
    console.log(`  - [${node.type}] ${node.relativePath ?? node.label}`);
  }
}
console.log(`出力先: ${currentDir} (runId=${runId})`);
