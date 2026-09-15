// quiz_NG.mjs ── NG（調整交渉術, b0e90000）動画3問＋コース末5問クイズ 反映スクリプト
// quiz_apply_template.mjs をコース別にコピーし CONFIG を記入したもの（2026-08-24 指示箱処理で作成）。
// 出典:
//   - 動画id/URL: supabase/seed_ng_video_lessons.sql（本編=b0e9X00 / 動画=b0e9X50、X=1〜9）
//   - 設問本文: supabase/seed_ng_quiz.sql（旧設計・各レッスン5問のバンク）から
//     動画別クイズ用に各3問を精選（CBと同じ機械的ルール＝1問目・2問目・4問目を採用、本文準拠・正解キーは元seedのkeyコメントと1問ずつ照合済み）。
//   - クイズid: 旧バンクと同じ b0e9X90（動画id b0e9X50 の index5 を '5'→'9' に変えた決定論的id、CBと同じ規約）。
//     既存の quiz レッスン(sort91〜99, コース末にまとめ配置)を「動画直後(偶数sort)」へ配置し直し、
//     設問数を5→3に絞り込む形。course_end は新規5問(横断構成)を別idで新設。
//
// 実行前に必ず確認すること（詳細は quiz_NG_ROLLOUT_NOTE.md）:
//   1) MODE=list で本番の video 本数・id・sort を確認（本ファイルの videoId が実在するか）。
//   2) 本番反映(MODE=apply, デフォルト)はBOSS承認後に、SERVICE_ROLE_KEYを都度受領して実行する。
//
// 使い方:
//   ⚠️ 鍵をコマンド文字列に直接書かない（許可ルールに平文で保存される）。AGENTS.md「本番DBの操作ルール」2 を参照。
//   MODE=list COURSE_ID=b0e90000-0000-4000-8000-000000000000 \
//     SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="$(cat \"$SBKEY_FILE\")" node supabase/tools/quiz_NG.mjs
//   SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="$(cat \"$SBKEY_FILE\")" node supabase/tools/quiz_NG.mjs
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const CONFIG = {
  courseId: 'b0e90000-0000-4000-8000-000000000000',
  courseLabel: '調整交渉術（NG）',
  outSqlPath: 'C:/Users/admin/dev/platform/supabase/quiz_pv/b0e90000.sql',
  courseEndQuizId: 'b0e9f000-0000-4000-8000-000000000000',
  courseEndTitle: '総合確認テスト ─ 調整交渉術',
  topics: [
    { videoId: 'b0e90150-0000-4000-8000-000000000000', quizId: 'b0e90190-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 交渉と調整のあいだ', Q: [
        ['本文は、交渉を「勝ち負け」だと思っている人に、必ず起きることを、どう述べているか。','勝てば消耗しないが、負けると消耗する','一回きりの相手なら、関係が深まる','勝っても負けても、消耗する','相手の本音を、聴き出せるようになる','C'],
        ['本文が言う「交渉(negotiation)」と「調整(mediation)」の違いとして、正しいのはどれか。','交渉は「相手」と戦い、調整は「相手と一緒に、問題」と向き合う','交渉は並んで問題と向き合い、調整は向かい合って戦う','交渉も調整も、相手を論破して取り分を最大化する','調整は相手の気持ちに寄り添う傾聴のことである','A'],
        ['本文が示す「まとめる人の五つのステップ」で、最初に来るのはどれか。','相手の立場の奥にある利害を、聴く','共通の問いに、置き換える','合意を、言葉にして、残す','勝ち負けの枠から、降りる','D'],
      ] },
    { videoId: 'b0e90250-0000-4000-8000-000000000000', quizId: 'b0e90290-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 立場でなく利害を見る', Q: [
        ['本文は、話がこじれる場で起きていることを、どう説明しているか。','一方が嘘をついているから','相手の説得が下手だから','間を取れば必ず両者が満足するから','双方が「要求」だけを出し合い、「なぜ」を出していないから','D'],
        ['図書館で窓を開けたい人と閉めたい人の例で、司書がしたことは何か。','要求ではなく理由(利害)を聞き、隣の部屋の窓を開けた','二人の真ん中を取り、窓を半分開けた','どちらが正しいかを裁き、一方を黙らせた','窓の開閉をやめさせ、議論を打ち切った','A'],
        ['本文が言う「共通利害」とは何か。','違う利害を、やりとりして交換すること','二人が、同じものを欲しがっている点(同じ利害を、一緒に目指す土台)','相手の立場を、こちらが全部飲むこと','足して二で割った中間点','B'],
      ] },
    { videoId: 'b0e90350-0000-4000-8000-000000000000', quizId: 'b0e90390-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 代替案を持つ', Q: [
        ['本文は、交渉の強さは、どこで決まると述べているか。','テーブルの上の話術や切り返しで決まる','テーブルの外にある、別の道(代替案)の数で決まる','相手の人柄の良し悪しで決まる','その場の声の大きさで決まる','B'],
        ['本文が言う「代替案(BATNA)」の定義として、正しいのはどれか。','こうなったらいいな、という希望','決裂したら、たぶん何とかなる、という楽観','相手を脅すための切り札','この交渉がまとまらなかったとき、自分が取れる、いちばんマシな別の道','D'],
        ['本文が言う「合意ライン」の引き方として、正しいのはどれか。','相手の言い値を、そのまま基準にする','その場の空気で、その都度ずらしてよい','自分の代替案を基準に、「これ以上は飲まない」線を、着く前に決めておく','上司の指示だけで、機械的に決める','C'],
      ] },
    { videoId: 'b0e90450-0000-4000-8000-000000000000', quizId: 'b0e90490-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 感情を扱う', Q: [
        ['本文は、交渉が止まるとき、止めているものは何だと述べているか。','たいてい論理の不足である','相手の能力の低さである','たいてい論理ではなく、面子・不信・怒り・不安といった感情である','時間の不足である','C'],
        ['本文は、交渉の場の感情を、どう位置づけているか。','取り除くべきノイズではなく、相手の奥を教えてくれる情報である','本題の邪魔をする、消すべき雑音である','論理で押せば自然に消えるものである','こちらが利用してよい操作の道具である','A'],
        ['「感情を扱う五つのステップ」で、最初に来るのはどれか。','相手の感情を、言葉で受け取る','相手の面子を、立てたまま道を示す','小さな貸し借りで、信頼を積む','自分の感情に、名前をつける','D'],
      ] },
    { videoId: 'b0e90550-0000-4000-8000-000000000000', quizId: 'b0e90590-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 部門間の利害をまとめる', Q: [
        ['本文は、部門間の対立が起きる理由を、どう説明しているか。','どこかの部門が、必ずサボっているから','それぞれの部門が、それぞれの正しさ(部分最適)で動いているから','調整役の能力が、足りないから','相手の部門が、悪意を持っているから','B'],
        ['本文が言う「合成の誤謬」(満員の劇場で一人が立つ例)が示すことは何か。','一人の判断は常に間違っている','全員が座れば、誰も見えなくなる','部門は協力すれば必ず全体最適になる','一人ひとりの正しい行動を足し合わせても、全体の正解にはならない','D'],
        ['本文によれば、部門間の合意を「守られる合意」にするために、最後に何にひもづけるか。','調整役の個人的な人徳','その場の勢いと雰囲気','評価と数字(協力した部門が損をしない保証)','上司の一存','C'],
      ] },
    { videoId: 'b0e90650-0000-4000-8000-000000000000', quizId: 'b0e90690-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 上司と現場のあいだを通す', Q: [
        ['本文は、上と下のあいだですり減る人の正体を、何と呼んでいるか。','伝書鳩(ことづけをそのまま運ぶ人)','翻訳者','審判','代弁者','A'],
        ['本文が言う「伝書鳩」と「翻訳者」の違いとして、正しいのはどれか。','伝書鳩は利害を訳し、翻訳者は言葉を運ぶ','伝書鳩は「言葉」を運び、翻訳者は「利害」を訳す','両者は同じで、呼び方が違うだけだ','翻訳者は中身の利害を、勝手に変えてしまう','B'],
        ['上に現場を通す(上方交渉)で、本文がやってはいけないとしていることは何か。','現場の事情を、上の利害(数字)の言葉に訳す','確実に数字を取るための選択肢として差し出す','人を一人足す選択肢を、根拠とともに提案する','「現場が無理だと言っています」と、そのまま上げる','D'],
      ] },
    { videoId: 'b0e90750-0000-4000-8000-000000000000', quizId: 'b0e90790-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 社外との条件交渉', Q: [
        ['本文は、社外との交渉で消耗する人の共通の癖を、どう述べているか。','論点を増やしすぎること','相手の利害を聴きすぎること','交渉とは、価格を奪い合うことだ、と思っていること','最初の数字を、根拠つきで出すこと','C'],
        ['本文が言う「奪い合い」と「取引」の違いとして、正しいのはどれか。','奪い合いは一点(価格)を引っ張り、取引は複数の論点を組み替える','奪い合いは複数の論点を組み替え、取引は一点を引っ張る','どちらも論点は一つだけである','取引は、相手の言い値を全部飲むことである','A'],
        ['本文は、譲歩をどう設計せよと述べているか。','何も求めず、ただ引く(出血)','片方を譲るなら、片方をもらう(交換)','相手が求めるたびに、無条件で引き続ける','譲歩は一切しない','B'],
      ] },
    { videoId: 'b0e90850-0000-4000-8000-000000000000', quizId: 'b0e90890-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 対立を統合に変える', Q: [
        ['本文は「妥協(足して割る)」を、どう評価しているか。','双方が満足する、理想の合意である','まとめたように見えて、双方が半分だけ不満を残す(痛みを分け合っただけ)','対立の奥の価値を、必ず掘り出せる方法である','常に避けるべきで、例外なく悪である','B'],
        ['本文が言う「妥協」と「統合」の違いとして、正しいのはどれか。','妥協は第三の案を作り、統合はパイを割る','どちらもパイを一定とみなして割る','妥協は「足して割る」、統合は「両方が立つ(なかった第三の案を作る)」','統合は、片方を説得して飲ませることである','C'],
        ['「第三の案を作る五つのステップ」の最後、検算で問うべきことは何か。','どちらが、より多く譲ったか','どちらの顔が、より満足げか','合意までに、何分かかったか','この案で、両者の「いちばん大事」は、両方とも立っているか','D'],
      ] },
    { videoId: 'b0e90950-0000-4000-8000-000000000000', quizId: 'b0e90990-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 理不尽な相手と話す', Q: [
        ['本文は、理不尽な相手の前で消耗する正体を、どう述べているか。','こちらの実力が、根本的に足りないから','正論が、論理的に間違っているから','土俵(感情と力の場)を、相手に握られているから','相手が、生まれつきの悪人だから','C'],
        ['本文は、怒鳴る・脅す・嘘・論点ずらしを、どう捉えよと述べているか。','人格ではなく、要求を通すための「戦術(手段)」として切り分ける','その人の変えられない人格として、あきらめる','こちらも同じ手で、やり返すべき合図','無視して、ひたすら我慢すべきもの','A'],
        ['ステップ3「感情は受け止め、要求は事実に戻す」について、本文が守れと言う順番はどれか。','先に事実(データ)を求め、感情は無視する','まず感情を受け止め、それから要求を事実・基準に戻す','感情も要求も、同時にすべて飲む','感情も要求も、両方とも突っぱねる','B'],
      ] },
  ],
  courseEndQ: [
    ['このコース『調整交渉術』が一貫して勧めている姿勢は何か。','交渉は勝ち負けであり、常に相手より多く取ることを目指す','立場ではなく利害を見て、双方が同じ問題と並んで向き合うこと','感情は排除し、事実とデータだけで押し切ること','妥協(足して二で割る)を、最良の着地点として目指すこと','B'],
    ['「立場」と「利害」の違いについて、このコースが繰り返し伝えていることは何か。','立場は表に出した要求であり、利害はその奥にある本当に欲しいもの','立場と利害は同じものであり、区別する必要はない','利害より立場を先に聞くほうが、早く合意できる','立場は無視し、最初から利害だけを扱えばよい','A'],
    ['「代替案(BATNA)」について、このコースが説く役割は何か。','相手を脅すための切り札として、常に相手に見せつける','交渉に飲まれないための足場として、静かに持っておくもの','代替案は一度決めたら、交渉中は絶対に変えてはならない','代替案を持つことは、誠実でないので避けるべきだ','B'],
    ['感情の扱い方について、このコースが繰り返し否定している考え方はどれか。','感情は、相手の奥を教えてくれる情報として扱う','感情は、鎮めるか、逆に利用して操作の道具にすべきものである','感情に名前をつけてから、相手の感情を受け取る','感情を受け止めたうえで、要求は事実や基準に戻す','B'],
    ['「妥協」と「統合」、「奪い合い」と「取引」など、複数の対立軸に共通してこのコースが勧める考え方は何か。','一点(価格や立場)を最後まで引っ張り合うこと','どちらか一方が折れることで、早く場を収めること','論点を組み替え、両方の「いちばん大事」が立つ第三の案を探すこと','対立が起きたら、上司の判断にすべて委ねること','C'],
  ],
};

async function main() {
  const URL = process.env.SUPABASE_URL, KEY = process.env.SERVICE_ROLE_KEY;
  const MODE = process.env.MODE || 'apply';
  if (!URL || !KEY) throw new Error('SUPABASE_URL / SERVICE_ROLE_KEY が必要');
  const sb = createClient(URL, KEY, { auth: { persistSession: false } });

  if (MODE === 'list') {
    const cid = process.env.COURSE_ID || CONFIG.courseId;
    const { data, error } = await sb.from('lessons')
      .select('id,title,content_type,sort_order').eq('course_id', cid).order('sort_order');
    if (error) throw new Error(error.message);
    data.forEach(l => console.log(String(l.sort_order).padStart(3), l.content_type.padEnd(7), l.id, l.title));
    console.log(`\nvideo=${data.filter(l=>l.content_type==='video').length} / 全${data.length}`);
    return;
  }

  const cfg = CONFIG;
  const endExisting = cfg.courseEndExisting === true;
  if (!cfg.topics.length) throw new Error('CONFIG未記入: topics が空');
  if (!endExisting && (cfg.courseEndQ || []).length !== 5)
    throw new Error('CONFIG未記入: 新規コース末は courseEndQ を5問で指定してください');

  const quizLessons = [], questions = [], videoSortUpdates = [];
  cfg.topics.forEach((tp, idx) => {
    const vsort = idx * 2 + 1;
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
  for (const l of quizLessons) {
    const n = questions.filter(q => q.lesson_id === l.id).length;
    const want = l.id === cfg.courseEndQuizId ? 5 : 3;
    if (n !== want) throw new Error(`設問数NG: ${l.title} は ${n}問（期待${want}）`);
  }
  for (const q of questions) if (!['A','B','C','D'].includes(q.correct_option)) throw new Error('不正key: ' + q.question);
  const dup = quizIds.filter((v,i)=>quizIds.indexOf(v)!==i);
  if (dup.length) throw new Error('quizId重複: ' + dup.join(','));
  console.log(`構築: quizレッスン ${quizLessons.length} / 設問 ${questions.length}`);

  const { data: vids } = await sb.from('lessons').select('id')
    .eq('course_id', cfg.courseId).eq('content_type', 'video');
  const vidSet = new Set((vids||[]).map(v=>v.id));
  const missing = videoSortUpdates.filter(v => !vidSet.has(v.id));
  if (missing.length) throw new Error('指定videoIdが本番に存在しません: ' + missing.map(m=>m.id).join(', '));

  for (const v of videoSortUpdates) {
    const { error } = await sb.from('lessons').update({ sort_order: v.sort }).eq('id', v.id);
    if (error) throw new Error('動画sort更新ERR ' + v.id + ' ' + error.message);
  }
  console.log('動画 sort を奇数に更新');
  { const { error } = await sb.from('lessons').upsert(quizLessons, { onConflict: 'id' });
    if (error) throw new Error('quizレッスンupsert ERR ' + error.message); }
  if (endExisting) {
    const { error } = await sb.from('lessons').update({ sort_order: 99 }).eq('id', cfg.courseEndQuizId);
    if (error) throw new Error('既存コース末sort更新ERR ' + error.message);
  }
  { const { error } = await sb.from('quiz_questions').delete().in('lesson_id', quizIds);
    if (error) throw new Error('設問delete ERR ' + error.message); }
  { const { error } = await sb.from('quiz_questions').insert(questions);
    if (error) throw new Error('設問insert ERR ' + error.message); }
  console.log(`反映完了: quizレッスン${quizLessons.length} / 設問${questions.length}`);

  if (cfg.outSqlPath) {
    const esc = s => String(s).replace(/'/g, "''");
    let sql = `-- ${cfg.courseLabel} クイズ(動画3問＋コース末5問) seed  自動生成\n-- 冪等: 動画sort=固定値 / quizレッスン=ON CONFLICT DO UPDATE / 設問=lesson_id単位 DELETE→INSERT\n\n`;
    for (const v of videoSortUpdates) sql += `UPDATE public.lessons SET sort_order=${v.sort} WHERE id='${v.id}';\n`;
    if (endExisting) sql += `UPDATE public.lessons SET sort_order=99 WHERE id='${cfg.courseEndQuizId}';\n`;
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
