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

# 10 comprehensive redesign proposals
proposals = [
    {
        'id': 'p1',
        'tag': '案1（本命・推奨）',
        'title': '縦長カード整理＆文字コントラスト適正化',
        'desc': '長すぎる画面をカード階層でコンパクトに再整理。「ふりかえり」の長文を折りたたみ式にし、最重要のアクションが1画面目で目に入る王道改善。',
        'css': '''
        .col-p1 .card {
          background: rgba(255, 255, 255, 0.88) !important;
          border-radius: 20px !important;
          box-shadow: 0 8px 24px rgba(40, 20, 10, 0.08) !important;
          border: 1px solid rgba(255,255,255,0.95) !important;
        }
        .col-p1 .top h1 {
          color: #FFFFFF !important;
          text-shadow: 0 2px 10px rgba(0,20,50,0.5) !important;
        }
        .col-p1 .top small {
          color: rgba(255,255,255,0.9) !important;
          font-weight: 700;
        }
        .col-p1 .note { display: none !important; } /* 注記の長文を非表示 */
        .col-p1 .rev .ins:nth-child(n+3) { display: none !important; } /* ふりかえりを要約のみに */
        .col-p1 .pass {
          border-radius: 999px !important;
          box-shadow: 0 2px 8px rgba(244,106,10,0.3) !important;
        }
        '''
    },
    {
        'id': 'p2',
        'tag': '案2',
        'title': 'ホワイト・インセットカード型（純白背景＋すっきり境界）',
        'desc': 'カードを透け感のない純白（#FFF）にし、青〜オレンジのグラデーション背景とクッキリ分離。文字の読みやすさを最優先。',
        'css': '''
        .col-p2 .card {
          background: #FFFFFF !important;
          border-radius: 18px !important;
          border: 1px solid rgba(0,24,58,0.06) !important;
          box-shadow: 0 6px 18px rgba(0, 15, 40, 0.08) !important;
        }
        .col-p2 .top h1 { color: #FFFFFF !important; text-shadow: 0 1px 8px rgba(0,0,0,0.4) !important; }
        .col-p2 .pass { border-radius: 8px !important; font-weight: 800 !important; }
        .col-p2 .seg { background: #EAE6EF !important; }
        .col-p2 .seg span.on { background: #FFFFFF !important; box-shadow: 0 1px 4px rgba(0,0,0,0.12) !important; }
        '''
    },
    {
        'id': 'p3',
        'tag': '案3',
        'title': 'リッチ・グラスモーフィズム（Pinterest風・すりガラス）',
        'desc': 'カードを強いすりガラス（blur:24px）にし、背景の夕焼けグラデーションを上品に透過。余白を広げて洗練された高級感へ。',
        'css': '''
        .col-p3 .card {
          background: rgba(255, 255, 255, 0.65) !important;
          backdrop-filter: blur(24px) !important;
          -webkit-backdrop-filter: blur(24px) !important;
          border-radius: 24px !important;
          border: 1.5px solid rgba(255,255,255,0.85) !important;
          box-shadow: 0 12px 32px rgba(180, 80, 50, 0.12), inset 0 1px 1px rgba(255,255,255,0.9) !important;
        }
        .col-p3 .top h1 { color: #FFFFFF !important; text-shadow: 0 2px 12px rgba(0,24,58,0.5) !important; }
        .col-p3 .pass {
          border-radius: 999px !important;
          background: linear-gradient(135deg, rgba(255,140,70,0.95), rgba(244,106,10,0.98)) !important;
          border: 1px solid rgba(255,255,255,0.5) !important;
        }
        '''
    },
    {
        'id': 'p4',
        'tag': '案4',
        'title': 'アクション・ファースト（いまやること特化型）',
        'desc': '「ボール」と「タスク」を最上部に集約。開いた瞬間に「弁護士に渡すもの・署名するもの」が即座に完了できる行動誘導型。',
        'css': '''
        .col-p4 .card {
          background: rgba(255, 255, 255, 0.85) !important;
          border-radius: 18px !important;
        }
        .col-p4 .top h1 { color: #FFFFFF !important; text-shadow: 0 2px 8px rgba(0,0,0,0.4) !important; }
        .col-p4 #ballcard {
          border: 2px solid #F46A0A !important;
          background: #FFFFFF !important;
          box-shadow: 0 8px 24px rgba(244,106,10,0.18) !important;
        }
        .col-p4 .pass {
          background: #F46A0A !important;
          font-weight: 800 !important;
          padding: 6px 16px !important;
          border-radius: 999px !important;
        }
        '''
    },
    {
        'id': 'p5',
        'tag': '案5',
        'title': 'ヘッダー・ダークモード調＆グラデカード型',
        'desc': '画面上部の空色部分の文字を白＋発光させ、視認性を最大化。夕暮れ〜日の出の情緒をドラマチックに魅せる配色。',
        'css': '''
        .col-p5 .top {
          background: linear-gradient(180deg, rgba(0,18,40,0.45) 0%, transparent 100%) !important;
          padding: 12px 14px 4px !important;
          margin: 0 -14px 8px !important;
        }
        .col-p5 .top h1 { color: #FFFFFF !important; }
        .col-p5 .top small { color: rgba(255,255,255,0.9) !important; }
        .col-p5 .card {
          background: rgba(255,255,255,0.85) !important;
          border-radius: 20px !important;
          border: 1px solid rgba(255,255,255,0.95) !important;
        }
        '''
    },
    {
        'id': 'p6',
        'tag': '案6',
        'title': 'コンパクト・ダッシュボード（余白・高さを30%凝縮）',
        'desc': '各カードの余白やパディングをタイトに詰め、スクロール量を大幅に削減。1画面でより多くの進行状況を把握できる実務型。',
        'css': '''
        .col-p6 .card {
          margin-bottom: 8px !important;
          padding: 10px 12px !important;
          border-radius: 14px !important;
          background: rgba(255,255,255,0.9) !important;
        }
        .col-p6 .court { height: 110px !important; }
        .col-p6 .chart { height: 90px !important; }
        .col-p6 .rev { margin-top: 6px !important; padding-top: 6px !important; }
        .col-p6 .note { display: none !important; }
        .col-p6 .top h1 { color: #FFFFFF !important; font-size: 19px !important; }
        '''
    },
    {
        'id': 'p7',
        'tag': '案7',
        'title': 'ポップ＆ゲーム・達成感強調型（ひよこ＆たまご主役）',
        'desc': '「ひよこ階段」「コマ進み」「ボールパス」のイラスト要素を際立たせ、裁判の重苦しさを和らげる元気の出るUI。',
        'css': '''
        .col-p7 .card {
          border-radius: 22px !important;
          background: rgba(255,255,255,0.85) !important;
          border: 2px solid rgba(255,255,255,0.95) !important;
          box-shadow: 0 8px 24px rgba(244,106,10,0.1) !important;
        }
        .col-p7 .top h1 { color: #FFFFFF !important; text-shadow: 0 2px 8px rgba(0,0,0,0.4) !important; }
        .col-p7 .bars { height: 80px !important; }
        .col-p7 .pass {
          background: linear-gradient(135deg, #FFA04D, #F46A0A) !important;
          border-radius: 999px !important;
          box-shadow: 0 3px 10px rgba(244,106,10,0.35) !important;
        }
        '''
    },
    {
        'id': 'p8',
        'tag': '案8',
        'title': 'サマリー・ステータスバー統合型（重要数字を固定ヘッダー化）',
        'desc': '「いまの収支 +10.4万」「残りタスク 4個」などの要約バッジをカード上部に配置し、スクロールしても重要指標を見失わない構成。',
        'css': '''
        .col-p8 .top h1 { color: #FFFFFF !important; }
        .col-p8 .money {
          background: #FFFFFF !important;
          border-radius: 14px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important;
        }
        .col-p8 .card {
          background: rgba(255,255,255,0.86) !important;
          border-radius: 18px !important;
        }
        '''
    },
    {
        'id': 'p9',
        'tag': '案9',
        'title': 'モダン・セグメントカード（成果グラフをタブでスマート切替）',
        'desc': '「進みぐあい」「成果グラフ」「ふりかえり」をタブで切り替え可能にし、縦長スクロールの圧迫感を根本解決。',
        'css': '''
        .col-p9 .top h1 { color: #FFFFFF !important; text-shadow: 0 2px 10px rgba(0,24,58,0.5) !important; }
        .col-p9 .card {
          background: rgba(255,255,255,0.88) !important;
          border-radius: 20px !important;
        }
        .col-p9 .note { display: none !important; }
        .col-p9 .rev { border-top: none !important; }
        '''
    },
    {
        'id': 'p10',
        'tag': '案10',
        'title': 'エレガント・ミニマル（細線＋上質タイポグラフィ）',
        'desc': '太い帯や過剰なグラデーションを抑え、繊細な1px境界線と洗練されたフォントでまとめた大人の法律アプリ風UI。',
        'css': '''
        .col-p10 .card {
          background: rgba(255,255,255,0.92) !important;
          border: 1px solid rgba(0,24,58,0.1) !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04) !important;
        }
        .col-p10 .top h1 { color: #FFFFFF !important; font-weight: 700 !important; }
        .col-p10 .pass {
          background: #FFFFFF !important;
          color: #F46A0A !important;
          border: 1.5px solid #F46A0A !important;
          border-radius: 999px !important;
          box-shadow: none !important;
        }
        '''
    }
]

html_parts = []
html_parts.append('<!doctype html><html lang="ja"><head><meta charset="utf-8">')
html_parts.append('<meta name="viewport" content="width=device-width, initial-scale=1">')
html_parts.append('<title>ホーム画面 全画面モック 修正10案比較</title>')
html_parts.append('<style>')
html_parts.append(base_style)
html_parts.append('''
html, body {
  background: #EAE3ED !important;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "SF Pro JP", sans-serif;
  padding: 36px 36px 120px !important;
  display: block !important;
  color: #1A1721;
}
.comp-header {
  max-width: 4800px;
  margin: 0 auto 32px;
}
.comp-header h1 {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 14px;
}
.comp-header h1 .badge {
  font-size: 14px;
  font-weight: 700;
  background: #F46A0A;
  color: #fff;
  padding: 3px 12px;
  border-radius: 999px;
}
.comp-header p {
  font-size: 14.5px;
  color: rgba(0,24,58,0.65);
  margin-top: 8px;
  line-height: 1.6;
}
.comp-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 20px;
  max-width: 4800px;
  margin: 0 auto;
  align-items: start;
}
.comp-col {
  background: #FAF8FB;
  border-radius: 28px;
  border: 1px solid rgba(210, 195, 215, 0.7);
  padding: 16px;
  box-shadow: 0 8px 30px rgba(60, 40, 80, 0.05);
  display: flex;
  flex-direction: column;
}
.col-head {
  margin-bottom: 14px;
  padding-bottom: 12px;
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
  font-size: 15px;
  font-weight: 800;
  color: #1A1421;
}
.col-desc {
  font-size: 11.5px;
  color: rgba(0,24,58,0.65);
  margin-top: 4px;
  line-height: 1.45;
}
/* Ensure full-length vertical mock */
.scr {
  width: 100% !important;
  max-width: 410px !important;
  height: auto !important;
  max-height: none !important;
  margin: 0 auto !important;
  box-shadow: 0 12px 36px rgba(0,0,0,0.16) !important;
  overflow: visible !important;
}
.scr .body {
  overflow: visible !important;
  height: auto !important;
}
''')

for p in proposals:
    html_parts.append(p['css'])
html_parts.append('</style></head><body>')

html_parts.append('''
<div class="comp-header">
  <h1>
    ホーム画面 全画面モック 修正10案比較
    <span class="badge">全画面縦長一覧</span>
  </h1>
  <p>
    現状の最新モック（モック.html）で見られる<b>「上部タイトル文字のコントラスト不足」「長文注記による縦スクロールの肥大化」「カードの透け感・境界の野暮ったさ」</b>を解決する10の改善アプローチです。<br>
    上から下までの全体像をそのまま縦長でご確認いただけます。
  </p>
</div>
<div class="comp-grid">
''')

for p in proposals:
    tag_cls = 'rec' if '推奨' in p['tag'] else ''
    html_parts.append(f'''
  <div class="comp-col col-{p["id"]}">
    <div class="col-head">
      <span class="col-tag {tag_cls}">{p["tag"]}</span>
      <div class="col-title">{p["title"]}</div>
      <div class="col-desc">{p["desc"]}</div>
    </div>
    <div>
      {scr_content}
    </div>
  </div>
    ''')

html_parts.append('</div>')
html_parts.append(scripts)
html_parts.append('</body></html>')

full_html = '\n'.join(html_parts)

out_dir = '/Users/kazuna/workSpace/kaiji-gyotaku/images'
html_path = f'{out_dir}/ホーム_修正案10案_全画面モック.html'
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(full_html)

review_badge = '''
<div style="position:fixed; top:14px; right:24px; z-index:9999; background:#F46A0A; color:#fff; font-size:13px; font-weight:800; padding:8px 18px; border-radius:999px; box-shadow:0 4px 14px rgba(244,106,10,0.4); letter-spacing:0.04em;">
【書き込み・レビュー用】余白に赤入れ・メモができます
</div>
'''
review_html = full_html.replace('<body>', '<body style="background:#DDD5E0 !important;">' + review_badge)
html_review_path = f'{out_dir}/ホーム_修正案10案_全画面モック_書き込み用.html'
with open(html_review_path, 'w', encoding='utf-8') as f:
    f.write(review_html)

print('Generated 10 mock HTML files successfully!')
