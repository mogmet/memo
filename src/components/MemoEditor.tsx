import { useState, useEffect, useRef } from 'react'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import type { Memo } from '../types'

interface Props {
  memo: Memo | null
  onSave: (title: string, content: string) => void
  onDelete: () => void
}

export function MemoEditor({ memo, onSave, onDelete }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setTitle(memo?.title ?? '')
    setContent(memo?.content ?? '')
    setShowEmojiPicker(false)
  }, [memo])

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setContent((prev) => prev + emoji)
      return
    }
    const start = textarea.selectionStart ?? content.length
    const end = textarea.selectionEnd ?? content.length
    const newContent = content.slice(0, start) + emoji + content.slice(end)
    setContent(newContent)
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.focus()
      const newPos = start + emoji.length
      ta.setSelectionRange(newPos, newPos)
    })
  }

  if (!memo) {
    return (
      <div className="memo-editor empty-state">
        <p>メモを選択するか、新規作成してください</p>
      </div>
    )
  }

  return (
    <div className="memo-editor">
      <input
        type="text"
        className="memo-title-input"
        placeholder="タイトル"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => onSave(title, content)}
      />
      <div className="emoji-toolbar">
        <button
          type="button"
          className="emoji-trigger-btn"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowEmojiPicker((v) => !v)}
          aria-label="絵文字を挿入"
        >
          😊
        </button>
        {showEmojiPicker && (
          <div
            className="emoji-picker-popup"
            onMouseDown={(e) => e.preventDefault()}
          >
            <EmojiPicker
              onEmojiClick={(data: EmojiClickData) => {
                insertEmoji(data.emoji)
                setShowEmojiPicker(false)
              }}
              width={320}
              height={400}
            />
          </div>
        )}
      </div>
      <textarea
        ref={textareaRef}
        className="memo-content-input"
        placeholder="メモを入力..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={() => onSave(title, content)}
      />
      <div className="memo-editor-footer">
        <span className="memo-updated">
          更新: {new Date(memo.updatedAt).toLocaleString('ja-JP')}
        </span>
        <button onClick={onDelete} className="btn-delete">削除</button>
      </div>
    </div>
  )
}
