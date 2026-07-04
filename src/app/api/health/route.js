import { createClient } from '@/utils/supabase/server'
import { isMockMode } from '@/utils/supabase/mockMode'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // データベース接続テスト (最小限のクエリ)
    // 接続可能かを確認するために、organizations テーブルの ID を1件だけ取得します
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL

    const isMock = isMockMode()

    if (error) throw error

    return new Response(JSON.stringify({ 
      status: 'ok', 
      database: 'connected', 
      mode: isMock ? 'mock' : 'production',
      url: supabaseUrl || 'not-set'
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error.message,
      mode: (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? 'mock' : 'production'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
