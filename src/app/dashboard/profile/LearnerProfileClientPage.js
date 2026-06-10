'use client'

import React, { useState } from 'react'
import styles from '../dashboard.module.css'

export default function LearnerProfileClientPage({ profile }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handlePasswordChange = (e) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      alert('新しいパスワードと確認用パスワードが一致しません。')
      return
    }

    if (newPassword.length < 6) {
      alert('パスワードは6文字以上で入力してください。')
      return
    }

    setIsPending(true)
    setTimeout(() => {
      setIsPending(false)
      alert('パスワードを変更しました！（※モック環境のため、実際のパスワードは変更されていません）')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }, 1000)
  }

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>
          プロフィール設定
        </h2>
        <p style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>ご自身のアカウント情報およびパスワードの管理が行えます。</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
        
        {/* Profile Details Card */}
        <div className={styles.courseCard} style={{ cursor: 'default', minHeight: 'auto', padding: '2rem', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem', margin: 0 }}>
            アカウント情報
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Row: Name */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '0.75rem' }}>
              <span style={{ width: '140px', color: '#a1a1aa', fontSize: '0.9rem', fontWeight: '500' }}>氏名</span>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{profile.name}</span>
            </div>

            {/* Row: Email */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '0.75rem' }}>
              <span style={{ width: '140px', color: '#a1a1aa', fontSize: '0.9rem', fontWeight: '500' }}>メールアドレス</span>
              <span style={{ color: '#ffffff' }}>{profile.email}</span>
            </div>

            {/* Row: Org */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '0.75rem' }}>
              <span style={{ width: '140px', color: '#a1a1aa', fontSize: '0.9rem', fontWeight: '500' }}>所属組織</span>
              <span style={{ color: '#ffffff' }}>{profile.organizations?.name || '未設定'}</span>
            </div>

            {/* Row: Department */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '0.75rem' }}>
              <span style={{ width: '140px', color: '#a1a1aa', fontSize: '0.9rem', fontWeight: '500' }}>所属部署</span>
              <span style={{ color: '#ffffff' }}>{profile.departments?.name || '未配属'}</span>
            </div>

            {/* Row: Position */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '0.75rem' }}>
              <span style={{ width: '140px', color: '#a1a1aa', fontSize: '0.9rem', fontWeight: '500' }}>役職 / 職種</span>
              <span style={{ color: '#ffffff' }}>{profile.position || '未設定'}</span>
            </div>

            {/* Row: Status */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '0.75rem' }}>
              <span style={{ width: '140px', color: '#a1a1aa', fontSize: '0.9rem', fontWeight: '500' }}>ステータス</span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#34d399',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                有効なアカウント
              </span>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className={styles.courseCard} style={{ cursor: 'default', minHeight: 'auto', padding: '2rem', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#ffffff', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.75rem', margin: 0 }}>
            パスワード変更
          </h3>

          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Input: Current Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: '500' }}>現在のパスワード</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="現在のパスワードを入力"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Input: New Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: '500' }}>新しいパスワード</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワードを入力 (6文字以上)"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Input: Confirm Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#a1a1aa', fontWeight: '500' }}>新しいパスワード (確認)</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="新しいパスワードをもう一度入力"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#ffffff',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginTop: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {isPending ? '更新中...' : 'パスワードを更新'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}
