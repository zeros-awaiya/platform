// 意味エッジ生成: 許可リスト内Markdownのフロントマターから根拠・生成元・置換エッジを作る
// 本文の推測はしない。読むのは decisions/ tasks/ outputs/ の .md 先頭8KBのみ（計画 §12 準拠）
import fs from "node:fs";
import path from "node:path";
import { createId } from "./lib.mjs";

const SEMANTIC_DIRS = new Set(["decisions", "tasks", "outputs"]);
const MAX_BYTES = 8192;

// 型ごとの「自分自身のID」キー。それ以外のIDキーは他ノードへの参照
const SELF_ID_KEYS = {
  Decision: "decisionId",
  Artifact: "artifactId",
  Task: "taskId",
  Note: "noteId",
  Reference: "referenceId",
};

const KEEP_KEYS = [
  "artifactId",
  "decisionId",
  "taskId",
  "noteId",
  "referenceId",
  "status",
  "owner",
  "reviewers",
  "sources",
  "supersedes",
  "version",
  "generatedAt",
  "classification",
];

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

// 依存を増やさないための最小YAMLパーサ（スカラー・インライン配列・ブロックリストのみ対応）
export function parseFrontmatter(text) {
  if (!text.startsWith("---")) {
    return null;
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return null;
  }
  const body = text.slice(text.indexOf("\n") + 1, end);
  const result = {};
  let currentKey = null;

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }
    const listItem = line.match(/^\s*-\s*(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      if (listItem[1].trim()) {
        result[currentKey].push(stripQuotes(listItem[1].trim()));
      }
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      continue;
    }
    const key = kv[1];
    const value = kv[2].trim();
    currentKey = key;
    if (value === "") {
      result[key] = null;
      continue;
    }
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      result[key] = inner
        ? inner.split(",").map((item) => stripQuotes(item.trim())).filter(Boolean)
        : [];
      continue;
    }
    result[key] = stripQuotes(value);
  }
  return result;
}

// テンプレート・READMEは運用対象外
export function isOperationalFile(relativePath) {
  const base = path.posix.basename(relativePath);
  return !base.startsWith("_") && base.toLowerCase() !== "readme.md";
}

function isSemanticSource(node) {
  const relativePath = node.attributes?.relativePath;
  if (!relativePath || !relativePath.endsWith(".md")) {
    return false;
  }
  if (!SEMANTIC_DIRS.has(relativePath.split("/")[0])) {
    return false;
  }
  return isOperationalFile(relativePath);
}

function isPlaceholder(value) {
  return typeof value !== "string" || value === "" || value.includes("XXXX") || value.startsWith("YYYY-");
}

function readLimitedText(absolutePath) {
  const buffer = fs.readFileSync(absolutePath);
  return buffer.subarray(0, MAX_BYTES).toString("utf8");
}

// グラフに意味エッジと品質情報（未解決参照・重複ID）を追加する
export function applySemantics(graph, rootDir) {
  const fileNodes = graph.nodes.filter((node) => node.attributes?.relativePath);
  const pathMap = new Map(fileNodes.map((node) => [node.attributes.relativePath, node]));
  const entityMap = new Map();
  const duplicateEntityIds = [];
  const unresolvedReferences = [];
  const withFrontmatter = [];

  for (const node of fileNodes) {
    if (!isSemanticSource(node)) {
      continue;
    }
    const text = readLimitedText(path.join(rootDir, node.attributes.relativePath));
    const fm = parseFrontmatter(text);
    if (!fm) {
      continue;
    }
    const picked = {};
    for (const key of KEEP_KEYS) {
      if (fm[key] !== undefined && fm[key] !== null) {
        picked[key] = fm[key];
      }
    }
    node.attributes.frontmatter = picked;
    withFrontmatter.push(node);

    const selfKey = SELF_ID_KEYS[node.type];
    const selfId = selfKey ? picked[selfKey] : undefined;
    if (!isPlaceholder(selfId)) {
      if (entityMap.has(selfId)) {
        duplicateEntityIds.push({
          entityId: selfId,
          relativePaths: [
            entityMap.get(selfId).attributes.relativePath,
            node.attributes.relativePath,
          ],
        });
      } else {
        entityMap.set(selfId, node);
        node.attributes.entityId = selfId;
      }
    }
  }

  const resolve = (ref) => entityMap.get(ref) ?? pathMap.get(ref) ?? null;
  const edgeIds = new Set(graph.edges.map((edge) => edge.id));
  const addEdge = (sourceNode, targetNode, type, field, validFrom) => {
    const id = `edge_${createId(`${sourceNode.id}:${targetNode.id}:${type}`)}`;
    if (edgeIds.has(id)) {
      return;
    }
    edgeIds.add(id);
    graph.edges.push({
      id,
      type,
      source: sourceNode.id,
      target: targetNode.id,
      evidence: {
        kind: "frontmatter",
        relativePath: sourceNode.attributes.relativePath,
        field,
      },
      validFrom,
      validTo: null,
    });
  };

  for (const node of withFrontmatter) {
    const fm = node.attributes.frontmatter;
    const validFrom = !isPlaceholder(fm.generatedAt) ? fm.generatedAt : null;
    const reference = (field, value, type) => {
      if (isPlaceholder(value)) {
        return;
      }
      const target = resolve(value);
      if (target) {
        addEdge(node, target, type, field, validFrom);
      } else {
        unresolvedReferences.push({
          relativePath: node.attributes.relativePath,
          field,
          value,
        });
      }
    };

    const sourceEdgeType = node.type === "Decision" ? "SUPPORTED_BY" : "GENERATED_FROM";
    for (const source of Array.isArray(fm.sources) ? fm.sources : []) {
      reference("sources", source, sourceEdgeType);
    }
    reference("supersedes", fm.supersedes, "SUPERSEDES");
    if (node.type !== "Task") {
      reference("taskId", fm.taskId, "GENERATED_FROM");
    }
  }

  graph.quality = { unresolvedReferences, duplicateEntityIds };
  graph.counts = { nodes: graph.nodes.length, edges: graph.edges.length };
  return graph;
}
