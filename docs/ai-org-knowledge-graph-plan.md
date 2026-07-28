# AI組織「情報循環グラフ」導入計画（実現可能性判断つき）

記事「バラバラなAI組織を100倍賢くするグラフエンジニアリング」の提案を、あわい屋ZEROSの実環境（本リポジトリ + Dropboxコンテンツハブ + Claude Code / Antigravity）に照らして検討した結果と、段階的な導入計画。

作成: 2026-07-28 / ブランチ: `claude/ai-org-knowledge-graph-b0nmzg`

---

## 1. 結論サマリ

記事の中核である「**構造グラフの最小構成（ファイル走査 → ノード/エッジJSON → 品質テスト → 1コマンド再生成）**」は、**追加依存ゼロ・追加費用ゼロで今すぐ作れる**。記事の設計判断（本文を読まない、相対パス、manifest、証拠つきエッジ、許可リスト方式）は技術的に妥当で、そのまま採用してよい。

一方、記事の後半（GraphRAG、常駐監視、自動再配分）は**この環境単体では実現できない**か、費用・運用体制が必要になる。「できる/できない」の線引きは環境の制約で決まるため、まずそれを明確にする。

## 2. できること / できないこと

### ✅ この環境（リモートセッション）で今できること

| 項目 | 根拠 |
|---|---|
| グラフ生成ツール一式の実装（走査→ノード/エッジ→JSON→検証→HTML） | Node.js標準モジュールのみで可。記事のコードはほぼそのまま使える |
| 本リポジトリ自身を対象にした実走査・動作確認 | `docs/` `supabase/` `src/` `scripts/` が既にあり、題材として十分 |
| `npm run graph` の1コマンド化・manifest・相対パス設計 | package.json に scripts を足すだけ |
| 品質テスト（孤立ノード・壊れたエッジ・壊れたパス） | 純粋なJSON処理 |
| 来歴フロントマター規約・エッジ語彙（8種）の策定 | ドキュメント作業 |
| HTML可視化（自己完結・CDN不使用のSVG描画） | 外部ライブラリなしで実装可能 |

### ⚠️ 条件つきでできること

| 項目 | 条件 |
|---|---|
| Dropboxハブ（`あわい屋ZEROSのコンテンツ`）の走査 | このリモート環境にはハブのファイルが存在しない。**ツールをルートディレクトリ引数つきで作り、ZEROSのローカルPC（Claude Code ローカル / Antigravity）で実行する** |
| 定期自動更新 | コンテナはエフェメラルで常駐不可。ローカルのタスクスケジューラか、リポジトリ内ファイル限定なら GitHub Actions で代替 |
| 限定本文解析（判断記録からの決定/根拠/却下の抽出） | AI呼び出しの費用と、抽出結果を「候補+証拠つき」で扱う運用が前提。許可リスト方式（フォルダ×拡張子×最大8KB）を先に固める |
| グラフのDB保存（Supabase） | 当面**不要**（JSONファイルで十分）。入れる場合は本番DB書き込みルール（ZEROSの了承 + service_role キー都度受領）に従う |

### ❌ できないこと（今はやらないと判断）

| 項目 | 理由 |
|---|---|
| チャット履歴の自動取り込み | Claude Code / Antigravity の会話ログは構造化エクスポートの対象外。**代替: 作業の節目に `decisions/` へ判断記録を人間/AIが書き残す運用**にする（記事の主張どおり、チャットは組織の記憶ではない） |
| GraphRAG（意味検索・埋め込み） | 安定ID・来歴・時間の基盤がまだない。記事30節のとおり基礎の後。API費用とキー管理も必要 |
| 仕事の自動再配分 | 記事37節のとおり、品質の低いグラフで自動化すると誤分類が組織に広がる。提案表示まで |
| 100体規模の並列エージェント運用 | 費用対効果の検証前。記事28節の「20件から」を踏襲 |

## 3. 設計判断

### 3.1 グラフの置き場所と対象

- **ツール本体はこのリポジトリの `scripts/graph/` に置く**（バージョン管理・レビュー・1コマンド化のため）。
- **走査対象はルート引数で切り替える**: `node scripts/graph/build.mjs --root <path>`。
  - 既定 = リポジトリ自身（`docs/` `supabase/` `src/` など）→ リモート環境でも動作確認できる。
  - ローカル実行時 = Dropboxハブ → 本命の「AI組織の記憶」対象。
- 出力は `graph/`（走査対象ルート直下）: `staging/<runId>/` で生成 → 全成功後に `current/` へ移動。`current/` は gitignore（生成物はコミットしない。manifest だけ必要ならコミット可）。

### 3.2 最小データ構造（記事準拠）

- ノード: `{ id, type, label, attributes: { relativePath, size, updatedAt } }`
  - `id` = `file_` + sha256(relativePath) 先頭20桁。**絶対パスは保存しない**。
  - `type` はフォルダ位置で判定: `notes/`→Note, `decisions/`→Decision, `tasks/`→Task, `outputs/`→Artifact, `references/`→Reference, その他→File。**分からないものは未分類のまま**（誤分類より安全）。
- エッジ: `{ id, type, source, target, evidence, confidence, validFrom, validTo }`
  - 初期は `BELONGS_TO`（ファイル↔フォルダ）のみ。
  - 意味エッジは8種に限定: `SUPPORTED_BY`(根拠) / `CONTRADICTED_BY`(反証) / `ADOPTED`(採用) / `REJECTED`(却下) / `DEPENDS_ON`(依存) / `SUPERSEDES`(置換) / `AWAITING_APPROVAL`(承認待ち) / `GENERATED_FROM`(生成元)。
  - `evidence.kind` ∈ {frontmatter, explicit_link, folder_location, filename, ai_extraction, human_confirmed}。**人間の明示とAIの推測を同格に扱わない**。
- manifest: `{ runId, generatedAt, counts, artifacts: { json/html それぞれ path + sha256 } }`。件数は常にJSONから読む（画像やHTMLへの直書き禁止）。

### 3.3 来歴フロントマター規約（成果物側）

Markdown成果物の先頭に付ける（ハブの教材・記事・判断記録が主対象）:

```yaml
---
artifactId: artifact_XXXX      # 場所と同一性を分離。移動しても同じ成果物
taskId: task_XXXX
owner: <担当（人 or エージェント名）>
reviewers: [ ... ]
sources: [ reference_XXX, decision_XXX ]
status: draft | reviewed | published | superseded
supersedes: artifact_YYYY      # 置換時のみ
generatedAt: <ISO8601>
classification: public | internal | owner_only
---
```

グラフ生成時、フロントマターがあるファイルは `evidence.kind=frontmatter` で意味エッジを張れる（本文推測より強い証拠）。

### 3.4 本リポジトリ固有のマッピング

ハブに `notes/ decisions/ tasks/ outputs/ references/` を新設するのが本命だが、本リポジトリでも既存構造をそのまま型に写せる:

| 既存 | 型 |
|---|---|
| `docs/*.md` | Reference / Decision（設計判断） |
| `supabase/QUIZ_ROLLOUT_PLAN.md` | Task（残作業インベントリ） |
| `supabase/seed_*.sql`, `supabase/quiz_pv/*.sql` | Artifact |
| `supabase/migrations/*.sql` | Artifact（時系列・置換関係あり） |

これにより「正本= `seed_ai_quiz_per_video.sql`、旧 `seed_ai_quiz.sql` は廃止」のような**すでに文章でしか管理されていない置換関係**を `SUPERSEDES` エッジとして機械可読にできる。これが本リポジトリでの最初の実益。

## 4. 段階計画

### Phase 1: 最小構成（記事34節の週末版）— 次のPRで実装

1. `scripts/graph/build.mjs` — 走査（`--root` 引数、`node_modules`/`.git`/`.next` 除外）→ ノード/エッジ生成 → `staging/` → 検証 → `current/` へ原子的に移動 + manifest
2. `scripts/graph/validate.mjs` — 孤立ノード・壊れたエッジ・壊れたパス検出。結果もJSONで保存
3. `scripts/graph/render.mjs` — 自己完結HTML（外部CDNなし）で一覧+簡易グラフ表示
4. `package.json` に `graph:build` / `graph:validate` / `graph:render` / `graph`（全部実行）を追加
5. `.gitignore` に `graph/` を追加

完成条件（記事34節そのまま）: 指定フォルダ走査 / ファイル→ノード / フォルダ→エッジ / JSON生成 / 件数表示 / 孤立ノード表示 / 相対パス / 1コマンド再生成。

### Phase 2: ハブへの展開（ZEROSのローカル作業が必要）

> ツール（`graph:init` / `run-all` の `--root` 対応）とテンプレートは実装済み。ローカル手順は `docs/ai-org-knowledge-graph-phase2-guide.md` を参照。

1. ハブ直下に `notes/ decisions/ tasks/ outputs/ references/` を整備（大分類だけでよい）
2. ローカルで `node scripts/graph/build.mjs --root <ハブのパス>` を実行し、情報地図を得る
3. 以後、AI作業の節目に `decisions/` へ判断記録（決定・根拠・却下案・担当）を書く運用を開始 — **チャット履歴の代替はこの運用**
4. 新規成果物に来歴フロントマターを付与（platform-deploy / zeros-quiz-rollout スキルの手順にも追記）

### Phase 3: 意味エッジと質問機能

> 実装済み。意味エッジは `scripts/graph/semantics.mjs`（許可リスト: `decisions/ tasks/ outputs/` の `.md` 先頭8KBのフロントマターのみ、本文推測なし）。質問は `npm run graph:query -- <質問>`（awaiting-approval / unsupported-decisions / unreviewed-artifacts / impact / stale-tasks / diff）、スナップショットは `npm run graph:snapshot`。

1. フロントマター（`sources` / `supersedes` / `reviewers`）から意味エッジを生成
2. 質問機能5種（記事29節）: 承認待ち / 根拠なし判断 / 未確認成果物 / 変更の影響先 / 長期停滞タスク — いずれも `current/knowledge-graph.json` への純JSONクエリで実装可能
3. 日次スナップショットと時間差分（`validFrom`/`validTo`）

### Phase 4: 限定本文解析・GraphRAG（基盤が回ってから）

- 許可リスト（`decisions/` `tasks/` `outputs/` × `.md .txt .json` × 8KB上限）内のみAI抽出。結果は候補+証拠+信頼度で保存し、確定情報として扱わない
- GraphRAG は安定ID・来歴・時間が揃った後に判断（費用試算とキー管理方針が前提）

## 5. 記事への評価メモ

- **妥当**: 「本文を読まない構造グラフから始める」「誤った意味グラフは正しそうに見えるから危険」「未分類を許す」「manifest で生成物の混在を防ぐ」— いずれも実運用の落とし穴を正しく突いている。
- **本環境での最大の制約**: 記事が前提とする「AIの仕事が全部ファイルとして残る」状態がまだない。グラフ以前に **`decisions/` へ判断を書き残す運用**（Phase 2-3）が成否を分ける。ツールは週末で作れるが、記憶になるかは運用次第。
- **やらないと決めたこと**: チャットログの自動取込・自動再配分・大規模並列は、費用/品質/安全のいずれかで現時点では割に合わない（§2参照）。
