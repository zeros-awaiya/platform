// 可視化: current のグラフから自己完結HTML（外部CDN不使用）を生成し manifest を更新する
// 使い方: node scripts/graph/render.mjs [--root <path>]
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { graphPaths, readJson, resolveRoot, sha256File, writeJson } from "./lib.mjs";

const { values } = parseArgs({ options: { root: { type: "string" } } });
const rootDir = resolveRoot(values.root);
const { currentDir } = graphPaths(rootDir);

const graphPath = path.join(currentDir, "knowledge-graph.json");
const manifestPath = path.join(currentDir, "manifest.json");
if (!fs.existsSync(graphPath) || !fs.existsSync(manifestPath)) {
  console.error(`エラー: ${currentDir} に生成物がありません。先に graph:build を実行してください`);
  process.exit(1);
}

const graph = readJson(graphPath);
const manifest = readJson(manifestPath);

const TYPE_COLORS = {
  Folder: "#475569",
  Note: "#0ea5e9",
  Decision: "#f59e0b",
  Task: "#ef4444",
  Artifact: "#10b981",
  Reference: "#8b5cf6",
  File: "#94a3b8",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// フォルダを大円上に置き、所属ファイルをその周囲のリングに並べる静的レイアウト
function layoutSvg(graph) {
  const folderNodes = graph.nodes.filter((node) => node.type === "Folder");
  const fileNodes = graph.nodes.filter((node) => node.type !== "Folder");
  const byFolder = new Map(folderNodes.map((node) => [node.id, []]));
  const rootFiles = [];
  const fileFolder = new Map();
  for (const edge of graph.edges) {
    if (edge.type === "BELONGS_TO" && byFolder.has(edge.target)) {
      fileFolder.set(edge.source, edge.target);
    }
  }
  for (const node of fileNodes) {
    const folderId = fileFolder.get(node.id);
    if (folderId) {
      byFolder.get(folderId).push(node);
    } else {
      rootFiles.push(node);
    }
  }

  const clusters = folderNodes.map((folder) => ({ folder, files: byFolder.get(folder.id) }));
  if (rootFiles.length > 0) {
    clusters.push({ folder: null, files: rootFiles });
  }

  const maxFiles = Math.max(1, ...clusters.map((cluster) => cluster.files.length));
  const clusterRadius = 40 + Math.ceil(Math.sqrt(maxFiles)) * 16;
  const bigRadius = Math.max(260, (clusters.length * clusterRadius * 2.2) / (2 * Math.PI));
  const size = Math.ceil((bigRadius + clusterRadius + 60) * 2);
  const center = size / 2;

  const positions = new Map();
  clusters.forEach((cluster, index) => {
    const angle = (2 * Math.PI * index) / clusters.length - Math.PI / 2;
    const cx = center + bigRadius * Math.cos(angle);
    const cy = center + bigRadius * Math.sin(angle);
    cluster.cx = cx;
    cluster.cy = cy;
    if (cluster.folder) {
      positions.set(cluster.folder.id, { x: cx, y: cy });
    }
    cluster.files.forEach((file, fileIndex) => {
      const ring = Math.floor(fileIndex / 14);
      const perRing = Math.min(14, cluster.files.length - ring * 14);
      const fileAngle = (2 * Math.PI * (fileIndex % 14)) / perRing;
      const radius = 26 + ring * 14;
      positions.set(file.id, {
        x: cx + radius * Math.cos(fileAngle),
        y: cy + radius * Math.sin(fileAngle),
      });
    });
  });

  const edgeLines = graph.edges
    .map((edge) => {
      const from = positions.get(edge.source);
      const to = positions.get(edge.target);
      if (!from || !to) {
        return "";
      }
      return `<line x1="${from.x.toFixed(1)}" y1="${from.y.toFixed(1)}" x2="${to.x.toFixed(1)}" y2="${to.y.toFixed(1)}" stroke="#cbd5e1" stroke-width="0.5"/>`;
    })
    .join("\n");

  const nodeCircles = graph.nodes
    .map((node) => {
      const pos = positions.get(node.id);
      if (!pos) {
        return "";
      }
      const isFolder = node.type === "Folder";
      const color = TYPE_COLORS[node.type] ?? TYPE_COLORS.File;
      const title = escapeHtml(node.attributes?.relativePath ?? node.label);
      const circle = `<circle cx="${pos.x.toFixed(1)}" cy="${pos.y.toFixed(1)}" r="${isFolder ? 10 : 3.5}" fill="${color}"><title>[${node.type}] ${title}</title></circle>`;
      const label = isFolder
        ? `<text x="${pos.x.toFixed(1)}" y="${(pos.y - 14).toFixed(1)}" text-anchor="middle" font-size="12" fill="#334155" font-weight="bold">${escapeHtml(node.label)}</text>`
        : "";
      return circle + label;
    })
    .join("\n");

  const rootLabel = clusters.find((cluster) => !cluster.folder);
  const rootText = rootLabel
    ? `<text x="${rootLabel.cx.toFixed(1)}" y="${(rootLabel.cy - clusterRadius / 2 - 6).toFixed(1)}" text-anchor="middle" font-size="12" fill="#334155" font-weight="bold">(root)</text>`
    : "";

  return `<svg viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;background:#f8fafc;border-radius:8px">
${edgeLines}
${nodeCircles}
${rootText}
</svg>`;
}

const typeCounts = {};
for (const node of graph.nodes) {
  typeCounts[node.type] = (typeCounts[node.type] ?? 0) + 1;
}

const validationPath = path.join(currentDir, "validation-report.json");
const validation = fs.existsSync(validationPath) ? readJson(validationPath) : null;
const isolated = validation?.details?.isolatedNodes ?? [];

const typeRows = Object.entries(typeCounts)
  .sort((a, b) => b[1] - a[1])
  .map(
    ([type, count]) =>
      `<tr><td><span class="dot" style="background:${TYPE_COLORS[type] ?? TYPE_COLORS.File}"></span>${escapeHtml(type)}</td><td>${count}</td></tr>`
  )
  .join("\n");

const fileRows = graph.nodes
  .filter((node) => node.type !== "Folder")
  .sort((a, b) => a.attributes.relativePath.localeCompare(b.attributes.relativePath))
  .map(
    (node) =>
      `<tr data-search="${escapeHtml(node.attributes.relativePath.toLowerCase())} ${escapeHtml(node.type.toLowerCase())}"><td>${escapeHtml(node.type)}</td><td>${escapeHtml(node.attributes.relativePath)}</td><td>${node.attributes.size}</td><td>${escapeHtml(node.attributes.updatedAt)}</td></tr>`
  )
  .join("\n");

const isolatedList = isolated.length
  ? `<ul>${isolated.map((node) => `<li>[${escapeHtml(node.type)}] ${escapeHtml(node.relativePath ?? node.label)}</li>`).join("")}</ul>`
  : "<p>なし</p>";

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>情報循環グラフ ${escapeHtml(manifest.runId)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#fff;color:#0f172a;max-width:1100px;margin-inline:auto}
h1{font-size:1.4rem}h2{font-size:1.1rem;margin-top:2rem}
.cards{display:flex;gap:12px;flex-wrap:wrap}
.card{border:1px solid #e2e8f0;border-radius:8px;padding:12px 20px;min-width:120px}
.card .num{font-size:1.6rem;font-weight:bold}
.card .cap{font-size:.8rem;color:#64748b}
table{border-collapse:collapse;width:100%;font-size:.85rem}
th,td{border:1px solid #e2e8f0;padding:4px 8px;text-align:left}
th{background:#f1f5f9}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px}
input{padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;width:280px;margin-bottom:8px}
.meta{color:#64748b;font-size:.8rem}
</style>
</head>
<body>
<h1>情報循環グラフ</h1>
<p class="meta">runId: ${escapeHtml(manifest.runId)} / 生成: ${escapeHtml(manifest.generatedAt)} / schema: ${escapeHtml(graph.schemaVersion)}</p>
<div class="cards">
<div class="card"><div class="num">${graph.counts.nodes}</div><div class="cap">ノード</div></div>
<div class="card"><div class="num">${graph.counts.edges}</div><div class="cap">エッジ</div></div>
<div class="card"><div class="num">${isolated.length}</div><div class="cap">孤立ノード</div></div>
</div>
<h2>全体図</h2>
${layoutSvg(graph)}
<h2>型別件数</h2>
<table><thead><tr><th>型</th><th>件数</th></tr></thead><tbody>
${typeRows}
</tbody></table>
<h2>孤立ノード</h2>
${isolatedList}
<h2>ファイル一覧</h2>
<input id="filter" type="search" placeholder="パス・型で絞り込み">
<table><thead><tr><th>型</th><th>相対パス</th><th>サイズ</th><th>更新日時</th></tr></thead><tbody id="files">
${fileRows}
</tbody></table>
<script>
document.getElementById("filter").addEventListener("input", (event) => {
  const query = event.target.value.toLowerCase();
  for (const row of document.querySelectorAll("#files tr")) {
    row.style.display = row.dataset.search.includes(query) ? "" : "none";
  }
});
</script>
</body>
</html>`;

const htmlPath = path.join(currentDir, "knowledge-graph.html");
fs.writeFileSync(htmlPath, html, "utf8");

manifest.artifacts.html = {
  path: "knowledge-graph.html",
  hash: sha256File(htmlPath),
};
writeJson(manifestPath, manifest);

console.log(`HTML生成完了: ${htmlPath}`);
