'use client'

import AppSidebar from '@/components/AppSidebar'
import styles from './admin.module.css'

const links = [
  { href: '/admin', label: 'ダッシュボード' },
  { href: '/admin/organizations', label: '組織（テナント）管理' },
  { href: '/admin/users', label: 'ユーザー管理' },
  { href: '/admin/categories', label: 'カテゴリ管理' },
  { href: '/admin/courses', label: 'コース管理' },
  { href: '/admin/roadmaps', label: 'ロードマップ管理' },
  { href: '/admin/mandatory', label: '必須受講管理' },
  { href: '/admin/notifications', label: '通知管理' },
  { href: '/admin/audit-logs', label: '監査ログ' },
  { href: '/admin/audit-export', label: '監査PDF出力' },
]

export default function AdminSidebar() {
  return <AppSidebar links={links} logoBadge="システム本部" styles={styles} />
}
