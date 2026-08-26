import type { Memo } from './types'

const BASE = '/api/memos'

type MemoUpdates = Partial<Pick<Memo, 'title' | 'content' | 'reminderTriggeredAt'>> & {
  reminderAt?: string | null
}

export async function fetchMemos(): Promise<Memo[]> {
  const res = await fetch(BASE)
  return res.json()
}

export async function createMemo(title: string, content: string): Promise<Memo> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  })
  return res.json()
}

export async function updateMemo(
  id: string,
  updates: MemoUpdates,
): Promise<Memo> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    throw new Error('Failed to update memo')
  }
  return res.json()
}

export async function deleteMemo(id: string): Promise<void> {
  await fetch(`${BASE}/${id}`, { method: 'DELETE' })
}
