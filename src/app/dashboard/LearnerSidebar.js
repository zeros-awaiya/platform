'use client'

import AppSidebar from '@/components/AppSidebar'
import styles from './dashboard.module.css'

const links = [
  { href: '/dashboard', label: 'ダッシュボード' },
  { href: '/dashboard/courses', label: 'コース一覧' },
  { href: '/dashboard/roadmaps', label: 'ロードマップ' },
  { href: '/dashboard/history', label: '学習履歴' },
  { href: '/dashboard/profile', label: 'プロフィール' },
]

export default function LearnerSidebar() {
  return <AppSidebar links={links} logoBadge={null} styles={styles} />
}
