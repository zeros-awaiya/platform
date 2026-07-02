// quiz_apply_template.mjs ── 1コース分の「動画3問＋コース末5問」クイズを作成・反映する汎用テンプレ
// 使い方（詳細は supabase/QUIZ_ROLLOUT_PLAN.md）:
//   1) このファイルをコース別にコピー（例 quiz_CB.mjs）。
//   2) まず list モードで対象コースのレッスン id/sort を確認（動画が存在するかも要確認）:
//        MODE=list COURSE_ID=<uuid> SUPABASE_URL=... SERVICE_ROLE_KEY=... node <file>
//   3) 下の CONFIG を埋める（動画id→クイズid、総合クイズid、各設問）。本文準拠＋正解キー照合。
//   4) apply モードで本番反映＋再現SQL生成:
//        SUPABASE_URL=... SERVICE_ROLE_KEY=... node <file>
// 反映方式: psql/接続文字列なしのため service_role + supabase-js(REST)。キーは毎回環境変数で渡す。
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

// =====================================================================
// CONFIG ── ここをコースごとに埋める（下はAIコースの記入例）
// =====================================================================
const CONFIG = {
  courseId: 'b0a10000-0000-4000-8000-000000000000',
  courseLabel: 'AI活用コース',
  outSqlPath: 'C:/Users/admin/Dropbox/ZEROS/あわい屋ZEROSの学習プラットフォーム/supabase/seed_ai_quiz_per_video.sql',
  courseEndQuizId: 'b0a1f000-0000-4000-8000-000000000000',
  courseEndTitle: '総合確認テスト ─ AI活用コース',
  // 動画ごと: videoId(必須・listで確認) / quizId(決定論的に1つ) / quizTitle / Q=[ [問,A,B,C,D,正], ×3 ]
  topics: [
    // { videoId:'b0a10150-0000-4000-8000-000000000000', quizId:'b0a10190-0000-4000-8000-000000000000',
    //   quizTitle:'確認テスト ─ ...', Q:[ ['問1','A','B','C','D','A'], ['問2',...], ['問3',...] ] },
  ],
  // コース末5問: [ [問,A,B,C,D,正], ×5 ]
  courseEndQ: [
    // ['総合問1','A','B','C','D','C'], ...
  ],
};

async function main() {
  const URL = process.env.SUPABASE_URL, KEY = process.env.SERVICE_ROLE_KEY;
  const MODE = process.env.MODE || 'apply';
  if (!URL || !KEY) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY が必要');
  const sb = createClient(URL, KEY, { auth: { persistSession: false } });

  // ----- list モード: 対象コースのレッスンを表示（動画の有無・id確認） -----
  if (MODE === 'list') {
    const cid = process.env.COURSE_ID;
    if (!cid) throw new Error('COURSE_ID を渡してください');
    const { data, error } = await sb.from('lessons')
      .select('id,title,content_type,sort_order').eq('course_id', cid).order('sort_order');
    if (error) throw new Error(error.message);
    data.forEach(l => console.log(String(l.sort_order).padStart(3), l.content_type.padEnd(7), l.id, l.title));
    console.log(`\nvideo=${data.filter(l=>l.content_type==='video').length} / 全${data.length}`);
    console.log('※ video=0 のコースは「動画別クイズ」の前に動画レッスンの投入が必要。');
    return;
  }

  // ----- apply モード -----
  const cfg = CONFIG;
  // courseEndExisting=true: 既存のコース末5問(courseEndQuizId)を作り直さず、末尾(sort99)へ置くだけ。
  //   A群(既にコース末5問があるコース)向け。false/未指定なら courseEndQ の5問で新規作成。
  const endExisting = cfg.courseEndExisting === true;
  if (!cfg.topics.length) throw new Error('CONFIG未記入: topics が空');
  if (!endExisting && (cfg.courseEndQ || []).length !== 5)
    throw new Error('CONFIG未記入: 新規コース末は courseEndQ を5問で指定してください');

  const quizLessons = [], questions = [], videoSortUpdates = [];
  cfg.topics.forEach((tp, idx) => {
    const vsort = idx * 2 + 1; // 1,3,5,...
    videoSortUpdates.push({ id: tp.videoId, sort: vsort });
    quizLessons.push({ id: tp.quizId, course_id: cfg.courseId, title: tp.quizTitle,
      content_type: 'quiz', url: null, file_path: null, article_content: null,
      estimated_minutes: 3, sort_order: vsort + 1 });
    tp.Q.forEach((q, i) => questions.push({ lesson_id: tp.quizId,
      question: q[0], option_a: q[1], option_b: q[2], option_c: q[3], option_d: q[4],
      correct_option: q[5], sort_order: i }));
  });
  if (!endExisting) {
    quizLessons.push({ id: cfg.courseEndQuizId, course_id: cfg.courseId, title: cfg.courseEndTitle,
      content_type: 'quiz', url: null, file_path: null, article_content: null,
      estimated_minutes: 5, sort_order: 99 });
    cfg.courseEndQ.forEach((q, i) => questions.push({ lesson_id: cfg.courseEndQuizId,
      question: q[0], option_a: q[1], option_b: q[2], option_c: q[3], option_d: q[4],
      correct_option: q[5], sort_order: i }));
  }

  const quizIds = quizLessons.map(l => l.id);

  // 健全性チェック
  for (const l of quizLessons) {
    const n = questions.filter(q => q.lesson_id === l.id).length;
    const want = l.id === cfg.courseEndQuizId ? 5 : 3;
    if (n !== want) throw new Error(`設問数NG: ${l.title} は ${n}問（期待${want}）`);
  }
  for (const q of questions) if (!['A','B','C','D'].includes(q.correct_option)) throw new Error('不正key: ' + q.question);
  const dup = quizIds.filter((v,i)=>quizIds.indexOf(v)!==i);
  if (dup.length) throw new Error('quizId重複: ' + dup.join(','));
  console.log(`構築: quizレッスン ${quizLessons.length} / 設問 ${questions.length}`);

  // 動画存在確認（video=0 だと per-video が無意味）
  const { data: vids } = await sb.from('lessons').select('id')
    .eq('course_id', cfg.courseId).eq('content_type', 'video');
  const vidSet = new Set((vids||[]).map(v=>v.id));
  const missing = videoSortUpdates.filter(v => !vidSet.has(v.id));
  if (missing.length) throw new Error('指定videoIdが本番に存在しません: ' + missing.map(m=>m.id).join(', '));

  // (1) 本番反映
  for (const v of videoSortUpdates) {
    const { error } = await sb.from('lessons').update({ sort_order: v.sort }).eq('id', v.id);
    if (error) throw new Error('動画sort更新ERR ' + v.id + ' ' + error.message);
  }
  console.log('動画 sort を奇数に更新');
  { const { error } = await sb.from('lessons').upsert(quizLessons, { onConflict: 'id' });
    if (error) throw new Error('quizレッスンupsert ERR ' + error.message); }
  if (endExisting) { // 既存コース末を末尾へ（設問は触らない）
    const { error } = await sb.from('lessons').update({ sort_order: 99 }).eq('id', cfg.courseEndQuizId);
    if (error) throw new Error('既存コース末sort更新ERR ' + error.message);
    console.log('既存コース末(5問)を sort99 へ:', cfg.courseEndQuizId);
  }
  { const { error } = await sb.from('quiz_questions').delete().in('lesson_id', quizIds);
    if (error) throw new Error('設問delete ERR ' + error.message); }
  { const { error } = await sb.from('quiz_questions').insert(questions);
    if (error) throw new Error('設問insert ERR ' + error.message); }
  console.log(`反映完了: quizレッスン${quizLessons.length} / 設問${questions.length}`);

  // (2) 再現用SQL生成
  if (cfg.outSqlPath) {
    const esc = s => String(s).replace(/'/g, "''");
    let sql = `-- ${cfg.courseLabel} クイズ(動画3問＋コース末5問) seed  自動生成\n-- 冪等: 動画sort=固定値 / quizレッスン=ON CONFLICT DO UPDATE / 設問=lesson_id単位 DELETE→INSERT\n\n`;
    for (const v of videoSortUpdates) sql += `UPDATE public.lessons SET sort_order=${v.sort} WHERE id='${v.id}';\n`;
    if (endExisting) sql += `UPDATE public.lessons SET sort_order=99 WHERE id='${cfg.courseEndQuizId}'; -- 既存コース末5問\n`;
    sql += `\nINSERT INTO public.lessons (id, course_id, title, content_type, url, file_path, article_content, estimated_minutes, sort_order)\nVALUES\n`;
    sql += quizLessons.map(l => `  ('${l.id}','${l.course_id}','${esc(l.title)}','quiz',NULL,NULL,NULL,${l.estimated_minutes},${l.sort_order})`).join(',\n')
      + `\nON CONFLICT (id) DO UPDATE\n  SET course_id=EXCLUDED.course_id, title=EXCLUDED.title, content_type=EXCLUDED.content_type, estimated_minutes=EXCLUDED.estimated_minutes, sort_order=EXCLUDED.sort_order;\n`;
    sql += `\nDELETE FROM public.quiz_questions WHERE lesson_id IN (\n  ${quizIds.map(id=>`'${id}'`).join(',\n  ')}\n);\n`;
    sql += `\nINSERT INTO public.quiz_questions (lesson_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)\nVALUES\n`;
    sql += questions.map(q => `('${q.lesson_id}','${esc(q.question)}','${esc(q.option_a)}','${esc(q.option_b)}','${esc(q.option_c)}','${esc(q.option_d)}','${q.correct_option}',${q.sort_order})`).join(',\n') + ';\n';
    writeFileSync(cfg.outSqlPath, sql, 'utf8');
    console.log('SQL生成:', cfg.outSqlPath);
  }
  console.log('done.');
}

main().then(() => { process.exitCode = 0; }).catch(e => { console.error('ERROR:', e.message); process.exitCode = 1; });
