import type { Memo } from '../types'

interface Props {
  memos: Memo[]
  selectedId: string | null
  onSelect: (memo: Memo) => void
  onNew: () => void
}

export function MemoList({ memos, selectedId, onSelect, onNew }: Props) {
  return (
    <div className="memo-list">
      <div className="memo-list-header">
        <h2>メモ一覧</h2>
        <button onClick={onNew} className="btn-new">+ 新規</button>
      </div>
      <ul>
        {memos.map((memo) => (
          <li
            key={memo.id}
            className={memo.id === selectedId ? 'selected' : ''}
            onClick={() => onSelect(memo)}
          >
            <span className="memo-title">{memo.title || '無題'}</span>
            <span className="memo-date">
              {new Date(memo.updatedAt).toLocaleDateString('ja-JP')}
            </span>
          </li>
        ))}
      </ul>
      {memos.length === 0 && <p className="empty">メモがありません</p>}
    </div>
  )
}
