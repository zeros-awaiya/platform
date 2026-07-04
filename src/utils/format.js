// 日付表示の共通フォーマッタ。null/不正値は '-' を返す。
// 書式が異なる箇所（例: NotificationsClientPage の 時:分 付き、ダッシュボードのロケール既定）
// には使わないこと（出力が変わるため）。

// YYYY/MM/DD
export function formatDate(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// YYYY/MM/DD HH:MM:SS
export function formatDateTime(iso) {
  if (!iso) return '-'
  const date = new Date(iso)
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
