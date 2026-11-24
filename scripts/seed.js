// Supabase 初期データ投入スクリプト (Seed Data)
// 実行方法:
// SUPABASE_URL="https://xxx.supabase.co" SUPABASE_SERVICE_ROLE_KEY="ey..." node scripts/seed.js

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("エラー: SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY の環境変数が必要です。");
  console.error("例: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=ey... node scripts/seed.js");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function runSeed() {
  console.log("=== 開示請求スイート Supabase 初期データシード開始 ===");

  // 1. ワークスペース作成
  console.log("1. ワークスペース作成中...");
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .upsert({
      name: "メイン開示請求事案（個人・弁護士共有）",
      lawyer_office: "○○法律事務所",
      lawyer_name: "担当 弁護士",
      lawyer_tel: "03-0000-0000",
      lawyer_email: "lawyer@example.com"
    })
    .select()
    .single();

  if (wsErr) throw new Error("Workspace作成失敗: " + wsErr.message);
  const workspaceId = ws.id;
  console.log("✓ ワークスペース作成完了 ID:", workspaceId);

  // 2. 書類テンプレート作成
  console.log("2. 書類テンプレート投入中...");
  const templates = [
    { code: "01", name: "訴訟委任状（X開示用）", version: 3, scope_type: "日付＋署名＋押印", note: "委任状原本を郵送", package_tags: ["x"] },
    { code: "02", name: "秘匿事項届出書面", version: 2, scope_type: "名前", note: "住所・氏名を秘匿", package_tags: ["x", "bbs"] },
    { code: "03", name: "陳述書（被害経緯のひな形）", version: 4, scope_type: "日付＋署名＋押印", note: "同定可能性・被害状況", package_tags: ["x", "bbs"] },
    { code: "04", name: "資格証明書・本人確認台紙", version: 1, scope_type: "名前", note: "免許証等を貼付", package_tags: ["x", "bbs"] },
    { code: "05", name: "訴訟委任状（掲示板用）", version: 1, scope_type: "日付＋署名＋押印", note: "日付・署名・押印", package_tags: ["bbs"] },
    { code: "06", name: "示談書", version: 2, scope_type: "日付＋署名＋押印", note: "金額・期日・署名", package_tags: ["settle"] },
    { code: "07", name: "振込先口座の届出", version: 1, scope_type: "名前", note: "口座情報", package_tags: ["settle"] }
  ];

  for (const t of templates) {
    await supabase.from("document_templates").upsert({
      workspace_id: workspaceId,
      code: t.code,
      name: t.name,
      version: t.version,
      scope_type: t.scope_type,
      note: t.note,
      package_tags: t.package_tags
    });
  }
  console.log("✓ 書類テンプレート投入完了 (7件)");

  // 3. 特定人物（本名）
  console.log("3. 特定人物投入中...");
  const { data: person, error: pErr } = await supabase
    .from("persons")
    .upsert({
      workspace_id: workspaceId,
      name: "山田 太郎",
      address: "東京都○○区○○ 1-2-3",
      tel: "090-0000-0000",
      contact_memo: "代理人なし・本人と直接示談",
      settlement_amount: 300000,
      payment_due: "2026-10-31"
    })
    .select()
    .single();

  if (pErr) throw new Error("Person作成失敗: " + pErr.message);
  console.log("✓ 特定人物作成完了 ID:", person.id);

  // 4. 発信者・アカウント
  console.log("4. 発信者データ投入中...");
  const sendersData = [
    { sender_no: "260901", name: "サンプル太郎", site: "X", handle: "@sample_user01", person_id: null },
    { sender_no: "260902", name: "例のアカウント", site: "X", handle: "@example_acc", person_id: null },
    { sender_no: "260903", name: "しつこい人A", site: "5ch", handle: "5ch ○○スレ", person_id: null },
    { sender_no: "260801", name: "ダミー次郎", site: "X", handle: "@dummy_jiro", person_id: person.id },
    { sender_no: "260802", name: "匿名レス88", site: "5ch", handle: "5ch ○○スレ >>88", person_id: person.id },
    { sender_no: "260701", name: "完了サンプル", site: "X", handle: "@done_sample", person_id: null }
  ];

  const senderMap = {};
  for (const s of sendersData) {
    const { data: insertedSender, error: sErr } = await supabase
      .from("senders")
      .upsert({
        workspace_id: workspaceId,
        sender_no: s.sender_no,
        name: s.name,
        site: s.site,
        handle: s.handle,
        person_id: s.person_id
      })
      .select()
      .single();
    if (sErr) throw new Error("Sender作成失敗: " + sErr.message);
    senderMap[s.sender_no] = insertedSender.id;
  }
  console.log("✓ 発信者データ投入完了 (6件)");

  // 5. 投稿事案 (Cases)
  console.log("5. 投稿事案データ投入中...");
  const casesData = [
    {
      case_display_id: "#01",
      post_no: "26090201",
      sender_no: "260901",
      posted_at: "2026-09-02T22:05:00+09:00",
      content_text: "「○○は詐欺師だ、絶対許さない」",
      crimes: ["名誉毀損"],
      target_url: "https://x.com/sample_user01/status/1830000000000000000",
      step: 3,
      filing_type: "発信者情報開示命令＋仮処分"
    },
    {
      case_display_id: "#02",
      post_no: "26081001",
      sender_no: "260902",
      posted_at: "2026-08-10T21:14:00+09:00",
      content_text: "「○○の経歴は全部嘘で犯罪歴がある。こいつの店には行かない方がいい」",
      crimes: ["名誉毀損", "侮辱", "名誉感情侵害"],
      target_url: "https://x.com/example_acc/status/1822000000000000000",
      step: 8,
      filing_type: "発信者情報開示命令＋仮処分",
      schedule_label: "ウェブ期日",
      schedule_date: "2026-10-30",
      url_deleted: true,
      memo: "同じ時期に別アカウントでも似た書き込みあり。#03と同一人物かも？"
    },
    {
      case_display_id: "#03",
      post_no: "26091501",
      sender_no: "260903",
      posted_at: "2026-09-15T01:20:00+09:00",
      content_text: "（スレッドへの悪質な中傷書き込み）",
      crimes: ["侮辱"],
      target_url: "https://example.5ch.net/test/read.cgi/board/1700000000/120",
      step: 2,
      filing_type: "発信者情報開示命令"
    },
    {
      case_display_id: "#04",
      post_no: "26070801",
      sender_no: "260801",
      posted_at: "2026-07-08T18:00:00+09:00",
      content_text: "「（悪質な誹謗中傷の投稿）」",
      crimes: ["名誉毀損"],
      target_url: "https://x.com/dummy_jiro/status/1810000000000000000",
      step: 11,
      filing_type: "発信者情報開示命令"
    },
    {
      case_display_id: "#07",
      post_no: "26102401",
      sender_no: "260801",
      posted_at: "2026-10-24T23:10:00+09:00",
      content_text: "「（また別の悪口の投稿）」",
      crimes: ["侮辱"],
      target_url: "https://x.com/dummy_jiro/status/1851000000000000000",
      step: 1,
      reaction_stamp: "hmm",
      reaction_at: "2026-10-25T10:00:00+09:00"
    }
  ];

  for (const c of casesData) {
    const { data: insertedCase, error: cErr } = await supabase
      .from("cases")
      .upsert({
        workspace_id: workspaceId,
        case_display_id: c.case_display_id,
        post_no: c.post_no,
        sender_id: senderMap[c.sender_no],
        posted_at: c.posted_at,
        content_text: c.content_text,
        crimes: c.crimes,
        target_url: c.target_url,
        step: c.step,
        filing_type: c.filing_type || null,
        schedule_label: c.schedule_label || null,
        schedule_date: c.schedule_date || null,
        url_deleted: !!c.url_deleted,
        reaction_stamp: c.reaction_stamp || null,
        reaction_at: c.reaction_at || null,
        memo: c.memo || null
      })
      .select()
      .single();

    if (cErr) throw new Error("Case作成失敗: " + cErr.message);

    // チャットメッセージの初期シード
    await supabase.from("case_messages").insert({
      case_id: insertedCase.id,
      sender_role: "client",
      message: "開示請求の進行管理を開始しました。"
    });
  }
  console.log("✓ 投稿事案データ投入完了 (5件)");

  console.log("\n🎉 全ての初期データシードが正常に完了しました！");
  console.log("ワークスペースID:", workspaceId);
  console.log("フロントエンドの設定やテストにご活用ください。");
}

runSeed().catch(err => {
  console.error("シード実行エラー:", err);
  process.exit(1);
});
