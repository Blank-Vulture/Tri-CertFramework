#!/bin/bash

SESSION_NAME="tri-cert-dev"

# ポートを使用しているプロセスをkillする関数
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pids" ]; then
        echo "Killing existing process(es) on port $port: $pids"
        kill -9 $pids 2>/dev/null || true
        sleep 1
    fi
}

# 主要ポートをクリーンアップ
cleanup_ports() {
    echo "Cleaning up ports..."
    kill_port 3000  # prover (Next.js)
    kill_port 3001  # verifier-ui (Next.js)
    kill_port 5173  # executive-console (Vite)
    kill_port 5174  # registrar-console (Vite)
    kill_port 34115 # wails default port
    echo "Port cleanup completed."
}

# セッションが既に存在する場合はアタッチして終了
tmux has-session -t $SESSION_NAME 2>/dev/null
if [ $? == 0 ]; then
    echo "Session $SESSION_NAME already exists. Attaching..."
    tmux attach -t $SESSION_NAME
    exit 0
fi

# 既存プロセスをクリーンアップ
cleanup_ports

# プロジェクトルートの絶対パスを取得
PROJECT_ROOT=$(pwd)
PROVER_DIR="$PROJECT_ROOT/prover"
VERIFIER_UI_DIR="$PROJECT_ROOT/verifier-ui"
REGISTRAR_DIR="$PROJECT_ROOT/registrar-console"
EXECUTIVE_DIR="$PROJECT_ROOT/executive-console"
GO_CACHE_DIR="$PROJECT_ROOT/.gocache"

# 1. セッション作成 (Pane 0: Prover)
tmux new-session -d -s $SESSION_NAME -n 'dev-servers' -c "$PROVER_DIR"

# 2. Verifier UI (Pane 1) - 画面を左右に分割
tmux split-window -h -t $SESSION_NAME:0.0 -c "$VERIFIER_UI_DIR"

# 3. Registrar Console (Pane 2) - 左ペインを上下分割
tmux split-window -v -t $SESSION_NAME:0.0 -c "$REGISTRAR_DIR"

# 4. Executive Console (Pane 3) - 右ペインを上下分割
tmux split-window -v -t $SESSION_NAME:0.1 -c "$EXECUTIVE_DIR"

# --- コマンド実行 ---

# Pane 0 (Top-Left): Prover
tmux send-keys -t $SESSION_NAME:0.0 "cd \"$PROVER_DIR\" && npm run dev" C-m

# Pane 1 (Top-Right): Verifier UI
tmux send-keys -t $SESSION_NAME:0.1 "cd \"$VERIFIER_UI_DIR\" && npm run dev" C-m

# Pane 2 (Bottom-Left): Registrar Console
# wailsのポート競合も考慮してリトライ可能な起動コマンド
tmux send-keys -t $SESSION_NAME:0.2 "cd \"$REGISTRAR_DIR\" && GOCACHE=\"$GO_CACHE_DIR\" wails dev" C-m

# Pane 3 (Bottom-Right): Executive Console
# 依存関係インストール確認も含める
tmux send-keys -t $SESSION_NAME:0.3 "cd \"$EXECUTIVE_DIR\" && npm run dev:desktop" C-m

# マウス操作を有効にする
tmux set-option -g mouse on

# セッションにアタッチ
echo "All services started. Attaching to tmux session..."
sleep 2
tmux attach -t $SESSION_NAME
