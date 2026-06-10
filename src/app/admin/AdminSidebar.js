'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '../login/actions'
import styles from './admin.module.css'

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTheme, setActiveTheme] = useState('ocean')
  const pathname = usePathname()

  useEffect(() => {
    const currentTheme = localStorage.getItem('zeros-theme') || 'ocean'
    setActiveTheme(currentTheme)
  }, [])

  const handleThemeChange = (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('zeros-theme', theme)
    setActiveTheme(theme)
  }

  const toggleSidebar = () => setIsOpen(!isOpen)
  const closeSidebar = () => setIsOpen(false)

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
  ]

  return (
    <>
      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="メニューを開く">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className={styles.mobileLogoArea}>
          <Link href="/admin" onClick={closeSidebar} className={styles.logoLink} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/zeros-logo-white.svg" alt="あわい屋ZEROS" className={styles.mobileLogoImg} />
            <span className={styles.logoBadge}>システム本部</span>
          </Link>
        </div>
        <div style={{ width: 40 }}></div> {/* Balance spacer */}
      </div>

      {/* Overlay for mobile drawer */}
      {isOpen && <div className={styles.sidebarOverlay} onClick={closeSidebar} />}

      {/* Sidebar container */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoArea}>
            <Link href="/admin" onClick={closeSidebar} className={styles.logoLink}>
              <img src="/zeros-logo-white.svg" alt="あわい屋ZEROS" className={styles.logoImg} />
              <span className={styles.logoBadge}>システム本部</span>
            </Link>
          </div>
          <button className={styles.closeBtn} onClick={closeSidebar} aria-label="メニューを閉じる">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className={styles.nav}>
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
                onClick={closeSidebar}
              >
                {link.label}
              </Link>
            )
          })}

          {/* Theme Selector panel */}
          <div className={styles.themeSelectorSection} style={{ marginTop: 'auto', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
              カラーテーマ
            </span>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                type="button"
                className={`${styles.themeDot} ${activeTheme === 'ocean' ? styles.themeDotActive : ''}`}
                style={{ backgroundColor: '#6366f1', width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: 'pointer', outline: 'none' }}
                onClick={() => handleThemeChange('ocean')}
                title="ディープオーシャン"
                aria-label="ディープオーシャンテーマ"
              />
              <button
                type="button"
                className={`${styles.themeDot} ${activeTheme === 'forest' ? styles.themeDotActive : ''}`}
                style={{ backgroundColor: '#10b981', width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: 'pointer', outline: 'none' }}
                onClick={() => handleThemeChange('forest')}
                title="フォレストエメラルド"
                aria-label="フォレストエメラルドテーマ"
              />
              <button
                type="button"
                className={`${styles.themeDot} ${activeTheme === 'amethyst' ? styles.themeDotActive : ''}`}
                style={{ backgroundColor: '#8b5cf6', width: '18px', height: '18px', borderRadius: '50%', border: 'none', cursor: 'pointer', outline: 'none' }}
                onClick={() => handleThemeChange('amethyst')}
                title="ロイヤルアメジスト"
                aria-label="ロイヤルアメジストテーマ"
              />
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa', marginLeft: '0.25rem' }}>
                {activeTheme === 'ocean' ? 'オーシャン' : activeTheme === 'forest' ? 'エメラルド' : 'アメジスト'}
              </span>
            </div>
          </div>

          {/* Logout Action Form */}
          <form action={logout} style={{ width: '100%' }}>
            <button type="submit" className={styles.logoutBtn}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              ログアウト
            </button>
          </form>
        </nav>
      </aside>
    </>
  )
}
