// スナップショット: current のグラフを日付つきで graph/snapshots/ に保存する（時間差分の材料）
// 使い方: node scripts/graph/snapshot.mjs [--root <path>]
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { graphPaths, readJson, resolveRoot } from "./lib.mjs";

const { values } = parseArgs({ options: { root: { type: "string" } } });
const rootDir = resolveRoot(values.root);
const { graphDir, currentDir } = graphPaths(rootDir);

const graphPath = path.join(currentDir, "knowledge-graph.json");
if (!fs.existsSync(graphPath)) {
  console.error(`エラー: ${graphPath} がありません。先に graph:build を実行してください`);
  process.exit(1);
}

const graph = readJson(graphPath);
const date = graph.generatedAt.slice(0, 10);
const snapshotsDir = path.join(graphDir, "snapshots");
fs.mkdirSync(snapshotsDir, { recursive: true });

const dest = path.join(snapshotsDir, `knowledge-graph-${date}.json`);
fs.copyFileSync(graphPath, dest);
console.log(`スナップショット保存: ${dest}（ノード ${graph.counts.nodes} / エッジ ${graph.counts.edges}）`);
