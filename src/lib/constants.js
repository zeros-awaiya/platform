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
