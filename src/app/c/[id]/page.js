import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getServiceRoleClient, isMockMode } from '@/utils/supabase/admin'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

// 修了シェアの受け皿（未ログインで閲覧可。middleware で /c/ を除外）。
// 匿名ロールは courses を読めないため Service Role で読むが、
// 返すのは「全組織共通・公開中」のコースの紹介文だけに限る。
const getPublicCourse = cache(async (id) => {
  const supabase = isMockMode() ? await createClient() : getServiceRoleClient()
  const { data } = await supabase
    .from('courses')
    .select('id, title, description, organization_id, is_active, categories(name)')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.organization_id || !data.is_active) return null
  return data
})

export async function generateMetadata({ params }) {
  const { id } = await params
  const course = await getPublicCourse(id)
  if (!course) return {}
  const title = `「${course.title}」を修了しました | あわい屋ZEROS`
  const description = course.description || 'あわい屋ZEROS 学習プラットフォームのコースです。'
  return {
    title,
    description,
    openGraph: { title, description, type: 'website', siteName: 'あわい屋ZEROS 学習プラットフォーム' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PublicCoursePage({ params }) {
  const { id } = await params
  const course = await getPublicCourse(id)
  if (!course) notFound()

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>COURSE COMPLETED</p>
        <p className={styles.lead}>このコースを修了した方からのシェアです</p>

        <section className={styles.card}>
          {course.categories?.name && <span className={styles.tag}>{course.categories.name}</span>}
          <h1 className={styles.title}>{course.title}</h1>
          {course.description && <p className={styles.desc}>{course.description}</p>}
        </section>

        <p className={styles.about}>
          あわい屋ZEROS 学習プラットフォームは、医療・介護の現場で働く方のための学習の場です。受講には所属組織からの招待が必要です。
        </p>
        <Link href="/login" className={styles.cta}>受講者の方はログイン</Link>
      </div>
    </main>
  )
}
