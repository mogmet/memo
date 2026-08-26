#!/usr/bin/env bash
# codex exec をスレッド（セッション）単位で使い分けるラッパー。
# 同じスレッド名で呼ぶと前回セッションを resume するため、
# Generator(実装) と Validator(検証) の文脈を混ぜずに会話を継続できる。
#
# 使い方: scripts/codex-thread.sh <A|B> "<プロンプト>"
#   A     = Generator 用スレッド（実装。feedback修正も同じスレッドで行う）
#   B     = Codex Validator 用スレッド（実コード検証。実装者の記憶を持たない）
#   reset = 全スレッドの状態を破棄（新しい機能に取りかかる前に実行）
#
# 注意: `codex exec resume` は `-C/--cd` と `-s/--sandbox` を受け付けない（0.149.1 時点）。
#       そのため cwd は cd で合わせ、サンドボックスは -c sandbox_mode で指定している。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$ROOT/.claude/pipeline"
mkdir -p "$STATE_DIR"

THREAD="${1:?usage: codex-thread.sh <A|B|reset> [prompt]}"

if [[ "$THREAD" == "reset" ]]; then
  rm -f "$STATE_DIR"/thread-*.session "$STATE_DIR"/thread-*.last.md "$STATE_DIR"/thread-*.jsonl \
        "$STATE_DIR"/claude-verdict.md "$STATE_DIR"/codex-verdict.md "$STATE_DIR"/feedback.md
  echo "pipeline state cleared."
  exit 0
fi

PROMPT="${2:?prompt required}"
SESSION_FILE="$STATE_DIR/thread-$THREAD.session"
LAST_MSG="$STATE_DIR/thread-$THREAD.last.md"
LOG="$STATE_DIR/thread-$THREAD.jsonl"
SANDBOX="${CODEX_SANDBOX:-workspace-write}"

CODEX_BIN="${CODEX_BIN:-codex}"
if ! command -v "$CODEX_BIN" >/dev/null 2>&1; then
  echo "error: codex CLI が見つかりません。'brew reinstall codex' などで導入してください。" >&2
  exit 127
fi

cd "$ROOT"

# --json: thread_id をログから拾うため / --output-last-message: 最終回答だけを取り出すため
COMMON=(--json --output-last-message "$LAST_MSG" --skip-git-repo-check)

if [[ -s "$SESSION_FILE" ]]; then
  # resume は --sandbox を取らないので config 上書きで渡す
  "$CODEX_BIN" exec resume "$(cat "$SESSION_FILE")" "${COMMON[@]}" \
    -c "sandbox_mode=\"$SANDBOX\"" "$PROMPT" >"$LOG" 2>&1 || {
    echo "error: codex exec resume が失敗しました。ログ: $LOG" >&2; exit 1; }
else
  "$CODEX_BIN" exec "${COMMON[@]}" --sandbox "$SANDBOX" "$PROMPT" >"$LOG" 2>&1 || {
    echo "error: codex exec が失敗しました。ログ: $LOG" >&2; exit 1; }
  # thread_id をログから拾って保存し、次回 resume できるようにする
  grep -oE '"(thread_id|session_id|conversation_id)"[[:space:]]*:[[:space:]]*"[^"]+"' "$LOG" \
    | head -1 | sed -E 's/.*"([^"]+)"$/\1/' >"$SESSION_FILE" || true
  if [[ ! -s "$SESSION_FILE" ]]; then
    echo "warn: セッションIDを取得できませんでした。次回は新規セッションになります。" >&2
  fi
fi

# 呼び出し元（オーケストレーター）には最終回答だけを返す
cat "$LAST_MSG"
