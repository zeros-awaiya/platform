# Claude Code on the web（リモート実行環境）でのセットアップ

このリポジトリのリモートセッションでスキルを使う前に、以下を1回実行する。
（コンテナはセッションごとに作り直されるため、新しいセッションでは再実行が必要）

```bash
# 1. Python依存関係（playwright はプリインストール済み Chromium のリビジョンに合わせる）
#    /opt/pw-browsers に chromium-1194 がある場合は playwright==1.56
ls /opt/pw-browsers   # chromium-XXXX のリビジョンを確認
pip3 install "playwright==1.56" beautifulsoup4

# 2. Chromium にエージェントプロキシのCAを信頼させる（TLS再終端対策）
apt-get update && apt-get install -y libnss3-tools
certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n ccr-agent-proxy \
  -i /root/.ccr/agent-proxy-ca.crt
```

注意:

- `playwright install` は実行しないこと（環境ポリシー）。Chromiumは
  `/opt/pw-browsers` にプリインストール済みで、`PLAYWRIGHT_BROWSERS_PATH` が設定済み。
- Pythonのplaywrightのバージョンとプリインストール済みChromiumリビジョンの対応が
  ずれると `playwright install` を促すエラーになる。その場合は
  `python3 -c "from playwright.sync_api import sync_playwright;\nwith sync_playwright() as p: print(p.chromium.executable_path)"`
  が `/opt/pw-browsers` 内の既存ディレクトリを指すバージョンをpipで選ぶ。
- クローン対象サイトが組織のネットワークポリシーで許可されている必要がある
  （拒否時は `net::ERR_TUNNEL_CONNECTION_FAILED`）。ブロックされる場合は
  Claude Code on the web の環境設定でネットワークポリシーを調整する。
