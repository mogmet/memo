---
description: Claude×Codex の Dual Validator パイプラインで機能を実装する（通常は自動発動するため明示呼び出しは不要）
---

`dual-pipeline` スキル（`.claude/skills/dual-pipeline/SKILL.md`）を読み、そのフローに厳密に従って
以下の要件を実装すること。自分で直接実装してはならない。

要件: $ARGUMENTS

なお、このコマンドは明示呼び出し用の入口にすぎない。スキルはコード変更の依頼で**自動発動**するため、
通常は `/dual-pipeline` を打たずに要件をそのまま伝えればよい。
