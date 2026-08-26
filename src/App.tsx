import { useState, useEffect, useCallback, useRef } from 'react'
import { MemoList } from './components/MemoList'
import { MemoEditor } from './components/MemoEditor'
import { fetchMemos, createMemo, updateMemo, deleteMemo } from './api'
import type { Memo } from './types'
import './App.css'

interface ReminderToast {
  id: string
  memoId: string
  memo: Memo
}

export default function App() {
  const [memos, setMemos] = useState<Memo[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [reminderToasts, setReminderToasts] = useState<ReminderToast[]>([])
  const pendingReminderIds = useRef(new Set<string>())
  const audioContext = useRef<AudioContext | null>(null)
  const isReminderSoundPlaying = useRef(false)

  const selectedMemo = memos.find((m) => m.id === selectedId) ?? null

  const filteredMemos = (() => {
    if (!searchQuery) return memos
    const query = searchQuery.toLowerCase()
    return memos.filter(
      (memo) =>
        memo.title.toLowerCase().includes(query) ||
        memo.content.toLowerCase().includes(query),
    )
  })()

  const loadMemos = useCallback(async () => {
    const data = await fetchMemos()
    setMemos(data)
  }, [])

  useEffect(() => {
    loadMemos()
  }, [loadMemos])

  useEffect(() => {
    const prepareAudio = () => {
      if (!audioContext.current) {
        const AudioContextClass = window.AudioContext
        if (!AudioContextClass) return
        audioContext.current = new AudioContextClass()
      }
      audioContext.current.resume().catch(() => {})
    }

    window.addEventListener('pointerdown', prepareAudio, { once: true })
    return () => {
      window.removeEventListener('pointerdown', prepareAudio)
      audioContext.current?.close().catch(() => {})
    }
  }, [])

  const playReminderSound = useCallback(() => {
    const context = audioContext.current
    if (!context || isReminderSoundPlaying.current) return

    isReminderSoundPlaying.current = true
    context.resume().then(() => {
      const startTime = context.currentTime
      ;[523.25, 659.25, 783.99].forEach((frequency, index) => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        const noteStart = startTime + index * 0.18
        const noteEnd = noteStart + 0.15

        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        gain.gain.setValueAtTime(0.04, noteStart)
        gain.gain.exponentialRampToValueAtTime(0.001, noteEnd)
        oscillator.connect(gain)
        gain.connect(context.destination)
        oscillator.start(noteStart)
        oscillator.stop(noteEnd)
      })
    }).catch(() => {}).finally(() => {
      window.setTimeout(() => {
        isReminderSoundPlaying.current = false
      }, 700)
    })
  }, [])

  useEffect(() => {
    const checkReminders = async () => {
      const now = Date.now()
      const dueMemos = memos.filter(
        (memo) =>
          memo.reminderAt &&
          !memo.reminderTriggeredAt &&
          new Date(memo.reminderAt).getTime() <= now &&
          !pendingReminderIds.current.has(memo.id),
      )

      const triggeredMemos = await Promise.all(dueMemos.map(async (memo) => {
        pendingReminderIds.current.add(memo.id)
        try {
          const updated = await updateMemo(memo.id, { reminderTriggeredAt: new Date().toISOString() })
          setMemos((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
          const toastId = `${memo.id}-${updated.reminderAt}`
          setReminderToasts((prev) => prev.some((toast) => toast.id === toastId)
            ? prev
            : [...prev, { id: toastId, memoId: memo.id, memo: updated }])
          return updated
        } catch {
          return null
        } finally {
          pendingReminderIds.current.delete(memo.id)
        }
      }))

      if (triggeredMemos.some((memo) => memo !== null)) {
        playReminderSound()
      }
    }

    checkReminders()
    const interval = window.setInterval(checkReminders, 30_000)
    return () => window.clearInterval(interval)
  }, [memos, playReminderSound])

  const handleNew = async () => {
    const memo = await createMemo('', '')
    setMemos((prev) => [memo, ...prev])
    setSelectedId(memo.id)
    setSearchQuery('')
  }

  const handleSave = async (title: string, content: string) => {
    if (!selectedId) return
    const updated = await updateMemo(selectedId, { title, content })
    setMemos((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  const handleReminderSave = async (reminderAt: string | null) => {
    if (!selectedId) return
    const updated = await updateMemo(selectedId, { reminderAt })
    setMemos((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  const handleDelete = async () => {
    if (!selectedId) return
    await deleteMemo(selectedId)
    setMemos((prev) => prev.filter((m) => m.id !== selectedId))
    setReminderToasts((prev) => prev.filter((toast) => toast.memoId !== selectedId))
    setSelectedId(null)
  }

  return (
    <div className="app">
      <MemoList
        memos={filteredMemos}
        selectedId={selectedId}
        onSelect={(memo) => setSelectedId(memo.id)}
        onNew={handleNew}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        hasMemos={memos.length > 0}
      />
      <MemoEditor
        memo={selectedMemo}
        onSave={handleSave}
        onReminderSave={handleReminderSave}
        onDelete={handleDelete}
      />
      {reminderToasts.length > 0 && (
        <div className="reminder-toast-container" aria-live="assertive">
          {reminderToasts.length > 1 && (
            <div className="reminder-toast-header">
              <span>{reminderToasts.length}件のリマインド</span>
              <button
                type="button"
                className="reminder-toast-close-all"
                onClick={() => setReminderToasts([])}
              >
                すべて閉じる
              </button>
            </div>
          )}
          <div className="reminder-toast-list">
            {reminderToasts.map(({ id, memo }) => (
              <div key={id} className="reminder-toast" role="alert">
                <span className="reminder-toast-icon" aria-hidden="true">⏰</span>
                <button
                  type="button"
                  className="reminder-toast-close"
                  onClick={() => setReminderToasts((prev) => prev.filter((toast) => toast.id !== id))}
                  aria-label="リマインドを閉じる"
                >
                  ×
                </button>
                <p className="reminder-toast-title">{memo.title || '無題'}</p>
                {memo.content && <p className="reminder-toast-content">{memo.content}</p>}
                {memo.reminderAt && (
                  <p className="reminder-toast-date">
                    リマインド: {new Date(memo.reminderAt).toLocaleString('ja-JP')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
