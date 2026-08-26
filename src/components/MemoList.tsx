import type { Memo } from '../types'

interface Props {
  memos: Memo[]
  selectedId: string | null
  onSelect: (memo: Memo) => void
  onNew: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  hasMemos: boolean
}

export function MemoList({
  memos,
  selectedId,
  onSelect,
  onNew,
  searchQuery,
  onSearchChange,
  hasMemos,
}: Props) {
  return (
    <div className="memo-list">
      <div className="memo-list-header">
        <h2>メモ一覧</h2>
        <button onClick={onNew} className="btn-new">+ 新規</button>
      </div>
      <div className="memo-list-search">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="メモを検索"
          className="memo-search-input"
        />
      </div>
      <ul>
        {memos.map((memo) => (
          <li
            key={memo.id}
            className={memo.id === selectedId ? 'selected' : ''}
            onClick={() => onSelect(memo)}
          >
            <span className="memo-title">{memo.title || '無題'}</span>
            <div className="memo-meta">
              <span className="memo-date">
                {new Date(memo.updatedAt).toLocaleDateString('ja-JP')}
              </span>
              {memo.reminderAt && <span className="memo-reminder-indicator">⏰</span>}
            </div>
          </li>
        ))}
      </ul>
      {memos.length === 0 && !hasMemos && (
        <p className="empty">メモがありません</p>
      )}
      {memos.length === 0 && hasMemos && (
        <p className="empty">該当するメモがありません</p>
      )}
    </div>
  )
}
