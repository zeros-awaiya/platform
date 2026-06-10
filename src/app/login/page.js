'use client'

import { useActionState } from 'react'
import { login } from './actions'
import styles from './login.module.css'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <main className={styles.container}>
      <div className={styles.circle1}></div>
      <div className={styles.circle2}></div>
      
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <img src="/zeros-logo-white.svg" alt="あわい屋ZEROS" className={styles.logoImg} />
          </div>
          <p className={styles.subtitle}>人材育成ロードマップ プラットフォーム</p>
        </div>

        <form action={formAction} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="example@zeros.jp"
              className={styles.input}
              autoComplete="email"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className={styles.input}
              autoComplete="current-password"
            />
          </div>

          {state?.error && (
            <div className={styles.errorAlert} role="alert">
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{state.error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className={styles.submitBtn}
          >
            {isPending ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className={styles.footer}>
          <a href="#" className={styles.link}>
            パスワードをお忘れですか？
          </a>
        </div>
      </div>
    </main>
  )
}
