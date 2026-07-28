# 情報循環グラフ Phase 2: Dropboxハブ展開ガイド（ローカル作業手順）

Phase 2 は Dropboxハブ（`あわい屋ZEROSのコンテンツ`）が対象のため、**ZEROSのローカルPCで実行する**。リモートセッションからはハブに触れない（計画 `docs/ai-org-knowledge-graph-plan.md` §2 参照）。ツールはすべて本リポジトリに用意済みなので、作業はコマンド2つ + 運用開始のみ。

## 1. ハブの初期化（1回だけ）

本リポジトリのローカルクローンのフォルダで:

```bash
npm run graph:init -- --root "<ハブのパス>"
# 例(Windows): npm run graph:init -- --root "C:\Users\zeros\Dropbox\あわい屋ZEROSのコンテンツ"
```

ハブ直下に標準5フォルダと README・テンプレートができる（既存ファイルは一切上書きしない・冪等）:

```text
notes/        作業メモ
decisions/    判断記録（_TEMPLATE.md 付き）← 組織の記憶の中核
tasks/        タスク・残作業
outputs/      成果物（来歴フロントマターの _TEMPLATE.md 付き）
references/   参考資料
```

既存の教材フォルダ等は移動しなくてよい。グラフはそのまま走査し、未分類（File型）として地図に載る。

## 2. グラフ生成

```bash
npm run graph -- --root "<ハブのパス>"
```

`<ハブのパス>/graph/current/` に生成される:

| ファイル | 内容 |
|---|---|
| `knowledge-graph.json` | ノード/エッジ本体（相対パスのみ・別PCでも有効） |
| `validation-report.json` | 品質テスト結果（孤立ノード・壊れたエッジ/パス） |
| `knowledge-graph.html` | ブラウザで開ける可視化（自己完結） |
| `manifest.json` | runId・件数・各生成物の sha256 |

⚠️ `graph/` はハブ側に生成されるため Dropbox 同期に載る。問題があれば Dropbox の選択同期で `graph/` を除外する。

## 2.5 質問機能（Phase 3 実装済み）

グラフ生成後、次の定型質問に答えられる:

```bash
npm run graph:query -- awaiting-approval --root "<ハブのパス>"      # 承認待ち（誰の確認を何日待っているか）
npm run graph:query -- unsupported-decisions --root "<ハブのパス>"  # 根拠のない判断
npm run graph:query -- unreviewed-artifacts --root "<ハブのパス>"   # 確認記録のない成果物
npm run graph:query -- impact --target references/xx.md --root "<ハブのパス>"  # 変更の影響先
npm run graph:query -- stale-tasks --days 14 --root "<ハブのパス>"  # 停滞タスク
npm run graph:snapshot -- --root "<ハブのパス>"                     # 日次スナップショット
npm run graph:query -- diff --root "<ハブのパス>"                   # 前回スナップショットとの差分
```

フロントマターの `sources` / `supersedes` / `taskId` から意味エッジ（根拠・生成元・置換）が自動生成される。解決できない参照は検証レポートに「未解決の参照」として出るので、IDの書き間違いに気づける。

## 3. 運用ルール（ここが本体）

ツールより重要。この2つが回らないとグラフは記憶にならない。

### 3.1 判断記録（チャット履歴の代替）

AI作業の節目（採用・却下・方針決定）ごとに `decisions/_TEMPLATE.md` を複製し、決定・根拠・反対意見・却下案を書く。ファイル名は `YYYYMMDD-<内容>.md`（例: `20260728-quiz-template-unification.md`）。

- Claude Code / Antigravity に作業を依頼するとき、締めに「判断記録を decisions/ に書いて」まで含めるのが確実。
- チャットで決まったことは、チャットに置いたままにしない。

### 3.2 来歴フロントマター

新規成果物（教材・記事など）は `outputs/_TEMPLATE.md` の YAML を先頭に付ける。更新時は上書きせず `version` を上げ、`supersedes` に旧版の artifactId を書く。

### 3.3 スキルへの追記（ローカル作業）

以下はハブ / `~/.claude` 側にあるため、ローカルで追記する:

- `platform-deploy` スキル: DB/Storage投入の完了時に「判断記録を decisions/ へ」「成果物に来歴フロントマター」を手順に追加
- `zeros-quiz-rollout` スキル: 同上（クイズ反映の採否判断を decisions/ に残す）

## 4. 定期実行（任意）

Windows タスクスケジューラで日次実行する場合の登録例:

```text
プログラム: cmd.exe
引数: /c cd /d "<リポジトリのパス>" && npm run graph -- --root "<ハブのパス>" >> graph-run.log 2>&1
```

計画 §2 のとおりリモートコンテナでの常駐は不可。ローカルスケジューラが正攻法。実行後は `manifest.json` の `generatedAt` が新しいことを確認する（「起動を試した」と「正常稼働」を分ける）。

## 5. 完了条件

- [ ] ハブに標準5フォルダとテンプレートがある
- [ ] `npm run graph -- --root <ハブ>` が成功し、HTML で情報地図が見える
- [ ] 最初の判断記録が `decisions/` に1件以上ある
- [ ] 新規成果物に来歴フロントマターが付いている
- [ ] （任意）定期実行が登録され、`generatedAt` が更新されている

ここまで回り始めたら Phase 3（フロントマターからの意味エッジ生成・質問機能）に進める。
