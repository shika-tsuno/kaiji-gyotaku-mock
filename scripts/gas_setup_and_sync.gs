/**
 * ============================================================================
 * 開示請求管理アプリ × Googleスプレッドシート ＆ Googleドライブ 自動構築・連携GAS
 * （全6シート・発信者情報構造化＋1セル自動分解トリガー＋担当弁護士マスタVLOOKUP連動版）
 * ============================================================================
 */

const UNIFIED_POST_HEADERS = [
  '通し番号', 'アカウント / レス番号', '閲覧用ＵＲＬ', '投稿日時', '投稿内容',
  '接続元ＩＰアドレス', '接続元ポート番号', '権利侵害の理由', 'プロバイダ', '下位プロバイダ',
  '任意請求日', '申立日',
  // M〜S列：構造化した発信者情報
  '発信者氏名（事業者・結果）', 'フリガナ', '郵便番号', '発信者住所', '電話番号（キャリア）', 'メールアドレス', '【自動結合】発信者情報まとめ',
  '損害賠償請求日',
  // U〜W列：担当弁護士マスタVLOOKUP自動反映
  '担当弁護士', '【自動】法律事務所名', '【自動】弁護士連絡先',
  // X〜AJ列：アプリ連携逆算列
  '案件No.', '媒体区分', '進捗ステップ(1-12)', 'いまの状況', '状態区分', 'ボール保持者',
  '次回期日・期限', '期日内容', '魚拓ファイル名', '魚拓Drive URL', '魚拓保全日時(JST)', 'SHA-256ハッシュ', '見送り・却下理由 / 手続メモ'
];

function setupSpreadsheetAndDrive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('開示請求管理マスター（全媒体共通列・発信者構造化・弁護士マスタ連動）');

  // 1. Googleドライブ保管フォルダ構築
  const rootFolderName = '開示請求_証拠魚拓・書類保管庫';
  const folders = DriveApp.getFoldersByName(rootFolderName);
  const rootFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(rootFolderName);
  const folderUrl = rootFolder.getUrl();
  PropertiesService.getScriptProperties().setProperty('DRIVE_FOLDER_ID', rootFolder.getId());

  // 2. 担当弁護士マスタシート（全案件からVLOOKUP参照）
  let shLaw = ss.getSheetByName('担当弁護士マスタ') || ss.insertSheet('担当弁護士マスタ');
  shLaw.clear();
  const lawHeaders = ['担当弁護士名（キー）', '法律事務所名', '電話番号', 'メールアドレス', '報酬割合（税込）', '初期着手金総額・備考'];
  shLaw.getRange(1, 1, 1, lawHeaders.length).setValues([lawHeaders]).setFontWeight('bold').setBackground('#E8F5E9');
  shLaw.getRange(2, 1, 2, lawHeaders.length).setValues([
    ['神田 敬一', '神田法律事務所', '03-3500-1234', 'kanda@kanda-law.jp', '55%', '¥1,980,000（メイン依頼先）'],
    ['佐藤 誠', '霞が関IT法律事務所', '03-3580-9999', 'sato@kasumi-it-law.jp', '55%', 'サブ依頼先']
  ]);
  shLaw.setFrozenRows(1);

  // 共通関数：投稿記事目録シート（掲示板・X）のセットアップとS列・V列・W列の数式注入
  function buildPostSheet(sheetName, rows, isRed) {
    let sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    sh.clear();
    sh.getRange('A1:T1').merge().setValue('投稿記事目録（掲示板・X 全媒体共通列フォーマット）').setHorizontalAlignment('center').setFontWeight('bold');
    sh.getRange(3, 1, 1, UNIFIED_POST_HEADERS.length).setValues([UNIFIED_POST_HEADERS]).setFontWeight('bold').setBorder(true, true, true, true, true, true);
    sh.getRange(3, 1, 1, 20).setBackground('#E8F5E9');
    sh.getRange(3, 21, 1, 16).setBackground('#FEF3C7');
    sh.getRange(4, 1, rows.length, UNIFIED_POST_HEADERS.length).setValues(rows).setWrap(true);
    if (isRed) sh.getRange(4, 1, rows.length, 20).setFontColor('#D93025');
    for (let i = 0; i < rows.length; i++) {
      const r = 4 + i;
      sh.getRange(r, 19).setFormula(`=TEXTJOIN(CHAR(10),TRUE,M${r},N${r},IF(O${r}="","","〒"&O${r}),P${r},Q${r},R${r})`);
      sh.getRange(r, 22).setFormula(`=IFERROR(VLOOKUP(U${r},'担当弁護士マスタ'!$A$2:$F$20,2,FALSE),"")`);
      sh.getRange(r, 23).setFormula(`=IFERROR(VLOOKUP(U${r},'担当弁護士マスタ'!$A$2:$F$20,3,FALSE)&" / "&VLOOKUP(U${r},'担当弁護士マスタ'!$A$2:$F$20,4,FALSE),"")`);
    }
    sh.setFrozenRows(3);
  }

  buildPostSheet('投稿記事目録_掲示板', [
    [1, '46785（とおりすがりC）', 'https://suki-kira.com/p/102965/c/46785', '2025/6/28 8:15', '>>46784\nきっしょ！！\n画像だけじゃなくて文章までグロとか\nもう存在がセンシティブじゃん', '240a:61:5293:e56e:5c20:6fff:fea6:ce0b', '45998', '名誉感情侵害', 'ＮＴＴドコモ', '', '2025/9/23', '', '却下', '', '', '', '', '', '', '', '神田 敬一', '', '', '#12', '好き嫌い.com', 5, '裁判所が却下（別投稿3件あり）', '止まった', '弁護士', '', '', '証拠_46785.png', folderUrl, '2025-06-28 09:00:00 JST', '9e02a4f1...9971', '権利侵害がはっきりしない'],
    [2, '50024（しつこい人A）', 'https://suki-kira.com/p/102965/c/50024', '2025/7/2 21:10', 'K国人に同胞って言ってたのはマジで何？\nあんた日本合ってないからK国行けば？', '121.86.2.70', '38494', '名誉感情侵害', 'オプテージ', '株式会社ギガプライズ', '2025/9/23', '', '株式会社ギガプライズ（中間事業者）担当：野田利奈子', 'カブシキガイシャギガプライズ', '150-0044', '東京都渋谷区円山町3-6 E・スペースタワー7階', '03-5459-8400', 'nwsrv-division@gigaprize.co.jp', '', '', '神田 敬一', '', '', '#03', '好き嫌い.com', 2, '弁護士が申立て準備中', '準備中', '弁護士', '', '', '証拠_50024.png', folderUrl, '2025-07-02 22:00:00 JST', '7c81b3e0...412a', '下位プロバイダ照会進行'],
    [3, '>>88（匿名レス88）', 'https://5ch.net/test/read.cgi/xxx/88', '2026/2/8 14:22', 'また同じこと書いてて草…', '126.152.88.14', '51200', '名誉毀損・侮辱', 'ＮＴＴドコモ', '', '2026/3/10', '2026/4/15', '山田 太郎', 'ヤマダ タロウ', '160-0022', '東京都新宿区新宿1-2-3', '090-1234-5678（ドコモ）', 'yamada.taro.dummy@example.com', '', '2026/9/10', '神田 敬一', '', '', '#05', '5ちゃんねる', 11, '示談了承→振込待ち（11/30）', '進行中', '弁護士', '2026/11/30', '振込予定（30万円）', '証拠_20020888.png', folderUrl, '2026-02-08 15:00:00 JST', '3a91c4d2...8801', '#04と合算示談30万円']
  ], true);

  buildPostSheet('投稿記事目録_X', [
    ['1-1', '黒饅頭\n@VNGssDyFjZ53447', 'https://x.com/VNGssDyFjZ53447/status/1960328033933619288', '午後10:06 · 2025年8月26日', 'ちゃんと診断書アップしろよ\n虚言癖あるんだから', '34.34.226.105', '', '名誉毀損・侮辱', 'Ｇｏｏｇｌｅ ＬＬＣ', '', '2025/09/10', '2025/10/15', '森井 沙伎', 'モリイ サキ', '213-0004', '神奈川県川崎市高津区諏訪2丁目13-2 モルトベーネE', '+819042834063（ＳＢ）', 'shirley.bridal.1201@gmail.com', '', '2026/01/10', '神田 敬一', '', '', '#06', 'X (Twitter)', 12, '振込完了（40万円・解決）', '終了', '弁護士', '', '', '証拠_19603280.png', folderUrl, '2025-08-26 22:30:00 JST', '5b71e2a9...1102', '40万円振込完了'],
    ['1-2', 'ORC\n@neutralbrain_', 'https://x.com/neutralbrain_/status/1959106759424913845', '午後1:13 · 2025年8月23日', '周りが追い詰めなくてもあの人は元からあんな感じですよ 家庭内ではDV、不倫してそれを正当化して旦那追い詰めてたんですから表面化したかしてないかの違いだけです', '138.64.174.240', '', '名誉毀損・プライバシー侵害', '朝日ネット', '', '2025/09/15', '2025/10/20', '（プロバイダ照会中）', '', '', '（開示待ち）', '', 'net.websf@gmail.com', '', '', '神田 敬一', '', '', '#02', 'X (Twitter)', 8, 'X側のIP開示待ち（次回期日 11/26）', '進行中', 'あなた', '2026/11/26', 'X側のIP開示 期日', '証拠_19591067.png', folderUrl, '2025-08-23 14:00:00 JST', '4d12f8c3...9012', 'Xの回答書を読んで返信'],
    ['2-1', 'ダミー次郎\n@dummy_jiro', 'https://x.com/dummy_jiro/status/1846000020081001', '午後8:10 · 2026年8月10日', '〇〇の経歴は全部嘘で犯罪歴もある。こいつのファンも詐欺グループと変わらんわ。店行くだけでもリスク。拡散希望。', '（X社開示待ち）', '', '名誉毀損・侮辱・名誉感情侵害', 'ソフトバンク（見込）', '', '2026/09/11', '2026/10/20', '（開示手続中）', '', '', '', '', '', '', '', '神田 敬一', '', '', '#04', 'X (Twitter)', 8, 'X側IP開示待ち', '依頼者待ち', '弁護士', '2026/11/12 13:30', '次回期日 - 口頭弁論', '証拠_20081001.png', folderUrl, '2026-08-10 21:18:24 JST', '8f4a3c10b7e289...d9a04ef12', '10/20受領決定・ログ保存要請']
  ], false);
}

/**
 * 【手入力の手間ゼロ機能】
 * S列（19列目：発信者情報まとめ）に1セル塊のテキストをコピペした際、
 * 自動的にM列（氏名）・N列（フリガナ）・O列（郵便番号）・P列（住所）・Q列（電話）・R列（メール）へ自動分解し、
 * S列には再びTEXTJOIN数式をセットする onEdit トリガー
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  const name = sh.getName();
  if (name !== '投稿記事目録_掲示板' && name !== '投稿記事目録_X') return;
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row < 4 || col !== 19) return;
  const raw = String(e.value || '').trim();
  if (!raw || raw.startsWith('=')) return;

  let email = '', phone = '', zip = '', person = '', kana = '', addr = '';
  const em = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (em) email = em[0];
  const ph = raw.match(/(?:\+81|0)\d[\d-]{7,13}\d(?:[（(][^）)]+[）)])?/);
  if (ph) phone = ph[0];
  const zp = raw.match(/〒?\s*(\d{3}-\d{4})/);
  if (zp) zip = zp[1];

  const prefRe = /(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/;
  const addrLines = [];
  raw.split(/\r?\n/).forEach(l => {
    let c = l.trim();
    if (email) c = c.replace(email, '').trim();
    if (phone) c = c.replace(phone, '').trim();
    c = c.replace(/〒?\s*\d{3}-\d{4}/, '').trim();
    if (!c) return;
    if (prefRe.test(c) || addrLines.length > 0) addrLines.push(c);
    else if (!person) {
      const km = c.match(/^(.+?)[（(]([ァ-ヶー\s　]+)[）)]$/);
      if (km) { person = km[1].trim(); kana = km[2].trim(); }
      else person = c;
    }
  });
  addr = addrLines.join(' ');
  sh.getRange(row, 13, 1, 6).setValues([[person, kana, zip, addr, phone, email]]);
  sh.getRange(row, 19).setFormula(`=TEXTJOIN(CHAR(10),TRUE,M${row},N${row},IF(O${row}="","","〒"&O${row}),P${row},Q${row},R${row})`);
}
