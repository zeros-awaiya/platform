'use client'

import AppSidebar from '@/components/AppSidebar'
import styles from './org.module.css'

const links = [
  { href: '/org', label: 'ダッシュボード' },
  { href: '/org/users', label: 'ユーザー管理' },
]

export default function OrgSidebar() {
  return <AppSidebar links={links} logoBadge="組織管理者" styles={styles} />
}
