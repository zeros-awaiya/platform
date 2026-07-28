// 情報循環グラフ 共通ロジック（設計: docs/ai-org-knowledge-graph-plan.md）
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const SCHEMA_VERSION = "1.0.0";

// 走査から除外するディレクトリ（graph/ は自分自身の出力先）
export const EXCLUDED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  ".vercel",
  ".claude",
  "graph",
]);

export function createId(value) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 20);
}

export function sha256File(absolutePath) {
  const buffer = fs.readFileSync(absolutePath);
  return "sha256:" + crypto.createHash("sha256").update(buffer).digest("hex");
}

export function toPosix(value) {
  return value.replaceAll("\\", "/");
}

export function walkDirectory(rootDir) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          walk(fullPath);
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const stat = fs.statSync(fullPath);
      results.push({
        name: entry.name,
        absolutePath: fullPath,
        size: stat.size,
        updatedAt: stat.mtime.toISOString(),
      });
    }
  }

  walk(rootDir);
  return results;
}

// 型判定はフォルダ位置ベース。判定できないものは File のまま（誤分類より未分類を許す）。
// 前半は記事準拠の標準フォルダ、後半は本リポジトリ既存構造のマッピング（計画 §3.4）。
const TYPE_RULES = [
  { prefix: "notes/", type: "Note" },
  { prefix: "decisions/", type: "Decision" },
  { prefix: "tasks/", type: "Task" },
  { prefix: "outputs/", type: "Artifact" },
  { prefix: "references/", type: "Reference" },
  { exact: "supabase/QUIZ_ROLLOUT_PLAN.md", type: "Task" },
  { prefix: "supabase/migrations/", type: "Artifact" },
  { prefix: "supabase/quiz_pv/", type: "Artifact" },
  { pattern: /^supabase\/seed_[^/]+\.sql$/, type: "Artifact" },
  { prefix: "docs/", type: "Reference" },
];

export function detectFileType(relativePath) {
  const normalized = toPosix(relativePath);
  for (const rule of TYPE_RULES) {
    if (rule.exact && normalized === rule.exact) {
      return rule.type;
    }
    if (rule.prefix && normalized.startsWith(rule.prefix)) {
      return rule.type;
    }
    if (rule.pattern && rule.pattern.test(normalized)) {
      return rule.type;
    }
  }
  return "File";
}

export function fileToNode(file, rootDir) {
  const relativePath = toPosix(path.relative(rootDir, file.absolutePath));
  return {
    id: `file_${createId(relativePath)}`,
    type: detectFileType(relativePath),
    label: file.name,
    attributes: {
      relativePath,
      size: file.size,
      updatedAt: file.updatedAt,
    },
  };
}

export function createFolderNodes(fileNodes) {
  const folders = new Map();
  for (const node of fileNodes) {
    const parts = node.attributes.relativePath.split("/");
    if (parts.length < 2) {
      continue;
    }
    const folderName = parts[0];
    const folderId = `folder_${createId(folderName)}`;
    folders.set(folderId, {
      id: folderId,
      type: "Folder",
      label: folderName,
    });
  }
  return [...folders.values()];
}

export function createFolderEdges(fileNodes) {
  const edges = [];
  for (const node of fileNodes) {
    const parts = node.attributes.relativePath.split("/");
    if (parts.length < 2) {
      continue;
    }
    const folderId = `folder_${createId(parts[0])}`;
    edges.push({
      id: `edge_${createId(`${node.id}:${folderId}:BELONGS_TO`)}`,
      type: "BELONGS_TO",
      source: node.id,
      target: folderId,
      evidence: { kind: "folder_location" },
    });
  }
  return edges;
}

export function buildGraph(rootDir) {
  const files = walkDirectory(rootDir);
  const fileNodes = files.map((file) => fileToNode(file, rootDir));
  const folderNodes = createFolderNodes(fileNodes);
  const nodes = [...folderNodes, ...fileNodes];
  const edges = createFolderEdges(fileNodes);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    counts: { nodes: nodes.length, edges: edges.length },
    nodes,
    edges,
  };
}

// ---- 品質テスト ----

export function findBrokenEdges(graph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  return graph.edges.filter(
    (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
  );
}

export function findDuplicateNodeIds(graph) {
  const seen = new Set();
  const duplicates = new Set();
  for (const node of graph.nodes) {
    if (seen.has(node.id)) {
      duplicates.add(node.id);
    }
    seen.add(node.id);
  }
  return [...duplicates];
}

export function findIsolatedNodes(graph) {
  const connected = new Set();
  for (const edge of graph.edges) {
    connected.add(edge.source);
    connected.add(edge.target);
  }
  return graph.nodes.filter((node) => !connected.has(node.id));
}

export function findBrokenPaths(graph, rootDir) {
  return graph.nodes.filter((node) => {
    const relativePath = node.attributes?.relativePath;
    if (!relativePath) {
      return false;
    }
    return !fs.existsSync(path.join(rootDir, relativePath));
  });
}

export function findCountMismatch(graph) {
  const mismatches = [];
  if (graph.counts.nodes !== graph.nodes.length) {
    mismatches.push(
      `counts.nodes=${graph.counts.nodes} but nodes.length=${graph.nodes.length}`
    );
  }
  if (graph.counts.edges !== graph.edges.length) {
    mismatches.push(
      `counts.edges=${graph.counts.edges} but edges.length=${graph.edges.length}`
    );
  }
  return mismatches;
}

// エラー（生成不良: 昇格を止める）と警告（運用上の発見: 報告のみ）を分ける
export function validateGraph(graph, rootDir) {
  const brokenEdges = findBrokenEdges(graph);
  const duplicateNodeIds = findDuplicateNodeIds(graph);
  const brokenPaths = findBrokenPaths(graph, rootDir);
  const countMismatch = findCountMismatch(graph);
  const isolatedNodes = findIsolatedNodes(graph);

  const errors = [];
  if (brokenEdges.length > 0) {
    errors.push(`壊れたエッジ: ${brokenEdges.length}件`);
  }
  if (duplicateNodeIds.length > 0) {
    errors.push(`重複ノードID: ${duplicateNodeIds.length}件`);
  }
  if (brokenPaths.length > 0) {
    errors.push(`存在しないパス: ${brokenPaths.length}件`);
  }
  errors.push(...countMismatch);

  const warnings = [];
  if (isolatedNodes.length > 0) {
    warnings.push(`孤立ノード: ${isolatedNodes.length}件`);
  }
  const unresolvedReferences = graph.quality?.unresolvedReferences ?? [];
  if (unresolvedReferences.length > 0) {
    warnings.push(`未解決の参照: ${unresolvedReferences.length}件`);
  }
  const duplicateEntityIds = graph.quality?.duplicateEntityIds ?? [];
  if (duplicateEntityIds.length > 0) {
    warnings.push(`重複エンティティID: ${duplicateEntityIds.length}件`);
  }

  return {
    generatedAt: new Date().toISOString(),
    ok: errors.length === 0,
    errors,
    warnings,
    details: {
      brokenEdges,
      duplicateNodeIds,
      unresolvedReferences,
      duplicateEntityIds,
      brokenPaths: brokenPaths.map((node) => node.attributes.relativePath),
      isolatedNodes: isolatedNodes.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        relativePath: node.attributes?.relativePath ?? null,
      })),
    },
  };
}

// ---- 入出力 ----

export function resolveRoot(rawRoot) {
  const rootDir = path.resolve(rawRoot ?? process.cwd());
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    console.error(`エラー: ルートディレクトリが存在しません: ${rootDir}`);
    process.exit(1);
  }
  return rootDir;
}

export function graphPaths(rootDir) {
  const graphDir = path.join(rootDir, "graph");
  return {
    graphDir,
    stagingDir: path.join(graphDir, "staging"),
    currentDir: path.join(graphDir, "current"),
  };
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}
