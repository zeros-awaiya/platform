# あわい屋ZEROS - 本番環境デプロイメント ＆ データベース常時起動（Keep-Alive）設定手順書

本プラットフォームを本番環境（ホスティング：Vercel、データベース：Supabase）へデプロイし、無料枠のまま休止させることなく永続的に稼働させるための手順書です。

---

## Step 1: Supabase（データベース）のセットアップ

1. **Supabase アカウント作成とプロジェクトの新規追加**
   * [Supabase](https://supabase.com/) にアクセスしログインします。
   * 新しいプロジェクト（New Project）を作成します。
   * **重要**: データベースの設置場所（Region）で **「Tokyo (ap-northeast-1)」** を選択してください。
2. **テーブルスキーマ（マイグレーション）の適用**
   * 作成したプロジェクトのダッシュボードから `SQL Editor` を開きます。
   * 新しいクエリを作成し、本プロジェクトの [20260609000000_init.sql](file:///c:/Users/admin/Dropbox/ZEROS/あわい屋ZEROSの学習プラットフォーム/supabase/migrations/20260609000000_init.sql) の内容をコピー＆ペーストして実行（Run）します。
3. **初期データ（seed）の投入**
   * 同様に SQL Editor で新しいクエリを開き、[seed.sql](file:///c:/Users/admin/Dropbox/ZEROS/あわい屋ZEROSの学習プラットフォーム/supabase/seed.sql) の内容を貼り付けて実行します。これでテスト用の組織、受講者、管理者の初期アカウントや学習コンテンツが投入されます。
4. **APIキーと接続URLの取得**
   * プロジェクト設定（`Project Settings`） ➔ `API` から以下を取得して控えておきます。
     * `Project URL`
     * `anon` `public` API Key

---

## Step 2: Next.js アプリのデプロイ（Vercel等のホスティング）

1. **GitHub 等へのソースコードのプッシュ**
   * ソースコード全体をリポジトリ（GitHubなど）にプッシュします。
2. **ホスティング環境（例：Vercel）へのインポート**
   * Vercelにログインし、対象のリポジトリをインポートしてプロジェクトを作成します。
3. **本番環境変数（Environment Variables）の設定**
   * デプロイ設定画面の `Environment Variables` にて、以下の2つの変数を追加します。値は Step 1 で取得したものを入力します。
     * `NEXT_PUBLIC_SUPABASE_URL` = (取得した Project URL)
     * `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (取得した anon キー)
4. **デプロイの実行**
   * `Deploy` ボタンを押し、デプロイが正常に成功することを確認します。発行されたアプリの公開ドメイン（例：`https://zeros-learning.vercel.app`）を控えます。

---

## Step 3: データベース常時起動（Keep-Alive）設定

Supabaseの無料プランでは「1週間データベースにクエリが発生しないと自動的に休止状態になる」仕様があります。これを防ぐため、新設したヘルスチェックAPIを利用して定期的な自動アクセスを設定します。

1. **UptimeRobot（無料の監視サービス）への登録**
   * [UptimeRobot](https://uptimerobot.com/) にアクセスし、無料アカウント（Free Plan）を作成します。
2. **新しい監視モニター（Monitor）の追加**
   * ダッシュボード右上にある **「Add New Monitor」** ボタンをクリックします。
3. **モニター設定の入力**
   * **Monitor Type**: `HTTP(s)` を選択。
   * **Friendly Name**: `あわい屋ZEROS DB Keep-Alive` など（任意の名前）。
   * **URL (or IP)**: あなたのアプリの公開URLの末尾に `/api/health` を付加したアドレスを入力します。
     * 例: `https://zeros-learning.vercel.app/api/health`
   * **Monitoring Interval**: `Every 30 minutes`（30分おき）または `Every 5 minutes`（5分おき）に設定します。
4. **保存とアクティブ確認**
   * **「Create Monitor」** をクリックして保存します。
   * これにより、UptimeRobotから定期的に自動リクエストが走り、**データベース接続クエリが確実に実行され続けるため、完全無料のまま休止状態に入るのを永続的に防止**します。同時に、システムがダウンした際にはUptimeRobotからメールで即時通知が届くため、運用の安全性が向上します。
