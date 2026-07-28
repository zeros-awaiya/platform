// 品質テスト単体実行: current のグラフを再検証しレポートを更新する
// 使い方: node scripts/graph/validate.mjs [--root <path>]
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { graphPaths, readJson, resolveRoot, validateGraph, writeJson } from "./lib.mjs";

const { values } = parseArgs({ options: { root: { type: "string" } } });
const rootDir = resolveRoot(values.root);
const { currentDir } = graphPaths(rootDir);

const graphPath = path.join(currentDir, "knowledge-graph.json");
if (!fs.existsSync(graphPath)) {
  console.error(`エラー: ${graphPath} がありません。先に graph:build を実行してください`);
  process.exit(1);
}

const graph = readJson(graphPath);
const validation = validateGraph(graph, rootDir);
writeJson(path.join(currentDir, "validation-report.json"), validation);

console.log(`検証対象: ${graphPath}`);
console.log(`ノード ${graph.counts.nodes}件 / エッジ ${graph.counts.edges}件`);
for (const error of validation.errors) {
  console.error(`エラー: ${error}`);
}
for (const warning of validation.warnings) {
  console.log(`警告: ${warning}`);
}
const isolated = validation.details.isolatedNodes;
if (isolated.length > 0) {
  console.log("孤立ノード:");
  for (const node of isolated) {
    console.log(`  - [${node.type}] ${node.relativePath ?? node.label}`);
  }
}
if (validation.ok) {
  console.log("検証OK");
} else {
  process.exit(1);
}
