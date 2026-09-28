'use client'

import { useState, useSyncExternalStore } from 'react'
import styles from './share.module.css'

const subscribe = () => () => {}

// 共有するのはコースの公開ページ（/c/[id]）だけ。
// 氏名・所属・受講日・進捗は URL にも文面にも載せない。
export default function ShareCompletion({ course }) {
  const [copied, setCopied] = useState(false)
  // navigator はサーバーに無いので、ハイドレーション後にだけ判定する
  const canNativeShare = useSyncExternalStore(
    subscribe,
    () => typeof navigator.share === 'function',
    () => false
  )

  const text = `あわい屋ZEROSで「${course.title}」を修了しました`
  const url = () => `${window.location.origin}/c/${course.id}`

  function openX() {
    const q = new URLSearchParams({ text, url: url() })
    window.open(`https://twitter.com/intent/tweet?${q}`, '_blank', 'noopener,noreferrer')
  }

  function openLine() {
    const q = new URLSearchParams({ url: url() })
    window.open(`https://social-plugins.line.me/lineit/share?${q}`, '_blank', 'noopener,noreferrer')
  }

  async function handleNative() {
    try {
      await navigator.share({ title: text, text, url: url() })
    } catch {
      // シートを閉じただけ
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${text} ${url()}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.heading}>修了をシェアする</p>
      <p className={styles.note}>
        共有されるのはコースの紹介ページだけです。お名前・所属・受講記録は含まれません。
      </p>

      {canNativeShare && (
        <button type="button" className={`${styles.btn} ${styles.primary}`} onClick={handleNative}>
          シェアする
        </button>
      )}

      <div className={styles.row}>
        <button type="button" className={styles.btn} onClick={openX}>X に投稿</button>
        <button type="button" className={`${styles.btn} ${styles.line}`} onClick={openLine}>LINEで送る</button>
        <button type="button" className={styles.btn} onClick={handleCopy}>
          {copied ? 'コピーしました' : 'リンクをコピー'}
        </button>
      </div>
    </div>
  )
}
