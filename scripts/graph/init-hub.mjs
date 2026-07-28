// ハブ初期化: 標準5フォルダ + README + テンプレートを作成する（冪等・既存ファイルは上書きしない）
// 使い方: node scripts/graph/init-hub.mjs --root <ハブのパス>
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { resolveRoot } from "./lib.mjs";

const { values } = parseArgs({ options: { root: { type: "string" } } });
if (!values.root) {
  console.error("エラー: --root <ハブのパス> を指定してください（誤爆防止のため必須）");
  process.exit(1);
}
const rootDir = resolveRoot(values.root);

const DECISION_TEMPLATE = `---
decisionId: decision_XXXX
taskId: task_XXXX
owner:
reviewers: []
sources: []
status: proposed
generatedAt: YYYY-MM-DDTHH:MM:SS+09:00
classification: internal
---

# 判断: （タイトル）

## 決定

## 根拠
（参照した資料・数字。sources にもIDを列挙する）

## 反対意見・リスク

## 却下した案と理由

## 次の作業
`;

const ARTIFACT_TEMPLATE = `---
artifactId: artifact_XXXX
taskId: task_XXXX
owner:
reviewers: []
sources: []
status: draft
supersedes:
generatedAt: YYYY-MM-DDTHH:MM:SS+09:00
classification: internal
---

# （成果物タイトル）
`;

// フォルダ名 → [README本文, テンプレート]
const FOLDERS = {
  notes: ["作業メモ・気づき。形式自由。", null],
  decisions: [
    "判断記録。AI作業の節目（採用/却下/方針決定）ごとに _TEMPLATE.md を複製して書く。チャット履歴の代わりに組織の記憶になる場所。",
    DECISION_TEMPLATE,
  ],
  tasks: ["タスク情報・残作業インベントリ。", null],
  outputs: [
    "成果物。新規作成時は _TEMPLATE.md の来歴フロントマターを先頭に付ける。更新は上書きせず version を上げ、supersedes で旧版を指す。",
    ARTIFACT_TEMPLATE,
  ],
  references: ["参考資料・一次情報。", null],
};

let created = 0;
let skipped = 0;

function writeIfAbsent(filePath, content) {
  if (fs.existsSync(filePath)) {
    skipped += 1;
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`作成: ${path.relative(rootDir, filePath)}`);
  created += 1;
}

for (const [folder, [readme, template]] of Object.entries(FOLDERS)) {
  const dir = path.join(rootDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  writeIfAbsent(path.join(dir, "README.md"), `# ${folder}\n\n${readme}\n`);
  if (template) {
    writeIfAbsent(path.join(dir, "_TEMPLATE.md"), template);
  }
}

console.log(`初期化完了: ${rootDir}（作成 ${created}件 / 既存スキップ ${skipped}件）`);
console.log(`次: node scripts/graph/run-all.mjs --root "${rootDir}" でグラフを生成`);
