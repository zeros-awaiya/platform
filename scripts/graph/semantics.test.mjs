// semantics.mjs / query.mjs の試験: 機械的な写し（frontmatter operational: false）は所見の対象にしない（2026-10-08）
// 使い方: npm run graph:test（一時ディレクトリだけを使い、本物の Dropbox には書かない）
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const buildScript = fileURLToPath(new URL("./build.mjs", import.meta.url));
const queryScript = fileURLToPath(new URL("./query.mjs", import.meta.url));

function hub(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "graph-semantics-test-"));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text, "utf8");
  }
  const b = spawnSync(process.execPath, [buildScript, "--root", root], { encoding: "utf8" });
  assert.equal(b.status, 0, b.stderr);
  const q = (question) => spawnSync(process.execPath, [queryScript, question, "--root", root], { encoding: "utf8" }).stdout;
  return { root, q, done: () => fs.rmSync(root, { recursive: true, force: true }) };
}

const copy = (id) => `---\ndecisionId: ${id}\nstatus: proposed\nsources: []\noperational: false\ngenerated_by: daily-records\n---\n\n# 写し\n`;
const hand = "---\ndecisionId: decision_hand\nstatus: proposed\nsources: []\n---\n\n# 手書き\n";

test("写し（operational: false）は承認待ち・根拠のない判断に出ない／手書きの判断は従来どおり出る", () => {
  const h = hub({ "decisions/decision_20261001_e1.md": copy("decision_20261001_e1"), "decisions/decision_20261001_e2.md": copy("decision_20261001_e2"), "decisions/hand.md": hand });
  try {
    const waiting = h.q("awaiting-approval");
    assert.match(waiting, /承認待ち: 1件/);
    assert.match(waiting, /decisions\/hand\.md/);
    assert.doesNotMatch(waiting, /decision_20261001/);
    const unsupported = h.q("unsupported-decisions");
    assert.match(unsupported, /根拠のない判断: 1件/);
    assert.doesNotMatch(unsupported, /decision_20261001/);
  } finally { h.done(); }
});

test("否定対照: 印の無い写し（operational を書き忘れた）は従来どおり所見に出る", () => {
  const h = hub({ "decisions/decision_20261001_e1.md": copy("decision_20261001_e1").replace("operational: false\n", "") });
  try {
    assert.match(h.q("awaiting-approval"), /承認待ち: 1件/);
    assert.match(h.q("unsupported-decisions"), /根拠のない判断: 1件/);
  } finally { h.done(); }
});

test("写しのIDも解決の対象: 手書きのノートが写しのIDを sources で指しても未解決参照にならない（独立再レビュー 6）", () => {
  const cite = "---\ndecisionId: decision_hand2\nstatus: approved\nsources: [decision_20261001_e1]\n---\n\n# 写しを根拠にした手書き\n";
  const h = hub({ "decisions/decision_20261001_e1.md": copy("decision_20261001_e1"), "decisions/hand2.md": cite });
  try {
    const graph = JSON.parse(fs.readFileSync(path.join(h.root, "graph", "current", "knowledge-graph.json"), "utf8"));
    assert.deepEqual(graph.quality.unresolvedReferences, [], "★ 写しのIDを指した参照が未解決になっている");
    assert.ok(graph.edges.some((e) => e.type === "SUPPORTED_BY"), "写しへの根拠のエッジが張られていない");
    // 写しは所見に出ないまま（承認待ち 0件）
    assert.doesNotMatch(h.q("awaiting-approval"), /decision_20261001/);
    // 否定対照: 存在しないIDを指せば従来どおり未解決に出る（検査が空振りしていない）
    const h2 = hub({ "decisions/hand2.md": cite });
    try {
      const g2 = JSON.parse(fs.readFileSync(path.join(h2.root, "graph", "current", "knowledge-graph.json"), "utf8"));
      assert.equal(g2.quality.unresolvedReferences.length, 1);
    } finally { h2.done(); }
  } finally { h.done(); }
});
