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

const { values } = parseArgs({ options: { root: { type: "string" } } });
const rootDir = resolveRoot(values.root);
const { stagingDir, currentDir } = graphPaths(rootDir);

console.log(`走査対象: ${rootDir}`);

const graph = buildGraph(rootDir);
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

fs.rmSync(currentDir, { recursive: true, force: true });
fs.renameSync(runDir, currentDir);
if (fs.existsSync(stagingDir) && fs.readdirSync(stagingDir).length === 0) {
  fs.rmdirSync(stagingDir);
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
