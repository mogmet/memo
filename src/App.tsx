import { useState, useEffect, useCallback } from 'react'
import { MemoList } from './components/MemoList'
import { MemoEditor } from './components/MemoEditor'
import { fetchMemos, createMemo, updateMemo, deleteMemo } from './api'
import type { Memo } from './types'
import './App.css'

export default function App() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedMemo = memos.find((m) => m.id === selectedId) ?? null

  const loadMemos = useCallback(async () => {
    const data = await fetchMemos()
    setMemos(data)
  }, [])

  useEffect(() => {
    loadMemos()
  }, [loadMemos])

  const handleNew = async () => {
    const memo = await createMemo('', '')
    setMemos((prev) => [memo, ...prev])
    setSelectedId(memo.id)
  }

  const handleSave = async (title: string, content: string) => {
    if (!selectedId) return
    const updated = await updateMemo(selectedId, title, content)
    setMemos((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await deleteMemo(selectedId)
    setMemos((prev) => prev.filter((m) => m.id !== selectedId))
    setSelectedId(null)
  }

  return (
    <div className="app">
      <MemoList
        memos={memos}
        selectedId={selectedId}
        onSelect={(memo) => setSelectedId(memo.id)}
        onNew={handleNew}
      />
      <MemoEditor
        memo={selectedMemo}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}
