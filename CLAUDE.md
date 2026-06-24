# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TypeScript + React のメモアプリ。Vite（フロントエンド）+ Express（バックエンドAPI）構成で、メモデータは `data/memos.json` にローカル保存される。

## Commands

- `npm run dev` — フロントエンド(Vite :5173)とバックエンド(Express :3001)を同時起動
- `npm run dev:client` — フロントエンドのみ起動
- `npm run dev:server` — バックエンドのみ起動
- `npm run build` — プロダクションビルド

## Architecture

- `server/index.ts` — Express APIサーバー。メモのCRUD（GET/POST/PUT/DELETE `/api/memos`）を提供し、`data/memos.json` で永続化
- `src/` — React フロントエンド
  - `App.tsx` — メイン画面。左にメモ一覧、右にエディターの2カラムレイアウト
  - `api.ts` — バックエンドAPI呼び出し関数
  - `components/MemoList.tsx` — メモ一覧サイドバー
  - `components/MemoEditor.tsx` — メモ編集エリア（onBlurで自動保存）
- Viteのプロキシ設定で `/api` リクエストをExpressサーバーに転送
