---
name: dual-pipeline
description: Claude と Codex の「違う目」で二重検証しながら機能を実装するパイプライン。「〜を実装して」「〜機能を追加して」「〜を直して」「〜できるようにして」など、このメモアプリのコード変更を伴う依頼があったときに必ず使用する。単発の質問・調査・説明のみの依頼では使わない。
---

# dual-pipeline: Claude×Codex 二重検証パイプライン

コード変更の依頼を受けたら、**必ずこのフローに従うこと。自分で直接実装してはならない。**
あなた（メイン）はオーケストレーターに徹し、実装・レビュー・裁定はすべてサブエージェントと Codex に任せる。

## 適用範囲

- **使う**: 機能追加・バグ修正・リファクタなど、`src/` や `server/` のコード変更を伴う依頼
- **使わない**: コードを読んで説明するだけ、質問への回答、ドキュメントのみの修正、
  1行の typo 修正のような自明で検証不要な変更（この場合は直接編集してよい）

判断に迷ったら使う。分離のコストより、見逃しのコストのほうが高い。

## 前提

- Codex は `scripts/codex-thread.sh <A|B> "<プロンプト>"` で呼ぶ。
  - **thread A** = Generator（実装）。feedback 修正も同じ A で行う（実装の文脈を保つ）
  - **thread B** = Codex Validator（検証）。A とは別セッション。実装者の記憶を持たない目で検証させる
- エージェント間の受け渡しは**ファイル経由**（`.claude/plans/`・`.claude/pipeline/`）。コンテキストを汚さない。
- Codex はこの会話を見ていない。プロンプトは**必ず自己完結**させる
  （計画ファイルのパス・既存の型や規約・commit 方針を毎回明示する）。

## 手順

### 1. リセット
`scripts/codex-thread.sh reset` を実行し、前回のスレッド状態を破棄する。

### 2. Planner（Claude）
`planner` サブエージェントに要件を渡し、計画ファイル（`.claude/plans/<機能名>.md`）を作らせる。
計画をユーザーに提示して**承認を得る**。修正指示があれば Planner に戻す。

### 3. Generator（Codex / thread A）
Bash で Codex を呼び、ストーリー単位で実装＋commit させる:

```bash
scripts/codex-thread.sh A "あなたはこのリポジトリ（TypeScript + React + Vite / Express のメモアプリ）の実装担当です。.claude/plans/<機能名>.md を読み、ユーザーストーリーを1つずつ実装して、ストーリー単位で git commit してください。計画に無い機能追加やリファクタはしない。既存の型（src/types.ts の Memo）・命名・記法に合わせる。npm run build が通ることを確認してから commit すること。完了したら、変更したファイル一覧と満たした受け入れ条件を報告してください。"
```

### 4. Dual Validator（並列）
**1メッセージで2つのツール呼び出しを同時に発行**し、並列で検証させる:

- `claude-validator` サブエージェント — 計画ファイルのパスと変更ファイル一覧を渡す。
  仕様・設計・論理のみをレビューさせ、`.claude/pipeline/claude-verdict.md` に保存させる。
- `codex-validator` サブエージェント — thread B 経由で実コード検証をさせ、
  `.claude/pipeline/codex-verdict.md` に保存させる。

観点を重ねないこと。Claude は仕様・設計・論理、Codex は実コード（build・型・lint・変更漏れ）。
**同じことを2回チェックさせない。**

### 5. Aggregator
`aggregator` サブエージェントに2つの verdict を裁かせる。

- `判定: COMPLETE` → 手順7へ
- `判定: NEEDS_FIX` → `.claude/pipeline/feedback.md` に修正必須の指摘が保存されている。手順6へ

### 6. 修正ループ（最大3回）
Generator（thread A）に feedback を渡して修正させ、**手順4に戻る**:

```bash
scripts/codex-thread.sh A "レビューで修正必須の指摘が出ました。.claude/pipeline/feedback.md を読み、指摘された点だけを修正して commit してください。指摘に無い変更はしないこと。修正内容を報告してください。"
```

ループ回数はあなたが数える。**3回目でも NEEDS_FIX なら停止**し、
「実装ではなく計画が悪い可能性が高い」として、Planner からのやり直しをユーザーに提案する。

### 7. 完了報告と push
最終差分（`git log --oneline` と変更ファイル）、両 Validator の判定、
Aggregator が無視した指摘、ループ回数をユーザーに報告する。

実装が完了したら **commit / push まで進めてよい**（ユーザーから常時許可を得ている）。
main への直接 push はせず、`feature/<機能名>` ブランチを切って push し、PR を作成する。

## 原則

- **自分で実装しない**。メインが手を出すと、この仕組みの意味がなくなる。
- Aggregator の裁定は尊重する。メインが勝手に「まあ大丈夫」と上書きしない。
- 各エージェント・Codex への指示は**ファイルパス・型・ライブラリを具体的に**（曖昧な指示は事故る）。
