@echo off
chcp 65001 > nul
echo ===================================================
echo   あわい屋ZEROS - リリース準備自動化スクリプト
echo ===================================================
echo.
echo [1/3] ローカルビルドテストを実行中...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ❌ ビルドテストに失敗しました。プログラムにエラーがあります。
    pause
    exit /b %errorlevel%
)
echo.
echo.
echo [2/3] Gitリポジトリの初期化とコミット処理...
if not exist .git (
    echo Gitリポジトリを新規初期化します。
    git init
)
git add .
git commit -m "chore: release あわい屋ZEROSプラットフォーム" > nul 2>&1
echo Commit完了しました。
echo.
echo.
echo [3/3] リリース用の最終チェック
echo.
echo ➔ データベース構築用SQLファイルをまとめました:
echo    "supabase/supabase_setup.sql"
echo    これをSupabaseのSQL Editorにコピー＆ペーストして実行してください。
echo.
echo ➔ GitHub等に以下のコマンドでプッシュしてください:
echo    git remote add origin [あなたのGitHubリポジトリURL]
echo    git branch -M main
echo    git push -u origin main
echo.
echo ===================================================
echo 準備が整いました。上記の手順に沿ってGitHubへプッシュしてください。
pause
