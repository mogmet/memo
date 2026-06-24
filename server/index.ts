import express from 'express'
import cors from 'cors'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const MEMOS_FILE = path.join(DATA_DIR, 'memos.json')

export interface Memo {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(MEMOS_FILE)
  } catch {
    await fs.writeFile(MEMOS_FILE, '[]', 'utf-8')
  }
}

async function readMemos(): Promise<Memo[]> {
  const data = await fs.readFile(MEMOS_FILE, 'utf-8')
  return JSON.parse(data)
}

async function writeMemos(memos: Memo[]) {
  await fs.writeFile(MEMOS_FILE, JSON.stringify(memos, null, 2), 'utf-8')
}

const app = express()
app.use(cors())
app.use(express.json())

// 一覧取得
app.get('/api/memos', async (_req, res) => {
  await ensureDataFile()
  const memos = await readMemos()
  res.json(memos)
})

// 作成
app.post('/api/memos', async (req, res) => {
  await ensureDataFile()
  const memos = await readMemos()
  const now = new Date().toISOString()
  const memo: Memo = {
    id: crypto.randomUUID(),
    title: req.body.title || '',
    content: req.body.content || '',
    createdAt: now,
    updatedAt: now,
  }
  memos.unshift(memo)
  await writeMemos(memos)
  res.status(201).json(memo)
})

// 更新
app.put('/api/memos/:id', async (req, res) => {
  await ensureDataFile()
  const memos = await readMemos()
  const index = memos.findIndex((m) => m.id === req.params.id)
  if (index === -1) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  memos[index] = {
    ...memos[index],
    title: req.body.title ?? memos[index].title,
    content: req.body.content ?? memos[index].content,
    updatedAt: new Date().toISOString(),
  }
  await writeMemos(memos)
  res.json(memos[index])
})

// 削除
app.delete('/api/memos/:id', async (req, res) => {
  await ensureDataFile()
  const memos = await readMemos()
  const filtered = memos.filter((m) => m.id !== req.params.id)
  if (filtered.length === memos.length) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  await writeMemos(filtered)
  res.status(204).end()
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
