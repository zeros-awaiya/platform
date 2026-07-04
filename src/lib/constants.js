// アプリ全体で共有する定数。
// ロール文字列は DB（users.role / RLS get_my_role()）と一致させること。

export const ROLES = {
  SYSTEM_ADMIN: 'SYSTEM_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  LEARNER: 'LEARNER',
}

// 各ロールの既定ホーム（不許可ロールのリダイレクト先・ループ回避）
export const ROLE_HOME = {
  [ROLES.SYSTEM_ADMIN]: '/admin',
  [ROLES.ORG_ADMIN]: '/org',
  [ROLES.LEARNER]: '/dashboard',
}

// レッスンの教材形式（lessons.content_type）。ラベルはコースビルダーの表示文言。
export const CONTENT_TYPE_OPTIONS = [
  { value: 'video',      label: 'YouTube動画 (埋め込み)' },
  { value: 'article',    label: 'システム内解説記事 (Markdown)' },
  { value: 'url',        label: '外部リンク (Web記事・リソース)' },
  { value: 'pdf',        label: 'PDFドキュメント (外部リンク)' },
  { value: 'word',       label: 'Wordファイル (外部リンク)' },
  { value: 'powerpoint', label: 'PowerPoint (外部リンク)' },
  { value: 'quiz',       label: '確認テスト (QUIZ)' },
]
