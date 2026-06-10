import { createClient } from '@/utils/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // データベース接続テスト (最小限のクエリ)
    // 接続可能かを確認するために、organizations テーブルの ID を1件だけ取得します
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    if (error) throw error

    return new Response(JSON.stringify({ status: 'ok', database: 'connected' }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      },
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
