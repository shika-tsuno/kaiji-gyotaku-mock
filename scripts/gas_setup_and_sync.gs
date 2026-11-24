/**
 * ============================================================================
 * 開示請求管理アプリ × Googleスプレッドシート ＆ Googleドライブ 自動構築・連携GAS
 * ============================================================================
 * 【使い方】
 * 1. 新規Googleスプレッドシートを作成し、「拡張機能」＞「Apps Script」を開く
 * 2. このコードを貼り付けて保存し、`setupSpreadsheetAndDrive` を選択して「実行」を押す
 *    → 全5シート（掲示板目録・X目録・費用管理・タスクボール・書類Drive）と数式・初期データ、
 *       およびGoogleドライブの保管用フォルダが自動作成されます！
 * 3. 「デプロイ」＞「新しいデプロイ」＞種類「ウェブアプリ」（アクセスできるユーザー：全員）
 *    でデプロイし、発行されたWebアプリURLをアプリの「その他」タブに登録すると双方向同期できます。
 */

function setupSpreadsheetAndDrive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('開示請求管理マスター（掲示板・X・費用・アプリ連携）');

  // 1. Googleドライブに証拠・書類保管フォルダを自動構築
  const rootFolderName = '開示請求_証拠魚拓・書類保管庫';
  let rootFolder;
  const folders = DriveApp.getFoldersByName(rootFolderName);
  if (folders.hasNext()) {
    rootFolder = folders.next();
  } else {
    rootFolder = DriveApp.createFolder(rootFolderName);
    rootFolder.createFolder('01_魚拓スクリーンショット（帯付きPNG）');
    rootFolder.createFolder('02_裁判所・プロバイダ関連書類（PDF）');
    rootFolder.createFolder('03_委任状・陳述書・示談書');
  }
  PropertiesService.getScriptProperties().setProperty('DRIVE_FOLDER_ID', rootFolder.getId());

  // ==========================================================================
  // シート1: 投稿記事目録_掲示板（添付1枚目完全準拠 ＋ アプリ案件詳細拡張列）
  // ==========================================================================
  let shBbs = ss.getSheetByName('投稿記事目録_掲示板') || ss.insertSheet('投稿記事目録_掲示板');
  shBbs.clear();
  shBbs.getRange('A1:N1').merge().setValue('投稿記事目録').setHorizontalAlignment('center').setFontWeight('bold');
  const bbsHeaders = [
    // A〜N列：弁護士標準列（添付1枚目）
    '通し番号', 'レス番号', '閲覧用ＵＲＬ', '投稿日時', '投稿内容',
    '接続元ＩＰアドレス', '接続元ポート番号', '権利侵害の理由', 'プロバイダ', '下位プロバイダ',
    '任意請求日', '申立日', '発信者名', '損害賠償請求日',
    // O〜AC列：アプリ案件詳細・タイムライン・Drive連携用拡張列
    '案件No.', '媒体区分', 'スレッド名・呼び名', '進捗ステップ(1-12)', 'いまの状況',
    '状態区分', 'ボール保持者', '次回期日・期限', '期日内容', '魚拓ファイル名',
    '魚拓Drive URL', '魚拓保全日時(JST)', 'SHA-256ハッシュ', '見送り・却下・未回収理由', '手続メモ・特記事項'
  ];
  shBbs.getRange(3, 1, 1, bbsHeaders.length).setValues([bbsHeaders])
    .setFontWeight('bold').setBackground('#E8F5E9').setBorder(true, true, true, true, true, true);

  const bbsSample = [
    [1, '46785', 'https://suki-kira.com/p/102965/c/46785', '2025/6/28 8:15', '>>46784\nきっしょ！！\n画像だけじゃなくて文章までグロとか\nもう存在がセンシティブじゃん', '240a:61:5293:e56e:5c20:6fff:fea6:ce0b', '45998', '名誉感情侵害', 'ＮＴＴドコモ', '', '2025/9/23', '', '却下', '', '#12', '好き嫌い.com', 'とおりすがりC', 5, '裁判所が却下（別投稿3件あり）', '止まった', 'law', '', '', '証拠_46785.png', '', '2025-06-28 09:00:00 JST', '9e02a4f1...9971', '権利侵害がはっきりしない', '同じ相手の別投稿3件で再挑戦検討'],
    [2, '50024', 'https://suki-kira.com/p/102965/c/50024', '2025/7/2 21:10', 'K国人に同胞って言ってたのはマジで何？\nあんた日本合ってないからK国行けば？', '121.86.2.70', '38494', '名誉感情侵害', 'オプテージ', '', '2025/9/23', '', '株式会社ギガプライズ（中間事業者）\n担当：プラットフォームサービス事業部 野田利奈子\n東京都渋谷区円山町3-6 E・スペースタワー7階\n03-5459-8400\nnwsrv-division@gigaprize.co.jp', '', '#03', '好き嫌い.com', 'しつこい人A', 2, '弁護士が申立て準備中', '準備中', 'law', '', '', '証拠_50024.png', '', '2025-07-02 22:00:00 JST', '7c81b3e0...412a', '', '下位プロバイダ（ギガプライズ）へ照会進行'],
    [3, '>>88', 'https://5ch.net/test/read.cgi/xxx/88', '2026/2/8 14:22', 'また同じこと書いてて草…', '126.152.88.14', '51200', '名誉毀損・侮辱', 'ＮＴＴドコモ', '', '2026/3/10', '2026/4/15', '山田 太郎（東京都〇〇区）', '2026/9/10', '#05', '5ちゃんねる', '匿名レス88', 11, '示談了承→振込待ち（11/30）', '進行中', 'law', '2026/11/30', '振込予定（30万円）', '証拠_20020888.png', '', '2026-02-08 15:00:00 JST', '3a91c4d2...8801', '', '#04と同じ山田太郎と判明・合算示談30万円']
  ];
  shBbs.getRange(4, 1, bbsSample.length, bbsHeaders.length).setValues(bbsSample).setWrap(true);
  shBbs.setFrozenRows(3);

  // ==========================================================================
  // シート2: 投稿記事目録_X（添付2枚目完全準拠 ＋ アプリ案件詳細拡張列）
  // ==========================================================================
  let shX = ss.getSheetByName('投稿記事目録_X') || ss.insertSheet('投稿記事目録_X');
  shX.clear();
  shX.getRange('A1:J1').merge().setValue('投稿記事目録').setHorizontalAlignment('center').setFontWeight('bold');
  const xHeaders = [
    // A〜J列：弁護士標準列（添付2枚目）
    '通し番号', 'アカウント', '閲覧用ＵＲＬ', '投稿日時', '投稿内容',
    '接続元ＩＰアドレス', 'プロバイダ', '下位プロバイダ', '発信者名', '損害賠償請求日',
    // K〜AA列：アプリ案件詳細・タイムライン・Drive連携用拡張列
    '接続元ポート番号', '権利侵害の理由', '任意請求日', '申立日', '案件No.',
    '発信者No./投稿No.', '進捗ステップ(1-12)', 'いまの状況', '状態区分', 'ボール保持者',
    '次回期日・期限', '期日内容', '魚拓ファイル名', '魚拓Drive URL', '魚拓保全日時(JST)',
    'SHA-256ハッシュ', '見送り・却下理由 / 手続メモ'
  ];
  shX.getRange(3, 1, 1, xHeaders.length).setValues([xHeaders])
    .setFontWeight('bold').setBackground('#E8F5E9').setBorder(true, true, true, true, true, true);

  const xSample = [
    ['1-1', '黒饅頭\n@VNGssDyFjZ53447', 'https://x.com/VNGssDyFjZ53447/status/1960328033933619288', '午後10:06 · 2025年8月26日', 'ちゃんと診断書アップしろよ\n虚言癖あるんだから', '34.34.226.105', 'Ｇｏｏｇｌｅ ＬＬＣ', '', 'shirley.bridal.1201@gmail.com\n+819042834063（ＳＢ）\n森井沙伎（モリイサキ）\n神奈川県川崎市高津区諏訪2丁目13-2\nモルトベーネE', '2026/01/10', '', '名誉毀損・侮辱', '2025/09/10', '2025/10/15', '#06', '2001006 / 20011006', 12, '振込完了（40万円・解決）', '終了', 'law', '', '', '証拠_19603280.png', '', '2025-08-26 22:30:00 JST', '5b71e2a9...1102', '40万円の振込完了を確認'],
    ['1-2', 'ORC\n@neutralbrain_', 'https://x.com/neutralbrain_/status/1959106759424913845', '午後1:13 · 2025年8月23日', '周りが追い詰めなくてもあの人は元からあんな感じですよ 家庭内ではDV、不倫してそれを正当化して旦那追い詰めてたんですから表面化したかしてないかの違いだけです', '138.64.174.240', '朝日ネット', '', 'net.websf@gmail.com', '', '', '名誉毀損・プライバシー侵害', '2025/09/15', '2025/10/20', '#02', '2005002 / 20051002', 8, 'X側のIP開示待ち（次回期日 11/26）', '進行中', 'me', '2026/11/26', 'X側のIP開示 期日', '証拠_19591067.png', '', '2025-08-23 14:00:00 JST', '4d12f8c3...9012', 'Xの回答書を読んで関係整理'],
    ['2-1', 'ダミー次郎\n@dummy_jiro', 'https://x.com/dummy_jiro/status/1846000020081001', '午後8:10 · 2026年8月10日', '〇〇の経歴は全部嘘で犯罪歴もある。こいつのファンも詐欺グループと変わらんわ。店行くだけでもリスク。拡散希望。', '', 'ソフトバンク（予定）', '', '', '', '', '名誉毀損・侮辱・名誉感情侵害', '2026/09/11', '2026/10/20', '#04', '2008001 / 20081001', 8, 'X側のIP開示待ち', '依頼者待ち', 'law', '2026/11/12 13:30', '次回期日 - 口頭弁論', '証拠_20081001.png', '', '2026-08-10 21:18:24 JST', '8f4a3c10b7e289...d9a04ef12', '10/20 受領決定にてログ保存を要請。11/12までにX社からの開示予定。']
  ];
  shX.getRange(4, 1, xSample.length, xHeaders.length).setValues(xSample).setWrap(true);
  shX.setFrozenRows(3);

  // ==========================================================================
  // シート3: 費用・入金管理（添付3枚目完全準拠 ＋ 55%報酬・45%着手金充当・残高数式）
  // ==========================================================================
  let shCost = ss.getSheetByName('費用・入金管理') || ss.insertSheet('費用・入金管理');
  shCost.clear();
  const costHeaders = [
    // A〜G列：弁護士標準列（添付3枚目）
    '入金日', '相手方', '入金額', '内報酬（税込み55%）', '内着手金', '着手金残高', '備考',
    // H〜K列：アプリ収支カード 연동列
    '案件No.', '合意示談金額（見込含む）', '支払期日', '回収ステータス'
  ];
  shCost.getRange(1, 1, 1, costHeaders.length).setValues([costHeaders])
    .setFontWeight('bold').setBackground('#EDF2F7').setBorder(true, true, true, true, true, true);

  // 2行目：F2に初期着手金総額（¥1,980,000）
  shCost.getRange('F2').setValue(1980000).setNumberFormat('¥#,##0');

  // 3行目〜7行目：添付3枚目の実績データ
  const costData = [
    ['2025/12/05', '森由里', 200000, '#06', 200000, '2025/12/05', '入金済'],
    ['2025/11/25', '新沼志麻', 100000, '#06', 100000, '2025/11/25', '入金済'],
    ['', '西村有佳里', 100000, '#06', 100000, '', '入金済'],
    ['2026/02/27', '丸山正雄・有子', 150000, '#06', 150000, '2026/02/27', '入金済'],
    ['2026/04/20', '黒須李稲', 100000, '#06', 100000, '2026/04/20', '入金済']
  ];

  for (let r = 3; r <= 30; r++) {
    const idx = r - 3;
    if (idx < costData.length) {
      shCost.getRange(r, 1, 1, 3).setValues([[costData[idx][0], costData[idx][1], costData[idx][2]]]);
      shCost.getRange(r, 8, 1, 4).setValues([[costData[idx][3], costData[idx][4], costData[idx][5], costData[idx][6]]]);
    }
    // D列：内報酬（税込み55%）、E列：内着手金、F列：着手金残高（添付3枚目と同じ数式）
    shCost.getRange(r, 4).setFormula(`=IF(C${r}="",0,ROUND(C${r}*0.55,0))`);
    shCost.getRange(r, 5).setFormula(`=IF(C${r}="",0,C${r}-D${r})`);
    shCost.getRange(r, 6).setFormula(`=F${r - 1}-E${r}`);
  }
  // 31行目：合計行（C31=650,000 / D31=357,500 / E31=292,500）
  shCost.getRange(31, 3).setFormula('=SUM(C3:C30)').setFontWeight('bold');
  shCost.getRange(31, 4).setFormula('=SUM(D3:D30)').setFontWeight('bold');
  shCost.getRange(31, 5).setFormula('=SUM(E3:E30)').setFontWeight('bold');
  shCost.getRange('C3:E31').setNumberFormat('#,##0');
  shCost.getRange('F2:F30').setNumberFormat('¥#,##0');
  shCost.getRange('I3:I30').setNumberFormat('#,##0');
  shCost.setFrozenRows(1);

  // ==========================================================================
  // シート4: タスク・ボール管理（ホーム＆タスク画面連動）
  // ==========================================================================
  let shTask = ss.getSheetByName('タスク・ボール管理') || ss.insertSheet('タスク・ボール管理');
  shTask.clear();
  const taskHeaders = ['案件No.', '案件名', 'ボール保持者(me/law)', 'ボール件名', '期限・補足', '作業カテゴリ', '個別タスク名', '完了フラグ'];
  shTask.getRange(1, 1, 1, taskHeaders.length).setValues([taskHeaders]).setFontWeight('bold').setBackground('#FFF3E0');
  const taskSample = [
    ['#01', 'サンプル太郎', 'me', '訴訟委任状に署名・押印', '期限 11/21（金）', '印刷する', '委任状を印刷する', false],
    ['#01', 'サンプル太郎', 'me', '訴訟委任状に署名・押印', '期限 11/21（金）', '捺印・署名', '署名して印鑑を押す', false],
    ['#01', 'サンプル太郎', 'me', '訴訟委任状に署名・押印', '期限 11/21（金）', '読み込み', 'スキャンして読み込む', false],
    ['#02', '例のアカウント', 'me', 'Xの回答書を読んで返信', '弁護士から新着', '関係整理', '回答書で分かった関係を整理する', false],
    ['#06', '新しい投稿', 'me', '追加の投稿を証拠に出す', '弁護士から依頼', 'スクショ提出', '投稿のスクショを撮って提出', false],
    ['#06', '新しい投稿', 'me', '追加の投稿を証拠に出す', '弁護士から依頼', '関係整理', '前の投稿との関係を整理する', false],
    ['#11', '匿名レス702', 'me', '陳述書に署名', '期限 11/28（金）', '印刷する', '陳述書を印刷する', false],
    ['#11', '匿名レス702', 'me', '陳述書に署名', '期限 11/28（金）', '捺印・署名', '署名・捺印', false],
    ['#11', '匿名レス702', 'me', '陳述書に署名', '期限 11/28（金）', '読み込み', '読み込んで送る', false]
  ];
  shTask.getRange(2, 1, taskSample.length, taskHeaders.length).setValues(taskSample);
  shTask.setFrozenRows(1);

  // ==========================================================================
  // シート5: 書類・証拠Drive・チャット管理
  // ==========================================================================
  let shDoc = ss.getSheetByName('書類・証拠Drive・チャット管理') || ss.insertSheet('書類・証拠Drive・チャット管理');
  shDoc.clear();
  const docHeaders = ['案件No.', '種別', 'タイトル・ファイル名', 'ステータス', 'GoogleドライブFileID', 'GoogleドライブURL', 'サイズ・形式', '日時・メッセージ本文'];
  shDoc.getRange(1, 1, 1, docHeaders.length).setValues([docHeaders]).setFontWeight('bold').setBackground('#E3F2FD');
  const docSample = [
    ['#04', '申立書PDF', '発信者情報開示命令申立書', '提出済', '', rootFolder.getUrl(), 'PDF・324KB', '2026-10-20 提出'],
    ['#04', '通知書PDF', '侵害情報通知書兼送信防止措置依頼書', '提出済', '', rootFolder.getUrl(), 'PDF・188KB', '2026-10-20 提出'],
    ['#04', '陳述書PDF', '陳述書（被害経緯・精神的苦痛）', '作成予定', '', rootFolder.getUrl(), 'PDF・ひな形', '依頼者署名待ち'],
    ['#04', '魚拓PNG', '証拠_20081001.png（魚拓画像）', '保全済み', '', rootFolder.getUrl(), 'PNG・1.2MB', 'SHA-256: 8f4a3c10b7e289...d9a04ef12'],
    ['#04', 'チャット', '神田 敬一 弁護士', '既読', '', '', '17:15', '東京地裁から仮処分決定を受領しました。来週にはXからのIP開示がされる見込みです。']
  ];
  shDoc.getRange(2, 1, docSample.length, docHeaders.length).setValues(docSample);
  shDoc.setFrozenRows(1);

  // デフォルトの「シート1」があれば削除
  const defaultSheet = ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    ss.deleteSheet(defaultSheet);
  }
}

/**
 * アプリからのGETリクエスト（全シートデータのJSON取得）
 */
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const readSheet = (name) => {
    const sh = ss.getSheetByName(name);
    return sh ? sh.getDataRange().getDisplayValues() : [];
  };
  const payload = {
    ok: true,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    driveFolderId: PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID') || '',
    sheets: {
      bbs: readSheet('投稿記事目録_掲示板'),
      x: readSheet('投稿記事目録_X'),
      cost: readSheet('費用・入金管理'),
      tasks: readSheet('タスク・ボール管理'),
      docs: readSheet('書類・証拠Drive・チャット管理')
    }
  };
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
