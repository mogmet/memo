---
description: Planner(Claude) → Generator(Codex/thread A) → Dual Validator(Claude×Codex/thread B) → Aggregator で機能を実装するパイプライン。修正ループは最大3回。
---

以下の要件を、Claude と Codex の「違う目」を組み合わせたパイプラインで実装する。
あなた（メイン）はオーケストレーターに徹する。自分では実装・レビュー・裁定をしない。

要件: $ARGUMENTS

## 前提

- Codex は `scripts/codex-thread.sh <A|B> "<プロンプト>"` で呼ぶ。
  - **thread A** = Generator（実装）。feedback 修正も同じ A で行う（実装の文脈を保つ）
  - **thread B** = Codex Validator（検証）。A とは別セッション。実装者の記憶を持たない目で検証させる
- エージェント間の受け渡しは**ファイル経由**（`.claude/plans/`・`.claude/pipeline/`）。コンテキストを汚さない。
- 新しい機能に取りかかる前に `scripts/codex-thread.sh reset` で前回のスレッド状態を破棄する。

## 手順

1. **リセット**: `scripts/codex-thread.sh reset` を実行する。

2. **Planner（Claude）** サブエージェントを呼ぶ。
   - 上記要件を渡し、計画ファイル（`.claude/plans/<機能名>.md`）を作らせる。
   - 計画をユーザーに提示し、**承認を得る**。修正指示があれば Planner に戻す。

3. **Generator（Codex / thread A）** を Bash で呼ぶ。プロンプトは自己完結させること
   （Codex はこの会話を見ていない。計画ファイルのパス・既存の型や規約・commit 方針を明示する）:

```bash
scripts/codex-thread.sh A "あなたはこのリポジトリ（TypeScript + React + Vite / Express のメモアプリ）の実装担当です。.claude/plans/<機能名>.md を読み、ユーザーストーリーを1つずつ実装して、ストーリー単位で git commit してください。計画に無い機能追加やリファクタはしない。既存の型（src/types.ts の Memo）・命名・記法に合わせる。npm run build が通ることを確認してから commit すること。完了したら、変更したファイル一覧と満たした受け入れ条件を報告してください。"
```

4. **Dual Validator** を並列で呼ぶ（1メッセージで2つのツール呼び出しを同時に発行する）:
   - **claude-validator** サブエージェント: 計画ファイルのパスと変更ファイル一覧を渡す。
     仕様・設計・論理のみをレビューし `.claude/pipeline/claude-verdict.md` に保存させる。
   - **codex-validator** サブエージェント: thread B 経由で実コード検証をさせ、
     `.claude/pipeline/codex-verdict.md` に保存させる。

5. **Aggregator** サブエージェントを呼ぶ。
   - 2つの verdict を裁かせ、`判定: COMPLETE` か `判定: NEEDS_FIX` を受け取る。
   - **COMPLETE** → 手順7へ。
   - **NEEDS_FIX** → `.claude/pipeline/feedback.md` に修正必須の指摘が保存されている。手順6へ。

6. **修正ループ（最大3回）**: Generator（thread A）に feedback を渡して修正させ、手順4に戻る:

```bash
scripts/codex-thread.sh A "レビューで修正必須の指摘が出ました。.claude/pipeline/feedback.md を読み、指摘された点だけを修正して commit してください。指摘に無い変更はしないこと。修正内容を報告してください。"
```

   - ループ回数はあなたが数える。**3回目でも NEEDS_FIX なら停止**し、
     「実装ではなく計画が悪い可能性が高い」として、Planner からのやり直しをユーザーに提案する。

7. **完了報告**: 最終差分（`git log --oneline` と変更ファイル）、両 Validator の判定、
   Aggregator が無視した指摘、ループ回数をユーザーに報告する。

## 原則

- 観点を重ねない: Claude は仕様・設計・論理、Codex は実コード。同じことを2回チェックさせない。
- Aggregator の裁定は尊重する。メインが勝手に「まあ大丈夫」と上書きしない。
- 各エージェント・Codex への指示は**ファイルパス・型・ライブラリを具体的に**（曖昧な指示は事故る）。
