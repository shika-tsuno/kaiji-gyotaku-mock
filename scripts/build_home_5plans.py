import os

with open('/Users/kazuna/workSpace/kaiji-gyotaku/images/モック.html') as f:
    raw = f.read()

style_start = raw.find('<style>') + 7
style_end = raw.find('</style>')
base_style = raw[style_start:style_end]

scr_start = raw.find('<div class="scr">')
scr_end = raw.find('</div>\n<aside class="rule">') + 6
scr_content = raw[scr_start:scr_end]

script_start = raw.find('<script>document.querySelectorAll')
script_end = raw.find('</body>')
scripts = raw[script_start:script_end]

themes = [
    {
        'id': 'plan1',
        'tag': '案1（推奨）',
        'title': 'iOS標準 ピル型＆クリーン・ライト',
        'desc': 'Apple純正 HIGに準拠した完全ピル型（R:999px）。セグメント・アクションボタンの端正な統一感。安心感と親しみやすさが最高峰。',
        'css': '''
        /* 案1: Apple HIG ピル＆クリーン */
        .theme-plan1 {
          --r-btn: 999px;
          --r-card: 20px;
          --btn-shadow: 0 3px 10px rgba(244,106,10,0.22);
          --card-bg: rgba(255,255,255,0.78);
          --card-border: 1px solid rgba(255,255,255,0.95);
        }
        .theme-plan1 .card {
          border-radius: var(--r-card) !important;
          background: var(--card-bg) !important;
          border: var(--card-border) !important;
          box-shadow: 0 6px 20px rgba(60,30,50,0.06) !important;
        }
        .theme-plan1 .pass {
          border-radius: 999px !important;
          padding: 6px 14px !important;
          font-weight: 700 !important;
          letter-spacing: 0.02em;
          box-shadow: 0 2px 8px rgba(244,106,10,0.25) !important;
        }
        .theme-plan1 .pass.wait {
          background: #F0E8F5 !important;
          color: #793A9E !important;
          box-shadow: none !important;
        }
        .theme-plan1 .rbtn {
          border-radius: 999px !important;
          padding: 11px 18px !important;
          background: linear-gradient(135deg, #B574DC, #8944AB) !important;
          box-shadow: 0 4px 14px rgba(137,68,171,0.28) !important;
          font-weight: 700 !important;
        }
        .theme-plan1 .seg {
          border-radius: 999px !important;
          background: rgba(0,24,58,0.06) !important;
          padding: 3px !important;
        }
        .theme-plan1 .seg span {
          border-radius: 999px !important;
          font-size: 11.5px !important;
          padding: 3px 12px !important;
        }
        .theme-plan1 .seg span.on {
          background: #FFFFFF !important;
          color: #F46A0A !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
        }
        .theme-plan1 .pill {
          border-radius: 999px !important;
          padding: 3px 9px !important;
          font-weight: 700 !important;
        }
        .theme-plan1 .stp {
          border-radius: 10px !important;
        }
        .theme-plan1 .pop {
          border-radius: 20px !important;
          box-shadow: 0 16px 36px rgba(0,0,0,0.18) !important;
        }
        .theme-plan1 .pop .pb button {
          border-radius: 999px !important;
        }
        '''
    },
    {
        'id': 'plan2',
        'tag': '案2',
        'title': 'スクワークル型（角丸R10〜12px＆ソリッド高コントラスト）',
        'desc': '四角寄りの上品な角丸（Squircle R:10〜12px）。ボタンの輪郭がシャープに立ち、情報密度の高いダッシュボードに最適。',
        'css': '''
        /* 案2: スクワークル R12px ソリッド */
        .theme-plan2 {
          --r-btn: 10px;
          --r-card: 16px;
        }
        .theme-plan2 .card {
          border-radius: 16px !important;
          background: rgba(255,255,255,0.85) !important;
          border: 1px solid rgba(255,255,255,0.9) !important;
          box-shadow: 0 4px 14px rgba(40,20,30,0.07) !important;
        }
        .theme-plan2 .pass {
          border-radius: 8px !important;
          padding: 5px 12px !important;
          font-weight: 800 !important;
          background: #F46A0A !important;
          box-shadow: 0 2px 6px rgba(244,106,10,0.2) !important;
        }
        .theme-plan2 .pass.wait {
          background: #EDE6F2 !important;
          color: #6C3090 !important;
          border-radius: 8px !important;
        }
        .theme-plan2 .rbtn {
          border-radius: 10px !important;
          padding: 10px 16px !important;
          background: #8944AB !important;
          box-shadow: 0 3px 10px rgba(137,68,171,0.25) !important;
          font-weight: 800 !important;
        }
        .theme-plan2 .seg {
          border-radius: 8px !important;
          background: rgba(0,24,58,0.07) !important;
          padding: 2px !important;
        }
        .theme-plan2 .seg span {
          border-radius: 6px !important;
          padding: 3px 10px !important;
        }
        .theme-plan2 .seg span.on {
          border-radius: 6px !important;
          background: #FFFFFF !important;
          color: #F46A0A !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1) !important;
        }
        .theme-plan2 .pill {
          border-radius: 6px !important;
          padding: 2.5px 8px !important;
        }
        .theme-plan2 .pop .pb button {
          border-radius: 10px !important;
        }
        '''
    },
    {
        'id': 'plan3',
        'tag': '案3',
        'title': 'ネオ・グラスモーフィズム（すりガラス・多重浮遊感）',
        'desc': 'Pinterestトレンド直球。背景の日の出グラデーションを透かすガラスボタン＋繊細な白境界線。最先端のラグジュアリー感。',
        'css': '''
        /* 案3: ネオ・グラスモーフィズム */
        .theme-plan3 {
          --r-card: 22px;
        }
        .theme-plan3 .card {
          border-radius: 22px !important;
          background: rgba(255,255,255,0.62) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          border: 1px solid rgba(255,255,255,0.92) !important;
          box-shadow: 0 10px 30px rgba(100,50,40,0.1), inset 0 1px 1px rgba(255,255,255,0.8) !important;
        }
        .theme-plan3 .pass {
          border-radius: 999px !important;
          background: linear-gradient(135deg, rgba(255,140,70,0.9), rgba(244,106,10,0.95)) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.5) !important;
          box-shadow: 0 4px 12px rgba(244,106,10,0.3) !important;
          padding: 6px 14px !important;
        }
        .theme-plan3 .pass.wait {
          background: rgba(255,255,255,0.5) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255,255,255,0.7) !important;
          color: #7A39A2 !important;
        }
        .theme-plan3 .rbtn {
          border-radius: 16px !important;
          background: linear-gradient(135deg, rgba(175,82,222,0.85), rgba(137,68,171,0.95)) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255,255,255,0.4) !important;
          box-shadow: 0 6px 18px rgba(137,68,171,0.3) !important;
          padding: 11px 0 !important;
        }
        .theme-plan3 .seg {
          background: rgba(255,255,255,0.45) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(255,255,255,0.6) !important;
          border-radius: 999px !important;
        }
        .theme-plan3 .seg span.on {
          background: rgba(255,255,255,0.9) !important;
          backdrop-filter: blur(6px) !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;
        }
        .theme-plan3 .pill {
          background: rgba(255,232,214,0.75) !important;
          backdrop-filter: blur(4px) !important;
          border: 1px solid rgba(244,106,10,0.2) !important;
        }
        .theme-plan3 .pop {
          border-radius: 24px !important;
          background: rgba(255,255,255,0.85) !important;
          backdrop-filter: blur(24px) !important;
          border: 1.5px solid rgba(255,255,255,0.95) !important;
        }
        '''
    },
    {
        'id': 'plan4',
        'tag': '案4',
        'title': 'プレミアム・グラデーション＆発光シャドウ',
        'desc': '日の出オレンジと夜明けパープルのリッチなグラデーション＋色付きシャドウ（Colored Glow）。ボタンに押したくなる躍動感。',
        'css': '''
        /* 案4: プレミアム・グラデーション＆発光 */
        .theme-plan4 .card {
          border-radius: 20px !important;
          background: rgba(255,255,255,0.82) !important;
          border: 1.5px solid rgba(255,255,255,0.95) !important;
          box-shadow: 0 8px 24px rgba(180,90,50,0.08) !important;
        }
        .theme-plan4 .pass {
          border-radius: 999px !important;
          background: linear-gradient(135deg, #FF7E40 0%, #F46A0A 60%, #D85000 100%) !important;
          box-shadow: 0 4px 14px rgba(244,106,10,0.4) !important;
          padding: 6px 14px !important;
          font-weight: 800 !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
        }
        .theme-plan4 .pass.wait {
          background: linear-gradient(135deg, #FAF3FC, #F1E2F6) !important;
          color: #7B35A3 !important;
          box-shadow: 0 2px 8px rgba(175,82,222,0.15) !important;
          border: 1px solid rgba(175,82,222,0.2) !important;
        }
        .theme-plan4 .rbtn {
          border-radius: 14px !important;
          background: linear-gradient(135deg, #C570EC 0%, #9B44C4 100%) !important;
          box-shadow: 0 6px 20px rgba(155,68,196,0.35) !important;
          padding: 11px 0 !important;
          border: 1px solid rgba(255,255,255,0.3) !important;
        }
        .theme-plan4 .seg {
          background: #EAE3ED !important;
          border-radius: 12px !important;
          padding: 3px !important;
        }
        .theme-plan4 .seg span {
          border-radius: 9px !important;
        }
        .theme-plan4 .seg span.on {
          background: linear-gradient(135deg, #FFFFFF, #FFF7F2) !important;
          color: #F46A0A !important;
          box-shadow: 0 2px 8px rgba(244,106,10,0.2) !important;
        }
        .theme-plan4 .pill {
          background: linear-gradient(135deg, #FFE8D6, #FFDFC7) !important;
          box-shadow: 0 2px 6px rgba(244,106,10,0.15) !important;
          border-radius: 8px !important;
        }
        '''
    },
    {
        'id': 'plan5',
        'tag': '案5',
        'title': 'ミニマル・アウトライン＆トナル（北欧モダン・引き算の美学）',
        'desc': '塗りつぶしを抑え、淡いトーン（Tonal Tint）と極細のアウトラインで構成。文字が主役になり、長時間使っても目が疲れない設計。',
        'css': '''
        /* 案5: ミニマル・アウトライン＆トナル */
        .theme-plan5 .card {
          border-radius: 18px !important;
          background: rgba(255,255,255,0.9) !important;
          border: 1px solid rgba(0,24,58,0.08) !important;
          box-shadow: 0 2px 10px rgba(0,24,58,0.04) !important;
        }
        .theme-plan5 .pass {
          border-radius: 999px !important;
          background: #FFEFE5 !important;
          color: #D65500 !important;
          border: 1.5px solid #F46A0A !important;
          box-shadow: none !important;
          padding: 5px 12px !important;
          font-weight: 800 !important;
        }
        .theme-plan5 .pass.wait {
          background: #F7F2F9 !important;
          color: #7733A0 !important;
          border: 1px solid #D6BEE2 !important;
        }
        .theme-plan5 .rbtn {
          border-radius: 12px !important;
          background: #F7EEFA !important;
          color: #7934A3 !important;
          border: 1.5px solid #AF52DE !important;
          box-shadow: none !important;
          padding: 10px 0 !important;
          font-weight: 800 !important;
        }
        .theme-plan5 .seg {
          background: #EDE8F0 !important;
          border-radius: 8px !important;
          padding: 2px !important;
        }
        .theme-plan5 .seg span {
          border-radius: 6px !important;
        }
        .theme-plan5 .seg span.on {
          background: #FFFFFF !important;
          color: #00183A !important;
          border: 1px solid rgba(0,24,58,0.08) !important;
          box-shadow: none !important;
        }
        .theme-plan5 .pill {
          background: #FFF1E6 !important;
          color: #D65500 !important;
          border: 1px solid rgba(244,106,10,0.3) !important;
          border-radius: 6px !important;
        }
        .theme-plan5 .stp.done .ck {
          background: #248A3D !important;
        }
        '''
    }
]

html_parts = []
html_parts.append('<!doctype html><html lang="ja"><head><meta charset="utf-8">')
html_parts.append('<meta name="viewport" content="width=device-width, initial-scale=1">')
html_parts.append('<title>ホーム画面 ボタン等のデザインルール 5案比較</title>')
html_parts.append('<style>')
html_parts.append(base_style)
html_parts.append('''
html, body {
  background: #ECE5EF !important;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "SF Pro JP", sans-serif;
  padding: 36px 40px 100px !important;
  display: block !important;
  color: #1A1721;
}
.comp-header {
  max-width: 2320px;
  margin: 0 auto 32px;
}
.comp-header h1 {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;
}
.comp-header h1 .badge {
  font-size: 13px;
  font-weight: 700;
  background: #F46A0A;
  color: #fff;
  padding: 3px 10px;
  border-radius: 999px;
}
.comp-header p {
  font-size: 14px;
  color: rgba(0,24,58,0.65);
  margin-top: 8px;
  line-height: 1.6;
}
.comp-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 24px;
  max-width: 2320px;
  margin: 0 auto;
  align-items: start;
}
.comp-col {
  background: #FAF8FB;
  border-radius: 28px;
  border: 1px solid rgba(210, 195, 215, 0.7);
  padding: 18px;
  box-shadow: 0 8px 30px rgba(60, 40, 80, 0.05);
  display: flex;
  flex-direction: column;
}
.col-head {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px dashed rgba(160, 145, 170, 0.35);
}
.col-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  color: #FFFFFF;
  background: #2E2536;
  padding: 2.5px 8px;
  border-radius: 6px;
  letter-spacing: 0.04em;
  margin-bottom: 5px;
}
.col-tag.rec {
  background: #F46A0A;
}
.col-title {
  font-size: 16px;
  font-weight: 800;
  color: #1A1421;
}
.col-desc {
  font-size: 12px;
  color: rgba(0,24,58,0.65);
  margin-top: 4px;
  line-height: 1.45;
}
.rule-spec {
  margin-top: 18px;
  padding: 14px;
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid rgba(0,24,58,0.08);
  font-size: 11.5px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-spec .r-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 4px;
  border-bottom: 1px solid #F5EEF3;
}
.rule-spec .r-row:last-child { border-bottom: none; }
.rule-spec .lbl { color: rgba(0,24,58,0.55); font-weight: 600; }
.rule-spec .val { font-weight: 700; color: #00183A; }
.scr {
  width: 100% !important;
  max-width: 410px !important;
  margin: 0 auto !important;
  box-shadow: 0 12px 36px rgba(0,0,0,0.16) !important;
}
''')
for t in themes:
    html_parts.append(t['css'])
html_parts.append('</style></head><body>')

html_parts.append('''
<div class="comp-header">
  <h1>
    ホーム画面 ボタン等のデザインルール 5案比較
    <span class="badge">最新モック.html完全同期</span>
  </h1>
  <p>
    最新のホーム画面（日の出グラデーション・テニスコートボールパス・ひよこ階段・マイルストーンコマ・手続きの成果グラフ等）をベースに、<br>
    <b>ボタン、セグメント切り替え、バッジ・ピル、カードの角丸（R）とシャドウの組み合わせルール</b>を5つのデザイン思想で整理・比較しました。
  </p>
</div>
<div class="comp-grid">
''')

specs = [
    [('ボタン形状', '完全ピル（R:999px）'), ('カード角丸 (R)', '20px'), ('セグメント切替', 'ピル型スライダー'), ('シャドウ表現', 'ソフト自然陰影')],
    [('ボタン形状', 'スクワークル（R:8〜10px）'), ('カード角丸 (R)', '16px'), ('セグメント切替', 'スクワークル枠'), ('シャドウ表現', 'ソリッド控えめ')],
    [('ボタン形状', '完全ピル（R:999px）'), ('カード角丸 (R)', '22px'), ('セグメント切替', 'ガラススライダー'), ('シャドウ表現', '多重ガラスグロー')],
    [('ボタン形状', '角丸ピル（R:14〜999px）'), ('カード角丸 (R)', '20px'), ('セグメント切替', '角丸タブ'), ('シャドウ表現', 'オレンジ発光シャドウ')],
    [('ボタン形状', '完全ピル（R:999px）'), ('カード角丸 (R)', '18px'), ('セグメント切替', '極細アウトライン'), ('シャドウ表現', 'ノーシャドウ（線重視）')]
]

for i, t in enumerate(themes):
    tag_cls = 'rec' if '推奨' in t['tag'] else ''
    spec_rows = ''.join(f'<div class="r-row"><span class="lbl">{k}</span><span class="val">{v}</span></div>' for k, v in specs[i])
    html_parts.append(f'''
  <div class="comp-col">
    <div class="col-head">
      <span class="col-tag {tag_cls}">{t["tag"]}</span>
      <div class="col-title">{t["title"]}</div>
      <div class="col-desc">{t["desc"]}</div>
    </div>
    <div class="theme-{t["id"]}">
      {scr_content}
    </div>
    <div class="rule-spec">
      {spec_rows}
    </div>
  </div>
    ''')

html_parts.append('</div>')
html_parts.append(scripts)
html_parts.append('</body></html>')

full_html = '\n'.join(html_parts)

out_dir = '/Users/kazuna/workSpace/kaiji-gyotaku/images'
html_path = f'{out_dir}/ホーム画面_デザインルール5案.html'
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(full_html)

review_badge = '''
<div style="position:fixed; top:14px; right:24px; z-index:9999; background:#F46A0A; color:#fff; font-size:13px; font-weight:800; padding:8px 18px; border-radius:999px; box-shadow:0 4px 14px rgba(244,106,10,0.4); letter-spacing:0.04em;">
【書き込み・レビュー用】余白に赤入れ・メモができます
</div>
'''
review_html = full_html.replace('<body>', '<body style="background:#E2DBE5 !important;">' + review_badge)
html_review_path = f'{out_dir}/ホーム画面_デザインルール5案_書き込み用.html'
with open(html_review_path, 'w', encoding='utf-8') as f:
    f.write(review_html)

print('Generated HTML files successfully!')
