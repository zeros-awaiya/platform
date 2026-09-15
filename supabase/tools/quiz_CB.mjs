// quiz_CB.mjs ── CB（臨床と経営のあいだ, b0cb0000）動画3問＋コース末5問クイズ 反映スクリプト
// quiz_apply_template.mjs をコース別にコピーし CONFIG を記入したもの（2026-08-06 指示箱処理で作成）。
// 出典:
//   - 動画id/URL: supabase/seed_cb_video_lessons.sql（本編=b0cbX00 / 動画=b0cbX50、X=1〜9）
//   - 設問本文: supabase/seed_cb_quiz.sql（旧設計・各レッスン5問のバンク）から
//     動画別クイズ用に各3問を精選（本文準拠・正解キーは元seedのkeyコメントと1問ずつ照合済み）。
//   - クイズid: 旧バンクと同じ b0cb0X90（動画id b0cb0X50 の index5 を '1'→'9' に変えた決定論的id）。
//     既存の quiz レッスン(sort91〜99, コース末にまとめ配置)を「動画直後(偶数sort)」へ配置し直し、
//     設問数を5→3に絞り込む形。course_end は新規5問(横断構成)を別idで新設。
//
// 実行前に必ず確認すること（詳細は quiz_CB_ROLLOUT_NOTE.md）:
//   1) MODE=list で本番の video 本数・id・sort を確認（本ファイルの videoId が実在するか）。
//   2) 本番反映(MODE=apply, デフォルト)はBOSS承認後に、SERVICE_ROLE_KEYを都度受領して実行する。
//
// 使い方:
//   ⚠️ 鍵をコマンド文字列に直接書かない（許可ルールに平文で保存される）。AGENTS.md「本番DBの操作ルール」2 を参照。
//   MODE=list COURSE_ID=b0cb0000-0000-4000-8000-000000000000 \
//     SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="$(cat \"$SBKEY_FILE\")" node supabase/tools/quiz_CB.mjs
//   SUPABASE_URL=https://wrunobvmzghzwwjtlqry.supabase.co SERVICE_ROLE_KEY="$(cat \"$SBKEY_FILE\")" node supabase/tools/quiz_CB.mjs
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';

const CONFIG = {
  courseId: 'b0cb0000-0000-4000-8000-000000000000',
  courseLabel: '臨床と経営のあいだ（CB）',
  outSqlPath: 'C:/Users/admin/dev/platform/supabase/quiz_pv/b0cb0000.sql',
  courseEndQuizId: 'b0cbf000-0000-4000-8000-000000000000',
  courseEndTitle: '総合確認テスト ─ 臨床と経営のあいだ',
  topics: [
    { videoId: 'b0cb0150-0000-4000-8000-000000000000', quizId: 'b0cb0190-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 臨床の眼と経営の眼', Q: [
        ['本文は、臨床の論理と経営の論理の関係を、どう位置づけているか。','本来は同じ一つの論理である','文法（見ている対象・時間・守るもの）が違う、別の言語である','経営の論理のほうが常に正しい','臨床の論理のほうが常に正しい','B'],
        ['本文が言う「臨床の眼」の特徴として、挙げられていないのはどれか。','個別を見る（固有名詞で、目の前の一人を見る）','いまを見る（今日のこの状態を、どう良くするか）','資源を配分する（限られたヒト・モノ・カネを振り分ける）','リスクを避ける（安全第一、取り返しのつかないことを起こさない）','C'],
        ['ステップ5「選ばなかった眼に、手当てを残す」を飛ばすと、どうなると本文は述べているか。','二つの眼が完全に統合される','判断が速くなり、迷いが消える','現場の信頼が自動的に高まる','「優しいだけの管理職」か「冷たいだけの管理職」のどちらかになる','D'],
      ] },
    { videoId: 'b0cb0250-0000-4000-8000-000000000000', quizId: 'b0cb0290-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 現場の正義と経営の正義', Q: [
        ['本文は、板挟みの消耗の正体を、どう説明しているか。','片方が間違っているのに、それを正せないから','現場と経営のどちらかが嘘をついているから','心のどこかで「正義は一つのはずだ」と信じ、間違い探しをしてしまうから','自分の能力が足りないから','C'],
        ['本文が言う「経営の正義」が守っているものとして、挙げられていないのはどれか。','事業の継続（組織を潰さない）','全体への公平（見えない他部署にも公平に配る）','未来の雇用（半年後・三年後の給料を払い続ける）','目の前の一人のケアの質','D'],
        ['本文が言う「痛まない決断」とは、どういう決断か。','片方の正義を悪者にして切り捨てた決断','二つの正義を完全に両立させた、理想的な決断','十分に時間をかけて熟慮した決断','現場と経営の両方が満足する決断','A'],
      ] },
    { videoId: 'b0cb0350-0000-4000-8000-000000000000', quizId: 'b0cb0390-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 命と数字', Q: [
        ['本文は、数字をどう定義しているか。','利益を増やすための言葉','限られた資源を、より多くの命に届けるための言葉','誰かを切り捨てるための言葉','現場の温度を奪うための言葉','B'],
        ['本文が「守りの数字（現場の質を支える土台）」として挙げる三つに含まれないのはどれか。','稼働率','人件費率','原価率','離職率','D'],
        ['「数字を幅で読む」とは、本文ではどういう意味か。','稼働率は高いほど良いと考える','人件費率は低いほど良いと考える','どの数字にも「現場が無理なく回る幅」があり、その中にいるかを読む','数字は点で正確に読み、誤差を許さない','C'],
      ] },
    { videoId: 'b0cb0450-0000-4000-8000-000000000000', quizId: 'b0cb0490-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 効率と質', Q: [
        ['本文は、効率化をどう定義しているか。','質を削ることではなく、質に使う時間を生むこと','質を削って速くすること','とにかく無駄をなくし、回転を上げること','一人ひとりがもっと速く動くこと','A'],
        ['本文が言う「三つの無駄」に含まれないのはどれか。','ただの無駄（誰の質にも貢献していない作業）','質を生む時間（患者やスタッフと向き合う価値の時間）','段取りの無駄（質を支える準備・移動・調整）','感情の無駄（個人の気分による迷い）','D'],
        ['「マイクロな効率化」と「構造的な効率化」の違いとして、本文の説明に合うのはどれか。','マイクロは仕組みを変える、構造的は各自が頑張る','マイクロは各自がもっと速く動く（努力・根性）、構造的は仕組み・段取り・役割分担そのものを変える','両者は同じものである','構造的な効率化は現場を疲弊させる','B'],
      ] },
    { videoId: 'b0cb0550-0000-4000-8000-000000000000', quizId: 'b0cb0590-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 専門職と管理職', Q: [
        ['本文は「自分でやれば早い」を、どう評価しているか。','まったくの嘘である','速さに価値はない','本当だが、その速さは「いま、この一回」だけの速さであり、チームの成長の上限になる','常に正しく、管理職も自分でやるべきだ','C'],
        ['本文が言う「管理職の手」の特徴として、挙げられていないのはどれか。','人に任せる（やれる人を増やすことに手を使う）','育ちで勝つ（半年後に動ける人を作る）','失敗を、学びに変える（取り返しのつく範囲であえて失敗させる）','自分で完結し、速さで勝つ','D'],
        ['ステップ1で、仕事を任せていいか見分ける基準として、本文が挙げるのはどれか。','失敗しても、取り返しがつくか','スタッフの勤続年数が長いか','その仕事が好きかどうか','上司が許可しているか','A'],
      ] },
    { videoId: 'b0cb0650-0000-4000-8000-000000000000', quizId: 'b0cb0690-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 一人と全体', Q: [
        ['本文は「目の前の一人」と「見えない全体」の関係を、どう捉えているか。','対立しており、どちらかを選ぶしかない','全体のほうが常に優先される','対立して見えて、実は地続きである（全体は一人ひとりの集まり）','一人のほうが常に優先される','C'],
        ['本文が言う「見えない全体」を見る視野の特徴に含まれないのはどれか。','総量で見る（割いた資源はどこかから引かれている）','波及を見る（今日の優先が、明日誰の割を食うか）','公平を見る（声の大きい一人だけが守られていないか）','固有名詞で見て、その一人の事情を最善にする','D'],
        ['「失敗①─声の大きい一人に、全体を譲り渡す」への戻り方として、本文が勧めるのはどれか。','「この一人を通すと、誰が黙って割を食うか」を固有名詞で数える','声の大きさで優先順位を決める','面倒な一人を全体最適で断る','声を上げない人は我慢できるので後回しにする','A'],
      ] },
    { videoId: 'b0cb0750-0000-4000-8000-000000000000', quizId: 'b0cb0790-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 現場の言葉と経営の言葉', Q: [
        ['本文は、上で聞いた言葉をそのまま現場に下ろすと、なぜ通じないと述べているか。','現場のスタッフが怠けているから','管理職の説明が長すぎるから','「稼働率」などは経営の言葉で、現場は「受け持ちが増える」等の別の単位で生きているから','現場が数字を理解できないほど無能だから','C'],
        ['本文が管理職を何にたとえているか。','現場と経営という二つの言語を、両方向に訳す通訳','どちらかの国の住人','上の命令を正確に伝える伝令','現場だけの代弁者','A'],
        ['現場の悲鳴を経営に訳すとき、本文が言う「相手の単位」に当たるのはどれか。','「きつい」「申し訳ない」といった体感','離職率・採用コスト・残業時間・インシデント率などの数字','個々の患者の固有名詞','その日のシフトの手触り','B'],
      ] },
    { videoId: 'b0cb0850-0000-4000-8000-000000000000', quizId: 'b0cb0890-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 守ると攻める', Q: [
        ['本文は、安全第一の身体（守りの身体）の「癖」を、どう説明しているか。','「やって失敗する」ことに痛みを感じず、「やらない」ことに強い痛みを感じる','「やらない」ことに痛みを感じず、「やって失敗する」ことに強い痛みを感じる','するリスクもしないリスクも、等しく見える','常に攻めの判断に倒れる','B'],
        ['本文が言う「攻める論理」の特徴に含まれないのはどれか。','上振れを見る（うまくいった場合を見る）','可逆を活かす（やり直せることはまず試す）','不確実を引き受ける（不確かでも前に進む）','不可逆を恐れ、確実な小さな安全を選ぶ','D'],
        ['ステップ4「攻めるなら『小さく試す』に変換する」について、本文の説明に合うのはどれか。','いきなり全面導入して一気に成果を出す','大きく賭けて一度で決める','全部署ではなく一部署、本番ではなく試行など、範囲を絞り期間を区切り戻せる形にする','希望者を募らず全員に強制する','C'],
      ] },
    { videoId: 'b0cb0950-0000-4000-8000-000000000000', quizId: 'b0cb0990-0000-4000-8000-000000000000',
      quizTitle: '確認テスト ─ 二つの眼を持つ', Q: [
        ['本文は「熟練した管理職」を、どう定義し直しているか。','二つの眼の揺れがまったくない人','二つの眼の揺れを抱えたまま、それでも判断を下せる人','どちらか片方の眼に固定できた人','常に経営の眼を優先する人','B'],
        ['本文は「揺れ」と「ぐらつき」を、どう区別しているか。','どちらも同じで、優柔不断のことである','ぐらつきは決断、揺れは逃避である','ぐらつきは決められず先延ばしすること、揺れは決めたうえでなお痛むこと','揺れは悪、ぐらつきは善である','C'],
        ['ステップ3で「主」を決める基準として、本文が挙げていないものはどれか。','取り返しがつくか','誰がいちばん困るか','半年後に、後悔するのはどちらか','上司が、どちらを望んでいるか','D'],
      ] },
  ],
  courseEndQ: [
    ['このコース『臨床と経営のあいだ』が一貫して管理職に求めているのは、次のどれか。','臨床の眼か経営の眼か、どちらか一方に早く決めて固定すること','二つの眼の揺れを消すために、感情を交えず数字だけで判断すること','二つの眼をどちらも手放さず、揺れを抱えたまま、そのつど判断を下し続けること','現場の意見はすべて経営の言葉に翻訳してから扱うこと','C'],
    ['判断の後に残る「痛み」や決めきれずに残る「罪悪感」について、このコースが繰り返し伝えていることは何か。','痛みや罪悪感は、判断を間違えたサインなので早く消すべきだ','痛みや罪悪感は、二つの眼（正義）を両方まだ持っている証であり、消そうとしなくてよい','痛みを感じなくなることが、管理職として成熟した証である','痛みは能力不足の表れであり、経験を積めば消える','B'],
    ['「数字」と「効率化」について、このコースが繰り返し否定している考え方はどれか。','数字は限られた資源をより多くの命に届けるための言葉である','効率化とは質を削って速くすることであり、数字は削るほど良いコストである','効率化とは、質を削ることではなく質に使う時間を生むことである','数字には「現場が無理なく回る幅」があり、その中にいるかを読む','B'],
    ['管理職が「手を離す」ことについて、このコースが説く成果の数え方はどれか。','今日、自分の手でどれだけ多くの仕事をこなしたか','今日、誰が一つ「できるようになったか」','今日、何件のミスを自分で未然に防いだか','今日、何時間残業を減らせたか','B'],
    ['「一人と全体」「攻めと守り」など、複数の対立軸に共通してこのコースが勧める最初の一手は何か。','どちらが正しいかを、上司に判断してもらう','対立を感じたら、まず声の大きいほうに合わせる','いま自分がどちらの眼・立場で見ているかを、言葉にして名指すこと','対立が消えるまで判断を保留すること','C'],
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
