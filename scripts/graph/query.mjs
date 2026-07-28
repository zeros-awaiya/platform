// 質問機能: グラフJSONへの定型クエリ（記事29節の5問 + 時間差分）
// 使い方: node scripts/graph/query.mjs <質問> [--root <path>] [オプション]
//   awaiting-approval        承認待ち（status が draft/proposed のもの）
//   unsupported-decisions    根拠のない判断（SUPPORTED_BY エッジがない Decision）
//   unreviewed-artifacts     確認されていない成果物（outputs/ 内で reviewed/published でない・確認者なし）
//   impact --target <パス|ID> 影響先（そのノードに依存しているものを再帰的にたどる）
//   stale-tasks [--days N]   長く止まっている仕事（更新が N 日以上前の Task、既定14日）
//   diff [--from A --to B]   時間差分（既定: 最新スナップショット vs current）
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { graphPaths, readJson, resolveRoot } from "./lib.mjs";
import { isOperationalFile } from "./semantics.mjs";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    root: { type: "string" },
    target: { type: "string" },
    days: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
  },
});

const question = positionals[0];
const rootDir = resolveRoot(values.root);
const { graphDir, currentDir } = graphPaths(rootDir);

function loadGraph(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`エラー: ${filePath} がありません。先に graph:build を実行してください`);
    process.exit(1);
  }
  return readJson(filePath);
}

function describe(node) {
  return `[${node.type}] ${node.attributes?.relativePath ?? node.label}`;
}

function operationalNodes(graph, type) {
  return graph.nodes.filter(
    (node) =>
      node.type === type &&
      node.attributes?.relativePath &&
      isOperationalFile(node.attributes.relativePath)
  );
}

function daysSince(isoString) {
  const time = Date.parse(isoString);
  if (Number.isNaN(time)) {
    return null;
  }
  return Math.floor((Date.now() - time) / 86400000);
}

const questions = {
  // 1. 誰の承認を何日待っているか
  "awaiting-approval": (graph) => {
    const waiting = graph.nodes.filter((node) => {
      const fm = node.attributes?.frontmatter;
      return fm && ["draft", "proposed"].includes(fm.status);
    });
    if (waiting.length === 0) {
      console.log("承認待ちはありません");
      return;
    }
    console.log(`承認待ち: ${waiting.length}件`);
    for (const node of waiting) {
      const fm = node.attributes.frontmatter;
      const elapsed = fm.generatedAt ? daysSince(fm.generatedAt) : null;
      const reviewers = Array.isArray(fm.reviewers) && fm.reviewers.length > 0
        ? fm.reviewers.join(", ")
        : "（確認者未設定）";
      console.log(
        `  - ${describe(node)} status=${fm.status} 確認者=${reviewers}${elapsed !== null ? ` 経過${elapsed}日` : ""}`
      );
    }
  },

  // 2. 根拠（SUPPORTED_BY）がつながっていない判断
  "unsupported-decisions": (graph) => {
    const supported = new Set(
      graph.edges.filter((edge) => edge.type === "SUPPORTED_BY").map((edge) => edge.source)
    );
    const unsupported = operationalNodes(graph, "Decision").filter(
      (node) => !supported.has(node.id)
    );
    if (unsupported.length === 0) {
      console.log("根拠のない判断はありません");
      return;
    }
    console.log(`根拠のない判断: ${unsupported.length}件`);
    for (const node of unsupported) {
      console.log(`  - ${describe(node)}`);
    }
  },

  // 3. 確認記録のない成果物（outputs/ 配下のみ対象）
  "unreviewed-artifacts": (graph) => {
    const unreviewed = operationalNodes(graph, "Artifact")
      .filter((node) => node.attributes.relativePath.startsWith("outputs/"))
      .filter((node) => {
        const fm = node.attributes.frontmatter;
        if (!fm) {
          return true;
        }
        const reviewed = ["reviewed", "published"].includes(fm.status);
        const hasReviewers = Array.isArray(fm.reviewers) && fm.reviewers.length > 0;
        return !(reviewed && hasReviewers);
      });
    if (unreviewed.length === 0) {
      console.log("確認されていない成果物はありません");
      return;
    }
    console.log(`確認されていない成果物: ${unreviewed.length}件`);
    for (const node of unreviewed) {
      const fm = node.attributes.frontmatter;
      const reason = !fm
        ? "来歴フロントマターなし"
        : !["reviewed", "published"].includes(fm.status)
          ? `status=${fm.status ?? "未設定"}`
          : "確認者なし";
      console.log(`  - ${describe(node)}（${reason}）`);
    }
  },

  // 4. あるノードに依存しているものを再帰的にたどる（BELONGS_TO は除外）
  impact: (graph) => {
    if (!values.target) {
      console.error("エラー: --target <相対パス|エンティティID> を指定してください");
      process.exit(1);
    }
    const target = graph.nodes.find(
      (node) =>
        node.attributes?.relativePath === values.target ||
        node.attributes?.entityId === values.target
    );
    if (!target) {
      console.error(`エラー: ノードが見つかりません: ${values.target}`);
      process.exit(1);
    }
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const incoming = new Map();
    for (const edge of graph.edges) {
      if (edge.type === "BELONGS_TO") {
        continue;
      }
      if (!incoming.has(edge.target)) {
        incoming.set(edge.target, []);
      }
      incoming.get(edge.target).push(edge);
    }
    console.log(`影響元: ${describe(target)}`);
    const visited = new Set([target.id]);
    let count = 0;
    const walk = (nodeId, depth) => {
      for (const edge of incoming.get(nodeId) ?? []) {
        if (visited.has(edge.source)) {
          continue;
        }
        visited.add(edge.source);
        count += 1;
        const source = nodeById.get(edge.source);
        console.log(`${"  ".repeat(depth + 1)}← [${edge.type}] ${describe(source)}`);
        walk(edge.source, depth + 1);
      }
    };
    walk(target.id, 0);
    console.log(count === 0 ? "影響先はありません" : `影響先: 合計${count}件`);
  },

  // 5. 更新が止まっている Task（下流を止めていないかも表示）
  "stale-tasks": (graph) => {
    const days = Number(values.days ?? "14");
    const dependents = new Map();
    for (const edge of graph.edges) {
      if (edge.type !== "BELONGS_TO") {
        dependents.set(edge.target, (dependents.get(edge.target) ?? 0) + 1);
      }
    }
    const stale = operationalNodes(graph, "Task")
      .map((node) => ({ node, age: daysSince(node.attributes.updatedAt) }))
      .filter((entry) => entry.age !== null && entry.age >= days)
      .sort((a, b) => b.age - a.age);
    if (stale.length === 0) {
      console.log(`${days}日以上更新のないタスクはありません`);
      return;
    }
    console.log(`${days}日以上更新のないタスク: ${stale.length}件`);
    for (const { node, age } of stale) {
      const blocked = dependents.get(node.id) ?? 0;
      console.log(
        `  - ${describe(node)} 最終更新${age}日前${blocked > 0 ? `（依存 ${blocked}件が接続）` : ""}`
      );
    }
  },

  // 6. 時間差分（既定: 最新スナップショット vs current）
  diff: (graph) => {
    const snapshotsDir = path.join(graphDir, "snapshots");
    let fromPath = values.from;
    if (!fromPath) {
      const snapshots = fs.existsSync(snapshotsDir)
        ? fs.readdirSync(snapshotsDir).filter((name) => name.endsWith(".json")).sort()
        : [];
      if (snapshots.length === 0) {
        console.error("エラー: スナップショットがありません。先に graph:snapshot を実行してください");
        process.exit(1);
      }
      fromPath = path.join(snapshotsDir, snapshots[snapshots.length - 1]);
    } else if (!fs.existsSync(fromPath)) {
      fromPath = path.join(snapshotsDir, fromPath);
    }
    const toPath = values.to
      ? fs.existsSync(values.to) ? values.to : path.join(snapshotsDir, values.to)
      : path.join(currentDir, "knowledge-graph.json");

    const before = loadGraph(fromPath);
    const after = loadGraph(toPath);

    const beforeNodes = new Map(before.nodes.map((node) => [node.id, node]));
    const afterNodes = new Map(after.nodes.map((node) => [node.id, node]));
    const added = after.nodes.filter((node) => !beforeNodes.has(node.id));
    const removed = before.nodes.filter((node) => !afterNodes.has(node.id));
    const changed = after.nodes.filter((node) => {
      const prev = beforeNodes.get(node.id);
      return prev && prev.attributes?.updatedAt !== node.attributes?.updatedAt;
    });
    const beforeEdges = new Set(before.edges.map((edge) => edge.id));
    const afterEdges = new Set(after.edges.map((edge) => edge.id));
    const addedEdges = after.edges.filter((edge) => !beforeEdges.has(edge.id));
    const removedEdges = before.edges.filter((edge) => !afterEdges.has(edge.id));

    console.log(`差分: ${before.generatedAt} → ${after.generatedAt}`);
    console.log(
      `ノード: +${added.length} / -${removed.length} / 更新${changed.length}  エッジ: +${addedEdges.length} / -${removedEdges.length}`
    );
    for (const node of added) {
      console.log(`  + ${describe(node)}`);
    }
    for (const node of removed) {
      console.log(`  - ${describe(node)}`);
    }
    for (const node of changed) {
      console.log(`  ~ ${describe(node)}`);
    }
    const nodeName = (edgeGraph, id) =>
      edgeGraph.nodes.find((node) => node.id === id)?.label ?? id;
    for (const edge of addedEdges.filter((item) => item.type !== "BELONGS_TO")) {
      console.log(`  +エッジ [${edge.type}] ${nodeName(after, edge.source)} → ${nodeName(after, edge.target)}`);
    }
    for (const edge of removedEdges.filter((item) => item.type !== "BELONGS_TO")) {
      console.log(`  -エッジ [${edge.type}] ${nodeName(before, edge.source)} → ${nodeName(before, edge.target)}`);
    }
  },
};

if (!question || !questions[question]) {
  console.error(`使い方: node scripts/graph/query.mjs <質問> [--root <path>]`);
  console.error(`質問: ${Object.keys(questions).join(" / ")}`);
  process.exit(1);
}

questions[question](loadGraph(path.join(currentDir, "knowledge-graph.json")));
