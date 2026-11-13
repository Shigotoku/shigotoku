#!/usr/bin/env bash
# PreDeck 起動スクリプト (WSL / Linux)
# Windows版 start.bat の WSL 移植

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR="$SCRIPT_DIR/.venv"

echo
echo "================================================"
echo "   PreDeck  起動中..."
echo "================================================"
echo

# -------- 環境チェック --------
if [ ! -d "$VENV_DIR" ] || [ ! -f "$VENV_DIR/.libs_installed" ]; then
    echo "[エラー] セットアップが完了していません。"
    echo "   先に  ./setup.sh  を実行してください。"
    exit 1
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

URL="http://localhost:8000"
PORT=8000

# -------- ブラウザを 2 秒後に開く（バックグラウンド） --------
open_browser() {
    sleep 2
    if command -v wslview >/dev/null 2>&1; then
        wslview "$URL"
    elif command -v powershell.exe >/dev/null 2>&1; then
        # WSL から Windows 側既定ブラウザを開く
        powershell.exe -NoProfile -Command "Start-Process '$URL'" 2>/dev/null
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$URL"
    else
        echo "[情報] 自動でブラウザを開けませんでした。手動で $URL にアクセスしてください。"
    fi
}

# NO_OPEN=1 ./start.sh でブラウザ自動起動を抑制
if [ "${NO_OPEN:-0}" != "1" ]; then
    open_browser &
fi

echo "  ブラウザで $URL を開きます..."
echo "  終了するには Ctrl+C を押してください"
echo

# -------- サーバー起動 --------
# main.py の __main__ ブロックではなく uvicorn を直接呼ぶことで
# reload 時の sys.path 問題を回避し、Ctrl+C のシグナル処理も素直になる。
exec python -m uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload
