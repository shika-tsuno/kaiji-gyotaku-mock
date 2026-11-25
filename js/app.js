/* ============================================================
   Supabase 接続 & クラウド連携アダプター (SupabaseStore)
   ============================================================ */
const SupabaseStore = {
  client: null,
  currentUser: null,
  session: null,
  CONFIG_KEY: "kaiji_supabase_config",

  // デフォルト設定（window.SUPABASE_CONFIG または localStorage）
  getConfig() {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      url: window.SUPABASE_URL || "",
      anonKey: window.SUPABASE_ANON_KEY || ""
    };
  },

  saveConfig(url, anonKey) {
    const cfg = { url: (url || "").trim(), anonKey: (anonKey || "").trim() };
    localStorage.setItem(this.CONFIG_KEY, JSON.stringify(cfg));
    return this.init();
  },

  init() {
    const cfg = this.getConfig();
    if (window.supabase && cfg.url && cfg.anonKey) {
      try {
        this.client = window.supabase.createClient(cfg.url, cfg.anonKey);
        this.client.auth.onAuthStateChange((event, session) => {
          this.session = session;
          this.currentUser = session ? session.user : null;
          this.updateUiState();
        });
        this.client.auth.getSession().then(({ data: { session } }) => {
          this.session = session;
          this.currentUser = session ? session.user : null;
          this.updateUiState();
        });
        return true;
      } catch (err) {
        console.error("Supabase init error:", err);
      }
    }
    this.updateUiState();
    return false;
  },

  async signInWithOtp(email) {
    if (!this.client) throw new Error("Supabase接続先が設定されていません");
    const { data, error } = await this.client.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (this.client) {
      await this.client.auth.signOut();
      this.currentUser = null;
      this.session = null;
      this.updateUiState();
    }
  },

  updateUiState() {
    const statusBtn = document.getElementById("btn-cloud-status");
    const iconEl = document.getElementById("cloud-status-icon");
    const textEl = document.getElementById("cloud-status-text");
    const loggedInBox = document.getElementById("auth-logged-in-box");
    const loginBox = document.getElementById("auth-login-box");
    const emailEl = document.getElementById("auth-user-email");

    if (this.currentUser) {
      if (iconEl) iconEl.textContent = "🟢";
      if (textEl) textEl.textContent = "連携中";
      if (statusBtn) statusBtn.style.color = "#15803D";
      if (loggedInBox) loggedInBox.style.display = "block";
      if (loginBox) loginBox.style.display = "none";
      if (emailEl) emailEl.textContent = this.currentUser.email || "ユーザー";
    } else {
      const isConfigured = !!this.client;
      if (iconEl) iconEl.textContent = isConfigured ? "☁️" : "⚠️";
      if (textEl) textEl.textContent = isConfigured ? "クラウド連携" : "未設定";
      if (statusBtn) statusBtn.style.color = "#2563EB";
      if (loggedInBox) loggedInBox.style.display = "none";
      if (loginBox) loginBox.style.display = "block";
    }
  },

  // バックエンド (Cloud Run) の /api/capture または /capture を呼び出し
  async captureUrl(targetUrl, crimeTypes = []) {
    const endpoint = "/api/capture";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        url: targetUrl,
        saveToStorage: true,
        format: "json"
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "capture_failed" }));
      throw new Error(err.message || err.error || "撮影に失敗しました");
    }
    return await res.json();
  }
};

/* ============================================================
   UI操作・モーダル・イベント制御
   ============================================================ */
let lastCaptureResult = null;

function openAuthModal() {
  const cfg = SupabaseStore.getConfig();
  const urlInp = document.getElementById("cfg-supabase-url");
  const keyInp = document.getElementById("cfg-supabase-key");
  if (urlInp && cfg.url) urlInp.value = cfg.url;
  if (keyInp && cfg.anonKey) keyInp.value = cfg.anonKey;
  SupabaseStore.updateUiState();
  document.getElementById("auth-modal").classList.add("active");
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.remove("active");
}

function openUrlCaptureModal() {
  document.getElementById("capture-url-input").value = "";
  document.getElementById("capture-progress-box").style.display = "none";
  document.getElementById("capture-result-box").style.display = "none";
  document.getElementById("btn-exec-capture").disabled = false;
  document.getElementById("url-capture-modal").classList.add("active");
}

function closeUrlCaptureModal() {
  document.getElementById("url-capture-modal").classList.remove("active");
}

async function handleSendMagicLink() {
  const email = (document.getElementById("auth-email-input").value || "").trim();
  if (!email || !email.includes("@")) {
    showToast("有効なメールアドレスを入力してください");
    return;
  }
  const btn = document.getElementById("btn-send-magiclink");
  btn.disabled = true;
  btn.textContent = "送信中...";
  try {
    await SupabaseStore.signInWithOtp(email);
    showToast("✉️ ログインリンクを送信しました！メールをご確認ください");
    closeAuthModal();
  } catch (err) {
    showToast("送信失敗: " + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "✉️ ログインリンクを送信";
  }
}

async function handleSignOut() {
  await SupabaseStore.signOut();
  showToast("ログアウトしました");
  closeAuthModal();
}

function handleSaveSupabaseConfig() {
  const url = document.getElementById("cfg-supabase-url").value;
  const key = document.getElementById("cfg-supabase-key").value;
  const ok = SupabaseStore.saveConfig(url, key);
  if (ok) {
    showToast("✅ Supabaseに再接続しました");
  } else {
    showToast("URLとAnon Keyを入力してください");
  }
}

async function handleExecuteCapture() {
  const urlInp = document.getElementById("capture-url-input");
  const url = (urlInp.value || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    showToast("https:// から始まるURLを入力してください");
    return;
  }

  const crimes = [...document.querySelectorAll('input[name="crime-type"]:checked')].map(e => e.value);
  const btn = document.getElementById("btn-exec-capture");
  const progressBox = document.getElementById("capture-progress-box");
  const resultBox = document.getElementById("capture-result-box");

  btn.disabled = true;
  progressBox.style.display = "block";
  resultBox.style.display = "none";

  try {
    const res = await SupabaseStore.captureUrl(url, crimes);
    lastCaptureResult = { ...res, crimes, originalUrl: url };

    progressBox.style.display = "none";
    resultBox.style.display = "block";

    document.getElementById("result-sha256").textContent = res.sha256 || "計算完了";
    const imgEl = document.getElementById("result-preview-img");
    // 署名付きURLがあればそれを表示、なければ直接APIまたはプレースホルダー
    if (res.storage && res.storage.signedUrl) {
      imgEl.src = res.storage.signedUrl;
    } else {
      imgEl.src = "/api/capture?url=" + encodeURIComponent(url);
    }
    showToast("✅ 魚拓PNGの撮影＆SHA-256保全に成功！");
  } catch (err) {
    progressBox.style.display = "none";
    btn.disabled = false;
    showToast("保全失敗: " + err.message);
  }
}

function handleAddToCaseList() {
  closeUrlCaptureModal();
  showToast("事案一覧に保全記録を追加しました");
  handleTabClick("cases");
}

/* ============================================================
   ビュー遷移 ＆ 5タブ制御（案件・分析・ホーム・タスク・その他）
   ============================================================ */
const TAB_VIEW_MAP = {
  cases: 'view-cases',
  analytics: 'view-analytics',
  home: 'view-home',
  tasks: 'view-tasks',
  more: 'view-qa'
};
const MAIN_VIEW_IDS = new Set(Object.values(TAB_VIEW_MAP));
let currentViewId = 'view-home';
const viewHistory = [];

function switchView(viewId, recordHistory = true) {
  if (recordHistory && currentViewId && currentViewId !== viewId) {
    viewHistory.push(currentViewId);
    if (viewHistory.length > 20) viewHistory.shift();
  }
  document.querySelectorAll('.view-page').forEach(el => {
    el.classList.remove('active');
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
    currentViewId = viewId;
  }
  // グラフを含むビューが表示されたら幅を再計測して描画
  if (viewId === 'view-analytics' || viewId === 'view-home') {
    requestAnimationFrame(() => {
      if (window.redrawAnalytics) window.redrawAnalytics();
    });
  }
}

function goBackView() {
  const prev = viewHistory.pop() || 'view-cases';
  switchView(prev, false);
  // メインタブに戻った場合はアクティブタブも同期
  Object.entries(TAB_VIEW_MAP).forEach(([tab, vid]) => {
    if (vid === prev) {
      document.querySelectorAll('.tab-item').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-tab') === tab);
      });
    }
  });
}

function handleTabClick(tabName) {
  document.querySelectorAll('.tab-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === tabName);
  });
  const viewId = TAB_VIEW_MAP[tabName] || 'view-home';
  if (currentViewId === viewId) {
    const el = document.getElementById(viewId);
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  switchView(viewId, true);
}

function openChatFromBubble() {
  switchView('view-post-detail', true);
  switchKarteTab('chat');
}

const KARTE_TITLES = {
  post: '投稿詳細',
  account: 'アカウント詳細',
  sender: '発信者情報',
  docs: '書類・証拠',
  chat: 'チャット'
};

function switchKarteTab(tabKey) {
  const valid = KARTE_TITLES[tabKey] ? tabKey : 'post';
  document.querySelectorAll('#view-post-detail .karte-tab').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-ktab') === valid);
  });
  document.querySelectorAll('#view-post-detail .karte-panel').forEach(el => {
    el.classList.toggle('active', el.id === 'kpanel-' + valid);
  });
  const titleEl = document.getElementById('detail-nav-title');
  if (titleEl) titleEl.textContent = KARTE_TITLES[valid];
  const detailView = document.getElementById('view-post-detail');
  if (detailView) detailView.scrollTop = 0;
}

function sendKarteChat() {
  const input = document.getElementById('karte-chat-input');
  const box = document.getElementById('karte-chat-messages');
  if (!input || !box) return;
  const text = input.value.trim();
  if (!text) return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const div = document.createElement('div');
  div.style.cssText = 'display:flex; justify-content:flex-end;';
  div.innerHTML = `<div style="background:linear-gradient(135deg, #FF8A65 0%, #FF6E6E 100%); color:#FFFFFF; padding:9px 12px; border-radius:14px 14px 4px 14px; font-size:12px; line-height:1.45; max-width:82%; box-shadow:0 3px 10px rgba(255,110,110,0.25);">
    ${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    <div style="font-size:9.5px; color:rgba(255,255,255,0.85); text-align:right; margin-top:3px;">送信済 ${hh}:${mm}</div>
  </div>`;
  box.appendChild(div);
  input.value = '';
  showToast('弁護士へメッセージを送信しました');
}

function openQuickModal() {
  document.getElementById('quick-modal').classList.add('active');
}
function closeQuickModal() {
  document.getElementById('quick-modal').classList.remove('active');
}

function closeModalIfOutside(e, modalEl) {
  if (e.target === modalEl) {
    modalEl.classList.remove('active');
  }
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ============================================================
   1. 案件一覧（第33版 完全移植）
   ============================================================ */
function initCasesView() {
  const $ = id => document.getElementById(id);
  if (!$('c33-list')) return;

  const D = [
    { no: 1, name: 'サンプル太郎', sv: 'X', id: '@sample_user01', st: '依頼者待ち', date: '2026-03-14', post: 'A・Bの件、まだ許せません…', snd: '', pv: '', step: 3, k: 'warn', ps: '私の書類発送待ち（期限あと2日）' },
    { no: 2, name: '例のアカウント', sv: 'X', id: '@example_acc', st: '進行中', date: '2026-05-02', post: '〇〇はいつも嘘ばかり…', snd: '', pv: '朝日ネット', step: 8, k: 'go', ps: 'X側のIP開示待ち（次回期日 11/26）' },
    { no: 3, name: 'しつこい人A', sv: '5ch', id: '〇〇スレ >>345', st: '準備中', date: '2026-06-21', post: 'あいつの住所知ってる人いる？…', snd: '', pv: 'オプテージ', step: 2, k: 'go', ps: '弁護士が申立て準備中' },
    { no: 4, name: 'ダミー次郎', sv: 'X', id: '@dummy_jiro', st: '依頼者待ち', date: '2026-08-10', post: '頭おかしいんじゃないの…', snd: '', pv: 'ソフトバンク', step: 8, k: 'warn', ps: 'Xの回答書が届いた（結果記録待ち）' },
    { no: 5, name: '匿名レス88', sv: '5ch', id: '〇〇スレ >>88', st: '進行中', date: '2026-02-08', post: 'また同じこと書いてて草…', snd: '山田 太郎', pv: 'ドコモ', step: 11, k: 'go', ps: '示談了承→振込待ち（11/30）' },
    { no: 6, name: 'アンチアカウントZ', sv: 'X', id: '@anti_z99', st: '終了', date: '2026-01-19', post: '消えてほしい…', snd: '佐藤 花子', pv: 'ソフトバンク', step: 12, k: 'done', ps: '振込完了（40万円・解決）' },
    { no: 7, name: '通りすがりB', sv: 'X', id: '@passerby_b', st: '進行中', date: '2026-09-30', post: 'ネットで有名な〇〇って…', snd: '', pv: '', step: 7, k: 'go', ps: '仮処分の申立て中' },
    { no: 8, name: '匿名レス512', sv: '5ch', id: '〇〇スレ >>512', st: '止まった', date: '2026-04-11', post: '晒しとくわ…', snd: '特定できず', pv: 'VPN', step: 5, k: 'stop', ps: '個人特定不可で停止' },
    { no: 9, name: '匿名レス95', sv: '5ch', id: '〇〇スレ >>95', st: '進行中', date: '2026-02-09', post: '前にも書いたけど…', snd: '山田 太郎', pv: 'ドコモ', step: 10, k: 'go', ps: '示談交渉中' },
    { no: 10, name: 'くちわるガール', sv: 'X', id: '@kuchiwaru_g', st: '準備中', date: '2026-10-21', post: 'あの人ほんと最悪…', snd: '', pv: '', step: 2, k: 'go', ps: '弁護士が申立書を作成中' },
    { no: 11, name: '匿名レス702', sv: '5ch', id: '〇〇スレ >>702', st: '準備中', date: '2026-11-02', post: '特定してやろうか…', snd: '', pv: '', step: 1, k: 'go', ps: '証拠を整理中（提出前）' },
  ];

  const pad = n => '#' + String(n).padStart(2, '0');
  const ICON = { warn: '⚠️ ', go: '→ ', done: '✓ ', stop: '■ ' };
  const ST = ['依頼者待ち', '準備中', '進行中', '終了', '止まった'];
  const SVN = { X: '𝕏 (Twitter)', '5ch': '5ちゃんねる' };
  const GROUPS = [['sv', '媒体別'], ['st', '進捗別'], ['pv', 'プロバイダ別'], ['date', '月別'], ['snd', '発信者別']];
  const SORTS = [['no', 'No.'], ['date', '投稿日'], ['name', '名前'], ['step', '進捗'], ['st', '状態']];
  const V = { icon: ['アイコン', true], no: ['No.', true], acc: ['アカウント名', true], post: ['投稿内容', false], snd: ['発信者情報', true], ps: ['いまの状況', true], bar: ['進捗バー', true] };
  let G = 'sv', S = 'no', asc = true;
  const closed = new Set();

  const KEY = { no: d => d.no, date: d => d.date, name: d => d.name, step: d => d.step, st: d => ST.indexOf(d.st) * 100 + d.step };
  const gkey = d => G === 'sv' ? SVN[d.sv] : G === 'st' ? d.st : G === 'pv' ? (d.pv || 'プロバイダ未判明') : G === 'date' ? d.date.slice(0, 7).replace('-', '年') + '月' : (d.snd && d.snd !== '特定できず' ? d.snd : d.snd || '未特定');

  function renderChips() {
    $('c33-chips').innerHTML = GROUPS.map(([k, l]) => `<span class="c33-chip${k === G ? ' on' : ''}" data-k="${k}">${l}</span>`).join('') + '<span class="c33-per" id="c33-per">期間指定<small>▼</small></span>';
    $('c33-chips').querySelectorAll('.c33-chip').forEach(c => {
      c.onclick = () => { G = c.dataset.k; closed.clear(); renderChips(); renderList(); };
    });
    $('c33-per').onclick = () => {
      const p = $('c33-prow');
      p.classList.toggle('on');
      if (!p.classList.contains('on')) { $('c33-from').value = ''; $('c33-to').value = ''; renderList(); }
    };
  }

  function renderMenus() {
    $('c33-vm').innerHTML = '<h6>一覧に出す情報</h6>' + Object.entries(V).map(([k, [l, c]]) => `<div data-k="${k}"><i>${c ? '✓' : ''}</i>${l}</div>`).join('');
    $('c33-vm').querySelectorAll('div').forEach(x => {
      x.onclick = e => { e.stopPropagation(); V[x.dataset.k][1] = !V[x.dataset.k][1]; renderMenus(); renderList(); };
    });
    $('c33-sm').innerHTML = '<h6>並べ替え</h6>' + SORTS.map(([k, l]) => `<div data-k="${k}"><i>${k === S ? '✓' : ''}</i>${l}</div>`).join('') + `<h6>順番</h6><div data-d="1"><i>${asc ? '✓' : ''}</i>小さい順 ↑</div><div data-d="0"><i>${asc ? '' : '✓'}</i>大きい順 ↓</div>`;
    $('c33-sm').querySelectorAll('div').forEach(x => {
      x.onclick = e => {
        e.stopPropagation();
        if (x.dataset.d) asc = x.dataset.d === '1';
        else S = x.dataset.k;
        $('c33-sl').textContent = SORTS.find(s => s[0] === S)[1];
        $('c33-sd').textContent = asc ? '↑' : '↓';
        renderMenus();
        renderList();
      };
    });
  }

  $('c33-vb').onclick = e => { e.stopPropagation(); $('c33-sm').classList.remove('on'); $('c33-vm').classList.toggle('on'); };
  $('c33-sb').onclick = e => { e.stopPropagation(); $('c33-vm').classList.remove('on'); $('c33-sm').classList.toggle('on'); };
  document.addEventListener('click', () => { $('c33-vm').classList.remove('on'); $('c33-sm').classList.remove('on'); });

  function buildRow(d) {
    const end = d.k === 'done' || d.k === 'stop';
    const sub = [V.acc[1] ? d.id : '', V.snd[1] && d.snd ? `${d.snd}（${d.pv}）` : ''].filter(Boolean).join(' · ');
    return `<div class="c33-row${end ? ' end' : ''}" data-no="${d.no}">${V.icon[1] ? `<span class="c33-av">${d.name[0]}</span>` : ''}<div class="c33-mid">
      <div class="c33-t1">${V.no[1] ? `<span class="c33-no">${pad(d.no)}</span>` : ''}<span class="c33-nm">${d.name}</span></div>
      ${sub ? `<div class="c33-sub">${sub}</div>` : ''}${V.post[1] ? `<div class="c33-post">「${d.post}」</div>` : ''}
      ${V.ps[1] ? `<div class="c33-stl ${d.k}">${ICON[d.k]}${d.ps}</div>` : ''}</div>
      <div class="c33-rt"><span class="c33-chev">›</span>${V.bar[1] ? `<span class="c33-bar ${d.k}"><i style="width:${d.step / 12 * 100}%"></i></span>` : '<span></span>'}</div></div>`;
  }

  function renderList() {
    const q = $('c33-q').value.trim(), f = $('c33-from').value, t = $('c33-to').value;
    let L = D.filter(d => (!f || d.date >= f) && (!t || d.date <= t) && (!q || (d.name + d.id + pad(d.no) + d.no).includes(q)));
    L.sort((a, b) => {
      const x = KEY[S](a), y = KEY[S](b);
      const k = (typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'ja')) || a.no - b.no;
      return asc ? k : -k;
    });
    let order = [...new Set(L.map(gkey))];
    if (G === 'sv') order = Object.values(SVN).filter(k => order.includes(k));
    if (G === 'st') order = ST.filter(k => order.includes(k));
    if (G === 'date') order.sort().reverse();
    const html = order.map(k => {
      const R = L.filter(d => gkey(d) === k);
      return `<div class="c33-gh${closed.has(k) ? ' cl' : ''}" data-k="${k}"><span>${k}</span><span>${R.length}件</span></div><div class="c33-grp">${R.map(buildRow).join('')}</div>`;
    }).join('');
    $('c33-list').style.setProperty('--c33-sep', V.icon[1] ? '62px' : '16px');
    $('c33-list').innerHTML = html || '<div class="c33-empty">該当する案件はありません</div>';
    $('c33-list').querySelectorAll('.c33-gh').forEach(h => {
      h.onclick = () => { const k = h.dataset.k; closed.has(k) ? closed.delete(k) : closed.add(k); renderList(); };
    });
    $('c33-list').querySelectorAll('.c33-row').forEach(r => {
      r.onclick = () => { switchView('view-post-detail', true); switchKarteTab('post'); };
    });
  }

  ['c33-q', 'c33-from', 'c33-to'].forEach(id => $(id).addEventListener('input', renderList));
  renderChips();
  renderMenus();
  renderList();
}

/* ============================================================
   2. ホーム画面：ひよこ階段 ＆ 開示の進みぐあい（マイルストーン）
   ============================================================ */
function initHomeWidgets() {
  const barsEl = document.getElementById('home-bars');
  if (barsEl) {
    const STG = [['🥚', 3, '#F2DDD7'], ['🐣', 4, '#E8BFB5'], ['🐤', 2, '#D89080'], ['🐔', 1, '#C2432A']];
    const mx = Math.max(...STG.map(s => s[1]));
    barsEl.innerHTML = STG.map(([e, n, c]) => `<div class="sr-col"><span class="em">${e}</span><span class="n">${n}<small>件</small></span><span class="sbar" style="height:${n / mx * 64}px;background:${c}"></span></div>`).join('');
    barsEl.querySelectorAll('.sr-col').forEach(el => { el.onclick = () => handleTabClick('cases'); });
  }

  const msEl = document.getElementById('home-ms');
  if (msEl) {
    const MED_DEF = { x: ['X', '#111111'], suki: ['好き嫌い.com', '#FFFFFF'], ch5: ['5ちゃんねる', '#2E9E5B'], ig: ['Instagram', '#E1306C'], yt: ['YouTube', '#E53935'] };
    let MED = {};
    try { MED = JSON.parse(localStorage.getItem('komaColor') || '{}'); } catch (e) {}
    const mc = k => MED[k] || MED_DEF[k][1];
    const MS = [
      ['スクショ提出', '弁護士へ渡した', ['x', 'suki'], 'done'],
      ['開示請求中', 'IP・発信者情報', ['x', 'x', 'ch5'], 'active'],
      ['プロバイダ回答待ち', '契約者情報', ['suki', 'ig'], 'later'],
      ['相手判明', '氏名・住所', ['x', 'yt'], 'later'],
      ['解決', '示談・判決', ['x'], 'goal']
    ];
    const pawn = (c, d) => `<svg viewBox="0 0 16 24" style="animation-delay:${d * 60}ms"><ellipse cx="8" cy="22" rx="6.5" ry="1.8" fill="rgba(0,24,58,.18)"/><g fill="${c}" stroke="rgba(0,24,58,.45)" stroke-width=".8"><path d="M8 10c-2.6 0-4 5.5-5.2 10.5h10.4C12 15.5 10.6 10 8 10z"/><circle cx="8" cy="6.5" r="4.2"/></g><circle cx="6.6" cy="5.2" r="1.3" fill="#fff" opacity=".5"/></svg>`;
    let ki = 0;
    const used = new Set(MS.flatMap(m => m[2]));
    msEl.innerHTML = MS.map(([nm, sb, ks, state], i) => {
      const cls = state === 'active' ? ' is-active' : state === 'later' ? ' is-later' : state === 'goal' ? ' goal' : '';
      return `<div class="sr-mr${cls}"><span class="dot">${state === 'goal' ? '🏁' : ''}</span><span class="nm">${nm}<small>${sb}</small></span><span class="kp">${ks.length ? ks.map(k => pawn(mc(k), ki++)).join('') : '<span class="none">—</span>'}</span><b>${ks.length}<small>件</small></b></div>`;
    }).join('')
      + `<div class="sr-mleg">${[...used].map(k => `<span><i style="background:${mc(k)}"></i>${MED_DEF[k][0]}</span>`).join('')}</div>`;
    msEl.querySelectorAll('.sr-mr').forEach(el => { el.onclick = () => handleTabClick('cases'); });
  }
}

/* ============================================================
   3. ボールの受け渡し ＆ あなたのタスク（ホーム ＆ タスク画面同期）
   ============================================================ */
function initBallsAndTasks() {
  const B = [
    { o: 'me', no: '#01', nm: 'サンプル太郎', t: '訴訟委任状に署名・押印', d: '期限 11/21（金）', st: [['print', '委任状を印刷する'], ['sign', '署名して印鑑を押す'], ['scan', 'スキャンして読み込む']] },
    { o: 'me', no: '#02', nm: '例のアカウント', t: 'Xの回答書を読んで返信', d: '弁護士から新着', st: [['org', '回答書で分かった関係を整理する']] },
    { o: 'me', no: '#06', nm: '新しい投稿', t: '追加の投稿を証拠に出す', d: '弁護士から依頼', st: [['shot', '投稿のスクショを撮って提出'], ['org', '前の投稿との関係を整理する']] },
    { o: 'me', no: '#11', nm: '匿名レス702', t: '陳述書に署名', d: '期限 11/28（金）', st: [['print', '陳述書を印刷する'], ['sign', '署名・捺印'], ['scan', '読み込んで送る']] },
    { o: 'law', no: '#03', nm: 'しつこい人A', t: '申立書を作成中', d: '弁護士が準備中' },
    { o: 'law', no: '#04', nm: 'ダミー次郎', t: 'X側のIP開示を待っている', d: '期日 11/26' },
    { o: 'law', no: '#07', nm: '通りすがりB', t: '仮処分の申立て中', d: '裁判所の判断待ち' },
    { o: 'law', no: '#09', nm: '匿名レス95', t: '示談交渉中', d: '相手の返事待ち' },
    { o: 'law', no: '#10', nm: 'くちわるガール', t: '申立書を作成中', d: '弁護士が準備中' },
  ];
  const TK = [
    ['print', '🖨️', '印刷する'],
    ['sign', '✍️', '捺印・署名'],
    ['scan', '📷', '読み込み'],
    ['shot', '🖼️', 'スクショ提出'],
    ['org', '🗂️', '関係整理']
  ];

  const makeFig = (idPrefix, main, dark, flip, extra) => `<defs><linearGradient id="${idPrefix}g${flip}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${main}"/><stop offset="1" stop-color="${dark}"/></linearGradient></defs>
    <g transform="${flip ? 'translate(100 0) scale(-1 1)' : ''}">
    <ellipse cx="50" cy="130" rx="30" ry="4" fill="rgba(80,40,40,.12)"/>
    <rect x="34" y="104" width="12" height="26" rx="6" fill="${dark}"/><rect x="54" y="104" width="12" height="26" rx="6" fill="${dark}"/>
    <path d="M30 74 Q20 84 18 96" stroke="${dark}" stroke-width="11" stroke-linecap="round" fill="none"/>
    <rect x="26" y="56" width="48" height="58" rx="22" fill="url(#${idPrefix}g${flip})"/>
    <path d="M70 72 Q86 76 92 66" stroke="${main}" stroke-width="11" stroke-linecap="round" fill="none"/>
    ${extra}
    <circle cx="50" cy="32" r="25" fill="url(#${idPrefix}g${flip})"/>
    <ellipse cx="44" cy="24" rx="9" ry="5" fill="rgba(255,255,255,.35)"/>
    <ellipse cx="54" cy="33" rx="4.2" ry="5.2" fill="#fff"/><ellipse cx="67" cy="33" rx="4.2" ry="5.2" fill="#fff"/>
    <circle cx="55.5" cy="34" r="2.3" fill="#2A2530"/><circle cx="68.5" cy="34" r="2.3" fill="#2A2530"/>
    <path d="M57 43 Q61 47 66 43" stroke="#2A2530" stroke-width="2" stroke-linecap="round" fill="none"/>
    <ellipse cx="49" cy="41" rx="4" ry="2.4" fill="rgba(255,255,255,.35)"/>
    </g>`;

  const courts = [
    { prefix: 'hm', court: document.getElementById('home-court'), blist: document.getElementById('home-blist'), softPass: false },
    { prefix: 'tk', court: document.getElementById('task-court'), blist: document.getElementById('task-blist'), softPass: true }
  ].filter(c => c.court && c.blist);

  let sel = 'me';

  // 人型SVGを描画
  courts.forEach(({ prefix, court }) => {
    court.querySelector('.sr-side.me .sr-fig').innerHTML = makeFig(prefix, '#FF9A7A', '#EE5E43', 0, '');
    court.querySelector('.sr-side.law .sr-fig').innerHTML = makeFig(prefix, '#CBBDF4', '#A796E2', 1, '<path d="M50 58 L45 66 L50 86 L55 66 Z" fill="#6E5FA8"/><circle cx="62" cy="70" r="4" fill="#F5C542" stroke="#fff" stroke-width="1"/>');

    // サイド切替
    court.querySelectorAll('.sr-side').forEach(s => {
      s.onclick = () => { sel = s.dataset.s; renderAll(); };
    });

    // ドラッグ＆ドロップ
    court.querySelector('.sr-side.me .sr-pile').addEventListener('pointerdown', e => {
      if (!e.target.classList.contains('sr-ball')) return;
      e.preventDefault();
      e.stopPropagation();
      const mine = B.filter(b => b.o === 'me');
      if (!mine.length) return;
      const target = mine.find(b => !b.st.every(z => z[2])) || mine[0];
      const cr = court.getBoundingClientRect(), law = court.querySelector('.sr-side.law');
      const g = document.createElement('span');
      g.className = 'sr-ball sr-ghost';
      court.appendChild(g);
      e.target.style.visibility = 'hidden';
      const mv = ev => {
        g.style.left = (ev.clientX - cr.left) + 'px';
        g.style.top = (ev.clientY - cr.top) + 'px';
        const r = law.getBoundingClientRect();
        law.classList.toggle('drop', ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom);
      };
      mv(e);
      const up = () => {
        removeEventListener('pointermove', mv);
        removeEventListener('pointerup', up);
        g.remove();
        e.target.style.visibility = '';
        const hit = law.classList.contains('drop');
        law.classList.remove('drop');
        if (hit) { window.__skipClick = Date.now(); tryPass(court, target.no); }
      };
      addEventListener('pointermove', mv);
      addEventListener('pointerup', up);
    });
  });

  function showPop(court, no) {
    court.querySelector('.sr-pop')?.remove();
    const b = B.find(x => x.no === no);
    const d = document.createElement('div');
    d.className = 'sr-pop';
    const paint = () => {
      const all = b.st.every(z => z[2]);
      d.innerHTML = `<div class="sr-pop-pt">${all ? '準備OK！渡そう' : 'この作業をやろう！'}</div>
        <div class="sr-pop-ps">${b.no} ${b.nm} · ${b.t}</div>
        ${b.st.map((x, i) => `<div class="sr-stp${x[2] ? ' done' : ''}" data-i="${i}" style="padding-left:0"><span class="ck">✓</span><span class="sr-stp-lbl">${x[1]}</span></div>`).join('')}
        <div class="sr-pop-pb"><button type="button" class="sr-pop-later">あとで</button><button type="button" class="sr-pop-go"${all ? '' : ' disabled'}>弁護士に渡す</button></div>`;
      d.querySelectorAll('.sr-stp').forEach(x => {
        x.onclick = e => { e.stopPropagation(); const s = b.st[+x.dataset.i]; s[2] = !s[2]; paint(); renderAll(); };
      });
      d.querySelector('.sr-pop-later').onclick = e => { e.stopPropagation(); d.remove(); };
      d.querySelector('.sr-pop-go').onclick = e => { e.stopPropagation(); d.remove(); throwBall(court, no); };
    };
    paint();
    d.onclick = e => e.stopPropagation();
    court.appendChild(d);
  }

  function tryPass(court, no) {
    const b = B.find(x => x.no === no);
    if (b.st && !b.st.every(z => z[2])) showPop(court, no);
    else throwBall(court, no);
  }

  function throwBall(court, no) {
    const b = B.find(x => x.no === no);
    const cr = court.getBoundingClientRect();
    const from = court.querySelector('.sr-side.me .sr-pile').getBoundingClientRect();
    const to = court.querySelector('.sr-side.law .sr-pile').getBoundingClientRect();
    b.o = 'law';
    renderAll();
    const f = document.createElement('span');
    f.className = 'sr-ball sr-fly';
    court.appendChild(f);
    const x0 = from.left - cr.left + 12, y0 = from.top - cr.top, x1 = to.left - cr.left + 12, y1 = to.top - cr.top, t0 = performance.now(), D = 700;
    (function step(t) {
      const k = Math.min(1, (t - t0) / D);
      const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - 90 * 4 * k * (1 - k);
      f.style.left = x + 'px';
      f.style.top = y + 'px';
      if (k < 1) requestAnimationFrame(step); else f.remove();
    })(t0);
    showToast(`${b.no} のボールを弁護士に渡しました`);
  }

  function renderTasksInto(containerId, badgeId, isTaskTab) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const mine = B.filter(b => b.o === 'me');
    let left = 0, total = 0;
    const h = TK.map(([k, ic, nm]) => {
      const it = [];
      mine.forEach(b => b.st.forEach((x, i) => { if (x[0] === k) it.push([b, i]); }));
      if (!it.length) return '';
      total += it.length;
      const rest = it.filter(([b, i]) => !b.st[i][2]).length;
      left += rest;
      return `<div class="sr-tg"><div class="sr-th"><span class="ic">${ic}</span>${nm}<em class="${rest ? 'left' : ''}">${rest ? `のこり${rest}` : '完了 ✓'}</em></div>${it.map(([b, i]) => `<div class="sr-stp${b.st[i][2] ? ' done' : ''}" data-no="${b.no}" data-i="${i}"><span class="ck">✓</span><span class="sr-stp-lbl"><span>${b.st[i][1]}</span><small>${b.no} ${b.nm}</small></span></div>`).join('')}</div>`;
    }).join('');
    el.innerHTML = h || '<div class="sr-tdone">いまやることはありません 🎉</div>';
    const badge = document.getElementById(badgeId);
    if (badge) badge.textContent = left;

    if (isTaskTab) {
      const msgEl = document.getElementById('task-cheer-msg');
      const barEl = document.getElementById('task-cheer-bar');
      const doneCnt = total - left;
      const pct = total ? Math.round((doneCnt / total) * 100) : 100;
      if (barEl) barEl.style.width = pct + '%';
      if (msgEl) {
        if (left === 0) msgEl.textContent = 'ぜんぶ完了！おつかれさま 🎉';
        else if (doneCnt > 0) msgEl.textContent = `いい調子！のこり${left}つだよ`;
        else msgEl.textContent = `のこり${left}つ。1つずつ進めよう`;
      }
    }

    el.querySelectorAll('.sr-stp').forEach(x => {
      x.onclick = () => {
        const b = B.find(y => y.no === x.dataset.no);
        const s = b.st[+x.dataset.i];
        s[2] = !s[2];
        renderAll();
        if (b.st.every(z => z[2])) showToast(`${b.no} の作業がぜんぶ終わりました。ボールを渡せます`);
      };
    });
  }

  function renderAll() {
    courts.forEach(({ court, blist, softPass }) => {
      ['me', 'law'].forEach(o => {
        const el = court.querySelector('.sr-side.' + o);
        const n = B.filter(b => b.o === o).length;
        el.querySelector('.sr-pile').innerHTML = '<span class="sr-ball"></span>'.repeat(n);
        el.querySelector('.sr-cnt span').textContent = n;
        el.classList.toggle('sel', o === sel);
      });
      const L = B.filter(b => b.o === sel);
      blist.innerHTML = `<div class="sr-bl-cap"><span>${sel === 'me' ? 'あなたが持っているボール' : '弁護士が持っているボール'}（${L.length}）</span><span>${sel === 'me' ? '終わったら「渡す」' : 'あなたは待つだけ'}</span></div>` +
        (L.length ? L.map(b => `<div class="sr-row-item"><span class="sr-ball"></span><div class="sr-tx"><b>${b.t}</b><small>${b.no} ${b.nm} · ${b.d}</small></div>${sel === 'me' ? `<button type="button" class="sr-pass${softPass ? ' soft' : ''}" data-no="${b.no}">渡す</button>` : '<span class="sr-pass wait">待ち</span>'}</div>`).join('') : '<div class="sr-row-item"><div class="sr-tx"><small>いま持っているボールはありません</small></div></div>');
      blist.querySelectorAll('.sr-pass[data-no]').forEach(btn => {
        btn.onclick = e => { e.stopPropagation(); tryPass(court, btn.dataset.no); };
      });
    });

    renderTasksInto('home-tasks', 'home-tbadge', false);
    renderTasksInto('task-list', 'task-tbadge', true);
  }

  document.addEventListener('click', e => {
    if (Date.now() - (window.__skipClick || 0) < 400) { e.stopPropagation(); return; }
    if (!e.target.closest('.sr-pop')) {
      document.querySelectorAll('.sr-pop').forEach(p => p.remove());
    }
  }, true);

  renderAll();
}

/* ============================================================
   4. 分析グラフ ＆ ふりかえり（分析画面 ＆ ホーム画面共通）
   ============================================================ */
function initAnalyticsCharts() {
  const SER = [
    { k: 'start', name: '着手率', color: '#AF52DE' },
    { k: 'ok', name: '開示成功率', color: '#C2432A' },
    { k: 'pay', name: '回収率', color: '#30B0C7' },
  ];
  const today = new Date(2026, 10, 19);
  const DATA = [];
  let sub = 8, st = 6, done = 4, ok = 2, known = 2, paid = 1;
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = 89 - i;
    const late = k >= 60;
    const ns = rnd() < .75 ? 1 + (rnd() < .35 ? 1 : 0) : 0;
    for (let j = 0; j < ns; j++) { sub++; if (rnd() < (late ? .55 : .82)) st++; }
    if (rnd() < .45) { done++; if (rnd() < .72) { ok++; known++; } }
    if (known > paid && rnd() < (late ? .12 : .32)) paid++;
    DATA.push({ d, n: { start: [st, sub], ok: [ok, done], pay: [paid, known] }, start: st / sub * 100, ok: ok / done * 100, pay: paid / known * 100 });
  }

  const WHY = {
    start: {
      label: '見送り', tone: ['#AF52DE', '#A592E6', '#CBBFF2', '#E6E0FA'],
      R: [
        ['権利侵害がはっきりしない', [['#12', 'とおりすがりC', 'ただの悪口で名誉毀損に当たりにくい'], ['#16', '匿名レス230', '意見・論評の範囲と判断'], ['#18', 'ぼやきD', '誰のことか特定しにくい']]],
        ['証拠が足りない', [['#14', '名無しE', 'URL・投稿日時が写っていない']]],
        ['記録の保存期間切れ', [['#08', '匿名レス512', '投稿から半年以上たっていた']]],
        ['同じ人の投稿と重複', [['#19', 'サブ垢F', '#04と同じ人・同じ内容']]]
      ],
      tip: '見送りの半分が「権利侵害がはっきりしない」です。単なる悪口より、うそで評判を下げる投稿（名誉毀損）を優先して渡すと、着手してもらいやすくなりそうです。'
    },
    ok: {
      label: '開示されなかった', tone: ['#C2432A', '#F08C76', '#F7B9AA', '#FCE0D8'],
      R: [
        ['裁判所が却下', [['#12', 'とおりすがりC', '権利侵害が明らかとはいえない'], ['#15', '匿名レス61', '同上']]],
        ['VPN・海外経由で特定できず', [['#08', '匿名レス512', 'VPN経由']]],
        ['プロバイダが拒否', [['#17', '名無しG', '任意開示に応じず']]],
        ['記録の保存期間切れ', [['#13', '匿名レス9', 'ログ削除済み']]]
      ],
      tip: '却下が多めです。投稿から3か月以内に申し立てた案件ほど通りやすい傾向があります。'
    },
    pay: {
      label: '未回収', tone: ['#30B0C7', '#5DB3C6', '#9CD3DF', '#D6EEF3'],
      R: [
        ['相手に支払う資力がない', [['#09', '匿名レス95', '弁護士が資力なしと確認'], ['#11', '匿名レス702', '同上'], ['#20', 'くちわるH', '同上']]],
        ['連絡がつかない', [['#21', '名無しI', '書面が戻ってきた']]],
        ['分割払いの途中', [['#05', '匿名レス88', '月2万円・残り8回']]],
        ['まだ支払期日前', [['#04', 'ダミー次郎', '期日 11/30']]]
      ],
      tip: '未回収の半分が「支払う資力がない」です。開示を始める前に、回収できそうか（相手の資力）を弁護士と相談しておくと、費用倒れを防げそうです。'
    }
  };

  const instances = [
    { prefix: 'an', segKey: 'analytics', range: 30 },
    { prefix: 'hm', segKey: 'home', range: 30 }
  ];

  function drawOne(inst) {
    const chart = document.getElementById(inst.prefix + '-chart');
    const svg = document.getElementById(inst.prefix + '-svg');
    const tip = document.getElementById(inst.prefix + '-tip');
    const kpis = document.getElementById(inst.prefix + '-kpis');
    const legend = document.getElementById(inst.prefix + '-legend');
    const rev = document.getElementById(inst.prefix + '-rev');
    if (!chart || !svg) return;

    const W = chart.clientWidth || 320;
    const L = DATA.slice(-inst.range), H = 170, pl = 32, pr = 8, pt = 10, pb = 20;
    const x = i => pl + (W - pl - pr) * (i / (L.length - 1));
    const y = v => pt + (H - pt - pb) * (1 - v / 100);
    const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
    const xl = [0, Math.floor((L.length - 1) / 2), L.length - 1];

    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = H + 'px';
    svg.innerHTML = [0, 25, 50, 75, 100].map(v => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="rgba(120,80,70,.12)"/><text x="${pl - 6}" y="${y(v) + 3}" text-anchor="end" font-size="11" fill="rgba(0,24,58,.64)">${v}%</text>`).join('')
      + xl.map(i => `<text x="${x(i)}" y="${H - 5}" text-anchor="${i === 0 ? 'start' : i === L.length - 1 ? 'end' : 'middle'}" font-size="11" fill="rgba(0,24,58,.64)">${fmt(L[i].d)}</text>`).join('')
      + SER.map(s => `<path d="${L.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[s.k]).toFixed(1)}`).join('')}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(L.length - 1)}" cy="${y(L[L.length - 1][s.k])}" r="4" fill="${s.color}" stroke="#fff" stroke-width="2"/>`).join('')
      + `<line class="xh" y1="${pt}" y2="${H - pb}" stroke="rgba(0,24,58,.64)" stroke-dasharray="2 3" visibility="hidden"/>`
      + SER.map(s => `<circle class="xd" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="2" visibility="hidden"/>`).join('');

    if (legend) {
      legend.innerHTML = SER.map(s => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join('');
    }

    const last = L[L.length - 1], first = L[0];
    if (kpis) {
      kpis.innerHTML = SER.map(s => {
        const df = last[s.k] - first[s.k];
        return `<div style="--k:${s.color}"><small>${s.name}</small><b>${last[s.k].toFixed(0)}<i>%</i></b><span style="color:${df > 0 ? 'var(--sr-green)' : df < 0 ? 'var(--sr-tint)' : 'var(--sr-label2)'}">${df > 0 ? '▲' : df < 0 ? '▼' : '±'}${Math.abs(df).toFixed(1)}pt</span></div>`;
      }).join('');
    }

    const move = e => {
      const r = svg.getBoundingClientRect();
      const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const i = Math.max(0, Math.min(L.length - 1, Math.round((px - pl) / (W - pl - pr) * (L.length - 1))));
      const p = L[i];
      const xh = svg.querySelector('.xh');
      xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('visibility', 'visible');
      svg.querySelectorAll('.xd').forEach((c, j) => { c.setAttribute('cx', x(i)); c.setAttribute('cy', y(p[SER[j].k])); c.setAttribute('visibility', 'visible'); });
      tip.style.display = 'block';
      tip.style.left = Math.max(80, Math.min(W - 80, x(i))) + 'px';
      tip.style.top = '-70px';
      tip.innerHTML = `<b>${fmt(p.d)}</b><br>` + SER.map(s => `<i style="background:${s.color}"></i>${s.name} <b>${p[s.k].toFixed(1)}%</b>（${p.n[s.k][0]}/${p.n[s.k][1]}件）`).join('<br>');
    };
    const out = () => {
      tip.style.display = 'none';
      const xh = svg.querySelector('.xh');
      if (xh) xh.setAttribute('visibility', 'hidden');
      svg.querySelectorAll('.xd').forEach(c => c.setAttribute('visibility', 'hidden'));
    };
    chart.onmousemove = move; chart.ontouchmove = move; chart.ontouchstart = move; chart.onmouseleave = out; chart.ontouchend = out;

    // ふりかえり描画
    if (rev) {
      const down = SER.map(s => ({ s, df: last[s.k] - first[s.k], n: last.n[s.k] })).filter(item => item.df < 0);
      let h = `<div class="sr-rev-rh"><b>ふりかえり</b><small>うまくいかなかった案件の理由から</small></div>`;
      if (!down.length) h += `<div class="sr-rev-ok2">この期間に下がった指標はありません 👍</div>`;
      down.forEach(({ s, df, n }) => {
        const Wd = WHY[s.k], tot = Wd.R.reduce((a, r) => a + r[1].length, 0);
        if (n[1] < 5) {
          h += `<div class="sr-rev-few">${s.name}：まだ件数が少ないため評価は出していません（${n[0]}/${n[1]}件）</div>`;
          return;
        }
        h += `<div class="sr-ins" style="--k:${s.color}"><div class="t">${s.name}が下がっています <span>▼${Math.abs(df).toFixed(1)}pt</span></div>
          <div class="why2">${Wd.R.map((r, i) => `<span style="flex:${r[1].length};background:${Wd.tone[i]}"></span>`).join('')}</div>
          <div class="ichips">${Wd.R.map((r, i) => `<span><i style="background:${Wd.tone[i]}"></i>${r[0]} <em>${r[1].length}件</em></span>`).join('')}</div>
          <div class="sg">${Wd.tip}</div>
          <div class="more">${Wd.label}の案件 ${tot}件を見る ›</div>
          <div class="cases">${Wd.R.map(r => r[1].map(([no, nm, d]) => `<div class="sr-row-item"><div class="sr-tx"><b>${no} ${nm}</b><small>${r[0]} · ${d}</small></div><span class="sr-chev">›</span></div>`).join('')).join('')}</div></div>`;
      });
      if (down.length) h += `<div class="sr-rev-few">理由は、弁護士から連絡があったときに選んで記録したものです。件数が少ないうちは参考程度に見てください。</div>`;
      rev.innerHTML = h;
      rev.querySelectorAll('.sr-ins').forEach(x => {
        const m = x.querySelector('.more'), origText = m.textContent;
        x.onclick = () => { x.classList.toggle('open'); m.textContent = x.classList.contains('open') ? '閉じる' : origText; };
      });
    }
  }

  instances.forEach(inst => {
    const seg = document.querySelector(`[data-analytics-seg="${inst.segKey}"]`);
    if (seg) {
      seg.querySelectorAll('span').forEach(sp => {
        sp.onclick = () => {
          seg.querySelectorAll('span').forEach(t => t.classList.toggle('on', t === sp));
          inst.range = +sp.dataset.d;
          drawOne(inst);
        };
      });
    }
  });

  window.redrawAnalytics = () => instances.forEach(drawOne);
  window.addEventListener('resize', window.redrawAnalytics);
  window.redrawAnalytics();
}

/* ============================================================
   5. Googleスプレッドシート ＆ Googleドライブ連携・フォーマット構築
   ============================================================ */
const GS_CONFIG_KEY = 'kaiji_google_sheets_drive_config_v1';
let currentGsSheetKey = 'bbs';

// スプレッドシートの列アルファベット生成 (A, B, ... Z, AA, AB...)
function colLetter(idx) {
  let s = '', n = idx + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - m) / 26);
  }
  return s;
}

// 全媒体（掲示板・X・他SNS）共通の統一カラムヘッダー（A〜AJ列・全36列）
// ・発信者情報は「氏名 / フリガナ / 郵便番号 / 住所 / 電話番号 / メール」に構造化＋S列にTEXTJOIN自動まとめ列（また1セル貼付からの自動分割にも対応）
// ・担当弁護士情報はU列に名前を入れるだけでV・W列が「担当弁護士マスタ」からVLOOKUP自動反映（手動書き換え不要）
const UNIFIED_POST_HEADERS = [
  // A〜L列：投稿・IP・プロバイダ・申立の基本12列
  '通し番号',                             // A
  'アカウント / レス番号',                 // B
  '閲覧用ＵＲＬ',                         // C
  '投稿日時',                             // D
  '投稿内容',                             // E
  '接続元ＩＰアドレス',                   // F
  '接続元ポート番号',                     // G
  '権利侵害の理由',                       // H
  'プロバイダ',                           // I
  '下位プロバイダ',                       // J
  '任意請求日',                           // K
  '申立日',                               // L
  // M〜S列：構造化した発信者情報（7列）
  '発信者氏名（事業者・結果）',           // M
  'フリガナ',                             // N
  '郵便番号',                             // O
  '発信者住所',                           // P
  '電話番号（キャリア）',                 // Q
  'メールアドレス',                       // R
  '【自動結合】発信者情報まとめ',         // S (=TEXTJOINでM〜Rを自動結合 / ここに1セル貼付で自動分割も可)
  '損害賠償請求日',                       // T
  // U〜W列：担当弁護士情報（担当弁護士マスタからVLOOKUP自動反映）
  '担当弁護士',                           // U
  '【自動】法律事務所名',                 // V (=VLOOKUP)
  '【自動】弁護士連絡先',                 // W (=VLOOKUP)
  // X〜AJ列：アプリ連携逆算列（13列）
  '案件No.',                              // X
  '媒体区分',                             // Y
  '進捗ステップ(1-12)',                   // Z
  'いまの状況',                           // AA
  '状態区分',                             // AB
  'ボール保持者',                         // AC
  '次回期日・期限',                       // AD
  '期日内容',                             // AE
  '魚拓ファイル名',                       // AF
  '魚拓Drive URL',                        // AG
  '魚拓保全日時(JST)',                    // AH
  'SHA-256ハッシュ',                      // AI
  '見送り・却下理由 / 手続メモ'           // AJ
];

// 添付1〜3枚目（実際の弁護士管理スプシ）＋ 構造化発信者情報 ＋ 担当弁護士マスタを含む全6シート定義
const GS_SHEETS_SCHEMA = {
  bbs: {
    name: '投稿記事目録_掲示板',
    titleBanner: '投稿記事目録（掲示板・X 全媒体共通列フォーマット）',
    lawyerColCount: 20, // A〜T列が弁護士管理項目、U〜Wが弁護士マスタ連動、X〜AJがアプリ連携
    redTextStyle: true,
    headers: UNIFIED_POST_HEADERS,
    rows: [
      ['1', '46785（とおりすがりC）', 'https://suki-kira.com/p/102965/c/46785', '2025/6/28 8:15', '>>46784\nきっしょ！！\n画像だけじゃなくて文章までグロとか\nもう存在がセンシティブじゃん', '240a:61:5293:e56e:5c20:6fff:fea6:ce0b', '45998', '名誉感情侵害', 'ＮＴＴドコモ', '', '2025/9/23', '', '却下', '', '', '', '', '', '却下', '', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#12', '好き嫌い.com', '5', '裁判所が却下（別投稿3件あり）', '止まった', '弁護士', '', '', '証拠_46785.png', 'https://drive.google.com/drive/folders/...', '2025-06-28 09:00:00 JST', '9e02a4f1...9971', '権利侵害がはっきりしない（同じ相手の別投稿3件で再挑戦候補）'],
      ['2', '50024（しつこい人A）', 'https://suki-kira.com/p/102965/c/50024', '2025/7/2 21:10', 'K国人に同胞って言ってたのはマジで何？\nあんた日本合ってないからK国行けば？', '121.86.2.70', '38494', '名誉感情侵害', 'オプテージ', '株式会社ギガプライズ', '2025/9/23', '', '株式会社ギガプライズ（中間事業者）担当：野田利奈子', 'カブシキガイシャギガプライズ', '150-0044', '東京都渋谷区円山町3-6 E・スペースタワー7階', '03-5459-8400', 'nwsrv-division@gigaprize.co.jp', '株式会社ギガプライズ（中間事業者）\n〒150-0044 東京都渋谷区円山町3-6 E・スペースタワー7階\n03-5459-8400 / nwsrv-division@gigaprize.co.jp', '', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#03', '好き嫌い.com', '2', '弁護士が申立て準備中', '準備中', '弁護士', '', '', '証拠_50024.png', 'https://drive.google.com/drive/folders/...', '2025-07-02 22:00:00 JST', '7c81b3e0...412a', '下位プロバイダ（ギガプライズ）へ照会進行'],
      ['3', '>>88（匿名レス88）', 'https://5ch.net/test/read.cgi/xxx/88', '2026/2/8 14:22', 'また同じこと書いてて草…', '126.152.88.14', '51200', '名誉毀損・侮辱', 'ＮＴＴドコモ', '', '2026/3/10', '2026/4/15', '山田 太郎', 'ヤマダ タロウ', '160-0022', '東京都新宿区新宿1-2-3', '090-1234-5678（ドコモ）', 'yamada.taro.dummy@example.com', '山田 太郎（ヤマダ タロウ）\n〒160-0022 東京都新宿区新宿1-2-3\n090-1234-5678（ドコモ）', '2026/9/10', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#05', '5ちゃんねる', '11', '示談了承→振込待ち（11/30）', '進行中', '弁護士', '2026/11/30', '振込予定（30万円）', '証拠_20020888.png', 'https://drive.google.com/drive/folders/...', '2026-02-08 15:00:00 JST', '3a91c4d2...8801', '分割払いの途中（#04と同じ山田太郎と判明・合算示談30万円）'],
      ['4', '>>512（匿名レス512）', 'https://5ch.net/test/read.cgi/xxx/512', '2026/4/11 02:19', '晒しとくわ…', '185.220.101.4', '44120', 'プライバシー侵害', 'VPN経由', '', '2026/5/01', '2026/6/10', '特定できず（保存期間切れ/VPN）', '', '', '', '', '', '特定できず（保存期間切れ/VPN）', '', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#08', '5ちゃんねる', '5', '個人特定不可で停止', '止まった', '弁護士', '', '', '証拠_200411512.png', 'https://drive.google.com/drive/folders/...', '2026-04-11 08:00:00 JST', '6f01d8a4...3319', '記録の保存期間切れ（同じ人の新しい投稿2件で再挑戦可能）']
    ]
  },
  x: {
    name: '投稿記事目録_X',
    titleBanner: '投稿記事目録（掲示板・X 全媒体共通列フォーマット）',
    lawyerColCount: 20, // A〜T列が掲示板と完全同一位置！
    redTextStyle: false,
    headers: UNIFIED_POST_HEADERS,
    rows: [
      ['1-1', '黒饅頭\n@VNGssDyFjZ53447', 'https://x.com/VNGssDyFjZ53447/status/1960328033933619288', '午後10:06 · 2025年8月26日', 'ちゃんと診断書アップしろよ\n虚言癖あるんだから', '34.34.226.105', '', '名誉毀損・侮辱', 'Ｇｏｏｇｌｅ ＬＬＣ', '', '2025/09/10', '2025/10/15', '森井 沙伎', 'モリイ サキ', '213-0004', '神奈川県川崎市高津区諏訪2丁目13-2 モルトベーネE', '+819042834063（ＳＢ）', 'shirley.bridal.1201@gmail.com', 'shirley.bridal.1201@gmail.com\n+819042834063（ＳＢ）\n森井沙伎（モリイサキ）\n〒213-0004 神奈川県川崎市高津区諏訪2丁目13-2 モルトベーネE', '2026/01/10', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#06', 'X (Twitter)', '12', '振込完了（40万円・解決）', '終了', '弁護士', '', '', '証拠_19603280.png', 'https://drive.google.com/drive/folders/...', '2025-08-26 22:30:00 JST', '5b71e2a9...1102', '示談成立・40万円の振込完了を確認'],
      ['1-2', 'ORC\n@neutralbrain_', 'https://x.com/neutralbrain_/status/1959106759424913845', '午後1:13 · 2025年8月23日', '周りが追い詰めなくてもあの人は元からあんな感じですよ 家庭内ではDV、不倫してそれを正当化して旦那追い詰めてたんですから表面化したかしてないかの違いだけです', '138.64.174.240', '', '名誉毀損・プライバシー侵害', '朝日ネット', '', '2025/09/15', '2025/10/20', '（プロバイダ照会中）', '', '', '（住所開示待ち）', '', 'net.websf@gmail.com', 'net.websf@gmail.com（プロバイダ照会中）', '', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#02', 'X (Twitter)', '8', 'X側のIP開示待ち（次回期日 11/26）', '進行中', 'あなた', '2026/11/26', 'X側のIP開示 期日', '証拠_19591067.png', 'https://drive.google.com/drive/folders/...', '2025-08-23 14:00:00 JST', '4d12f8c3...9012', 'Xの回答書を読んで返信（ボール：あなた）'],
      ['2-1', 'ダミー次郎\n@dummy_jiro', 'https://x.com/dummy_jiro/status/1846000020081001', '午後8:10 · 2026年8月10日', '〇〇の経歴は全部嘘で犯罪歴もある。こいつのファンも詐欺グループと変わらんわ。店行くだけでもリスク。拡散希望。', '（X社開示待ち）', '', '名誉毀損・侮辱・名誉感情侵害', 'ソフトバンク（見込）', '', '2026/09/11', '2026/10/20', '（開示手続中）', '', '', '', '', '', '（開示手続中）', '', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#04', 'X (Twitter)', '8', 'X側IP開示待ち', '依頼者待ち', '弁護士', '2026/11/12 13:30', '次回期日 - 口頭弁論', '証拠_20081001.png', 'https://drive.google.com/drive/folders/...', '2026-08-10 21:18:24 JST', '8f4a3c10b7e289...d9a04ef12', '10/20 受領決定にてログ保存を要請。11/12までにX社からの開示予定。'],
      ['3-1', 'サンプル太郎\n@sample_user01', 'https://x.com/sample_user01/status/1845000020031401', '午後3:40 · 2026年3月14日', 'A・Bの件、まだ許せません…', '', '', '名誉毀損', '', '', '2026/03/20', '', '', '', '', '', '', '', '', '', '神田 敬一', '神田法律事務所', '03-3500-1234 / kanda@kanda-law.jp', '#01', 'X (Twitter)', '3', '私の書類発送待ち（期限あと2日）', '依頼者待ち', 'あなた', '2026/11/21', '訴訟委任状に署名・押印', '証拠_20031401.png', 'https://drive.google.com/drive/folders/...', '2026-03-14 16:00:00 JST', '1a88e4b0...7712', 'A・Bの委任状に押印して返送待ち']
    ]
  },
  cost: {
    name: '費用・入金管理',
    titleBanner: null,
    lawyerColCount: 7, // A〜G列が添付3枚目の弁護士必須列
    redTextStyle: false,
    headers: [
      // A〜G列：添付3枚目（費用管理）完全準拠
      '入金日', '相手方', '入金額', '内報酬（税込み55%）', '内着手金', '着手金残高', '備考',
      // H〜K列：ホーム収支＆見込み逆算列
      '案件No.', '合意示談金額（見込含む）', '支払期日', '回収ステータス'
    ],
    rows: [
      ['', '（初期着手金総額）', '', '', '', '¥1,980,000', '着手金ベース額（F2セル）', '', '', '', ''],
      ['2025/12/05', '森由里', '200,000', '110,000', '90,000', '¥1,890,000', '数式: D=C*55%, E=C-D, F=前回F-E', '#06', '200,000', '2025/12/05', '入金済'],
      ['2025/11/25', '新沼志麻', '100,000', '55,000', '45,000', '¥1,845,000', '', '#06', '100,000', '2025/11/25', '入金済'],
      ['', '西村有佳里', '100,000', '55,000', '45,000', '¥1,800,000', '', '#06', '100,000', '', '入金済'],
      ['2026/02/27', '丸山正雄・有子', '150,000', '82,500', '67,500', '¥1,732,500', '', '#06', '150,000', '2026/02/27', '入金済'],
      ['2026/04/20', '黒須李稲', '100,000', '55,000', '45,000', '¥1,687,500', '', '#06', '100,000', '2026/04/20', '入金済'],
      ['（振込予定）', '山田 太郎（#04・#05合算）', '0', '0', '0', '¥1,687,500', 'これから入金30万（見込み収支に計上）', '#05', '300,000', '2026/11/30', '振込待ち'],
      ['合計（31行目）', '', '650,000', '357,500', '292,500', '¥1,687,500', '=SUM(C3:C30) / =SUM(D3:D30) / =SUM(E3:E30)', '', '950,000', '', '累計回収 65万 / 見込込 95万']
    ]
  },
  tasks: {
    name: 'タスク・ボール管理',
    titleBanner: null,
    lawyerColCount: 0,
    redTextStyle: false,
    headers: ['案件No.', '案件名', 'ボール保持者', 'ボール件名', '期限・補足', '作業カテゴリ', '個別タスク名', '完了フラグ'],
    rows: [
      ['#01', 'サンプル太郎', 'me（あなた）', '訴訟委任状に署名・押印', '期限 11/21（金）', '🖨️ 印刷する', '委任状を印刷する', 'FALSE'],
      ['#01', 'サンプル太郎', 'me（あなた）', '訴訟委任状に署名・押印', '期限 11/21（金）', '✍️ 捺印・署名', '署名して印鑑を押す', 'FALSE'],
      ['#01', 'サンプル太郎', 'me（あなた）', '訴訟委任状に署名・押印', '期限 11/21（金）', '📷 読み込み', 'スキャンして読み込む', 'FALSE'],
      ['#02', '例のアカウント', 'me（あなた）', 'Xの回答書を読んで返信', '弁護士から新着', '🗂️ 関係整理', '回答書で分かった関係を整理する', 'FALSE'],
      ['#06', '新しい投稿', 'me（あなた）', '追加の投稿を証拠に出す', '弁護士から依頼', '🖼️ スクショ提出', '投稿のスクショを撮って提出', 'FALSE'],
      ['#06', '新しい投稿', 'me（あなた）', '追加の投稿を証拠に出す', '弁護士から依頼', '🗂️ 関係整理', '前の投稿との関係を整理する', 'FALSE'],
      ['#11', '匿名レス702', 'me（あなた）', '陳述書に署名', '期限 11/28（金）', '🖨️ 印刷する', '陳述書を印刷する', 'FALSE'],
      ['#11', '匿名レス702', 'me（あなた）', '陳述書に署名', '期限 11/28（金）', '✍️ 捺印・署名', '署名・捺印', 'FALSE'],
      ['#11', '匿名レス702', 'me（あなた）', '陳述書に署名', '期限 11/28（金）', '📷 読み込み', '読み込んで送る', 'FALSE']
    ]
  },
  docs: {
    name: '書類・証拠Drive・チャット管理',
    titleBanner: null,
    lawyerColCount: 0,
    redTextStyle: false,
    headers: ['案件No.', '種別', 'タイトル・ファイル名', 'ステータス', 'GoogleドライブFileID', 'Googleドライブ保管URL', 'サイズ・形式', '登録日時・チャット本文'],
    rows: [
      ['#04', '申立書PDF', '発信者情報開示命令申立書', '提出済', '1DriveDoc_Moshitate_04', 'https://drive.google.com/file/d/1DriveDoc_Moshitate_04/view', 'PDF・324KB', '2026-10-20 提出'],
      ['#04', '通知書PDF', '侵害情報通知書兼送信防止措置依頼書', '提出済', '1DriveDoc_Tsuchisho_04', 'https://drive.google.com/file/d/1DriveDoc_Tsuchisho_04/view', 'PDF・188KB', '2026-10-20 提出'],
      ['#04', '陳述書PDF', '陳述書（被害経緯・精神的苦痛）', '作成予定', '1DriveDoc_Chinjutsu_04', 'https://drive.google.com/file/d/1DriveDoc_Chinjutsu_04/view', 'PDF・ひな形', '依頼者確認待ち'],
      ['#04', '魚拓PNG', '証拠_20081001.png（魚拓画像）', '保全済み', '1DrivePng_Gyotaku_04', 'https://drive.google.com/file/d/1DrivePng_Gyotaku_04/view', 'PNG・1.2MB', '保全日時: 2026-08-10 21:18:24 JST / SHA-256: 8f4a3c10b7e289...d9a04ef12'],
      ['#04', 'チャット', '神田 敬一 弁護士（神田法律事務所）', '既読', '', '', '17:15', '東京地裁から仮処分決定を受領しました。来週にはXからのIP開示がされる見込みです。']
    ]
  },
  lawyers: {
    name: '担当弁護士マスタ',
    titleBanner: null,
    lawyerColCount: 6,
    redTextStyle: false,
    headers: ['担当弁護士名（キー）', '法律事務所名', '電話番号', 'メールアドレス', '報酬割合（税込）', '初期着手金総額・備考'],
    rows: [
      ['神田 敬一', '神田法律事務所', '03-3500-1234', 'kanda@kanda-law.jp', '55%', '¥1,980,000（メイン依頼先・VLOOKUPで全案件に自動反映）'],
      ['佐藤 誠', '霞が関IT法律事務所', '03-3580-9999', 'sato@kasumi-it-law.jp', '55%', 'セカンドオピニオン・別案件用（プルダウン切替で自動反映）']
    ]
  }
};

// 1セルにまとまった発信者情報（プロバイダ回答書コピペ等）を
// 「氏名 / フリガナ / 郵便番号 / 住所 / 電話番号 / メールアドレス」に自動分解するパーサー
function parseCombinedSenderInfo(text) {
  const raw = String(text || '').trim();
  let email = '', phone = '', zip = '', name = '', kana = '', address = '';

  // 1. メールアドレス抽出
  const emailM = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailM) email = emailM[0];

  // 2. 電話番号（＋キャリア表記）抽出
  const phoneM = raw.match(/(?:\+81|0)\d[\d-]{7,13}\d(?:[（(][^）)]+[）)])?/);
  if (phoneM) phone = phoneM[0];

  // 3. 郵便番号抽出 (〒123-4567 または 123-4567)
  const zipM = raw.match(/〒?\s*(\d{3}-\d{4})/);
  if (zipM) zip = zipM[1];

  // 4. 氏名（フリガナ）と住所を行ごとに判定
  const prefRegex = /(東京都|北海道|(?:京都|大阪)府|.{2,3}県)/;
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const addrLines = [];
  lines.forEach(line => {
    let clean = line;
    if (email) clean = clean.replace(email, '').trim();
    if (phone) clean = clean.replace(phone, '').trim();
    clean = clean.replace(/〒?\s*\d{3}-\d{4}/, '').trim();
    if (!clean) return;

    if (prefRegex.test(clean) || addrLines.length > 0) {
      addrLines.push(clean);
    } else if (!name) {
      const kanaM = clean.match(/^(.+?)[（(]([ァ-ヶー\s　]+)[）)]$/);
      if (kanaM) {
        name = kanaM[1].trim();
        kana = kanaM[2].trim();
      } else {
        name = clean;
      }
    }
  });
  address = addrLines.join(' ');
  return { name, kana, zip, address, phone, email };
}

function renderGsPreviewTable(sheetKey) {
  currentGsSheetKey = sheetKey;
  const wrap = document.getElementById('gs-preview-table-wrap');
  if (!wrap) return;
  const schema = GS_SHEETS_SCHEMA[sheetKey];
  if (!schema) return;

  document.querySelectorAll('#gs-sheet-tabs .gs-sheet-tab').forEach(el => {
    el.classList.toggle('on', el.getAttribute('data-sheet') === sheetKey);
  });

  const colCount = schema.headers.length;
  let html = '<table class="gs-table"><thead>';
  // アルファベット列ヘッダー (A, B, C...)
  html += '<tr class="gs-col-letters"><th style="width:24px">#</th>' +
    schema.headers.map((_, i) => `<th>${colLetter(i)}</th>`).join('') + '</tr>';

  // 1行目タイトルバナー（投稿記事目録）
  if (schema.titleBanner) {
    html += `<tr class="gs-title-row"><th>1</th><th colspan="${colCount}">${schema.titleBanner}</th></tr>`;
  }

  // カラム名ヘッダー
  const headerRowNum = schema.titleBanner ? 3 : 1;
  html += `<tr class="gs-header-row"><th>${headerRowNum}</th>` +
    schema.headers.map((h, i) => `<th class="${i >= schema.lawyerColCount ? 'ext-col' : ''}">${h}</th>`).join('') +
    '</tr></thead><tbody>';

  // データ行
  schema.rows.forEach((row, rIdx) => {
    const rowNum = headerRowNum + 1 + rIdx;
    const isSumRow = sheetKey === 'cost' && rIdx === schema.rows.length - 1;
    html += `<tr class="${isSumRow ? 'sum-row' : ''}"><td style="background:#F1F5F9;text-align:center;font-weight:700;color:#64748B;">${isSumRow ? 31 : rowNum}</td>` +
      row.map((cell, cIdx) => {
        const isRed = schema.redTextStyle && cIdx < schema.lawyerColCount;
        const isNum = sheetKey === 'cost' && (cIdx >= 2 && cIdx <= 5 || cIdx === 8);
        const cls = [isRed ? 'red-text' : '', isNum ? 'num-cell' : ''].filter(Boolean).join(' ');
        return `<td class="${cls}">${cell}</td>`;
      }).join('') + '</tr>';
  });

  html += '</tbody></table>';
  wrap.innerHTML = html;
}

function switchGsPreviewSheet(sheetKey) {
  renderGsPreviewTable(sheetKey);
}

function sheetToCsvString(sheetKey) {
  const schema = GS_SHEETS_SCHEMA[sheetKey];
  const lines = [];
  if (schema.titleBanner) {
    const titleRow = new Array(schema.headers.length).fill('');
    titleRow[0] = schema.titleBanner;
    lines.push(titleRow);
    lines.push(new Array(schema.headers.length).fill(''));
  }
  lines.push(schema.headers);
  schema.rows.forEach(r => lines.push(r));
  return '\uFEFF' + lines.map(row =>
    row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\r\n');
}

function triggerCsvDownload(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 200);
}

function downloadCurrentSheetCsv() {
  const schema = GS_SHEETS_SCHEMA[currentGsSheetKey];
  if (!schema) return;
  triggerCsvDownload(`${schema.name}.csv`, sheetToCsvString(currentGsSheetKey));
  showToast(`📥「${schema.name}.csv」をダウンロードしました`);
}

function downloadAllSheetsCsv() {
  const keys = Object.keys(GS_SHEETS_SCHEMA);
  keys.forEach((k, i) => {
    setTimeout(() => {
      const schema = GS_SHEETS_SCHEMA[k];
      triggerCsvDownload(`0${i + 1}_${schema.name}.csv`, sheetToCsvString(k));
    }, i * 250);
  });
  showToast('📦 全5シートのCSVを一括ダウンロードしました');
}

function toggleGasGuide() {
  const el = document.getElementById('gs-gas-guide');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

async function copyGasSetupScript() {
  try {
    const res = await fetch('scripts/gas_setup_and_sync.gs');
    const code = res.ok ? await res.text() : getFallbackGasScript();
    await navigator.clipboard.writeText(code);
    const g = document.getElementById('gs-gas-guide');
    if (g) g.style.display = 'block';
    showToast('⚡ 自動構築GASコードをコピーしました！スプレッドシートのApps Scriptに貼り付けてください');
  } catch (e) {
    const code = getFallbackGasScript();
    const ta = document.createElement('textarea');
    ta.value = code;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    const g = document.getElementById('gs-gas-guide');
    if (g) g.style.display = 'block';
    showToast('⚡ 自動構築GASコードをコピーしました！');
  }
}

function getFallbackGasScript() {
  // ローカルfile://等でfetchできない場合の完全内蔵GASコード
  const sheetsJson = JSON.stringify(GS_SHEETS_SCHEMA);
  return `function setupSpreadsheetAndDrive() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('開示請求管理マスター（掲示板・X・費用・アプリ連携）');
  const rootName = '開示請求_証拠魚拓・書類保管庫';
  const it = DriveApp.getFoldersByName(rootName);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(rootName);
  const schema = ${sheetsJson};
  Object.keys(schema).forEach(k => {
    const s = schema[k];
    let sh = ss.getSheetByName(s.name) || ss.insertSheet(s.name);
    sh.clear();
    let r = 1;
    if (s.titleBanner) {
      sh.getRange(1, 1, 1, s.lawyerColCount || 10).merge().setValue(s.titleBanner).setHorizontalAlignment('center').setFontWeight('bold');
      r = 3;
    }
    sh.getRange(r, 1, 1, s.headers.length).setValues([s.headers]).setFontWeight('bold').setBackground('#E8F5E9');
    if (s.rows.length) sh.getRange(r + 1, 1, s.rows.length, s.headers.length).setValues(s.rows).setWrap(true);
    sh.setFrozenRows(r);
  });
}`;
}

function loadGsConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem(GS_CONFIG_KEY) || '{}');
    const sInp = document.getElementById('gs-sheet-url');
    const dInp = document.getElementById('gs-drive-url');
    const gInp = document.getElementById('gs-gas-url');
    if (sInp && cfg.sheetUrl) sInp.value = cfg.sheetUrl;
    if (dInp && cfg.driveUrl) dInp.value = cfg.driveUrl;
    if (gInp && cfg.gasUrl) gInp.value = cfg.gasUrl;
    updateGsStatusBadge(cfg);
  } catch (e) {}
}

function saveGsConfig() {
  const cfg = {
    sheetUrl: (document.getElementById('gs-sheet-url')?.value || '').trim(),
    driveUrl: (document.getElementById('gs-drive-url')?.value || '').trim(),
    gasUrl: (document.getElementById('gs-gas-url')?.value || '').trim()
  };
  try { localStorage.setItem(GS_CONFIG_KEY, JSON.stringify(cfg)); } catch (e) {}
  updateGsStatusBadge(cfg);
}

function updateGsStatusBadge(cfg) {
  const badge = document.getElementById('gs-conn-badge');
  if (!badge) return;
  if (cfg.sheetUrl || cfg.driveUrl || cfg.gasUrl) {
    badge.textContent = '🟢 連携設定済';
    badge.style.background = '#DCFCE7';
    badge.style.color = '#15803D';
  } else {
    badge.textContent = 'フォーマット構築可';
  }
}

function openLinkedGoogleUrl(type) {
  const id = type === 'sheet' ? 'gs-sheet-url' : 'gs-drive-url';
  const raw = (document.getElementById(id)?.value || '').trim();
  if (!raw) {
    const createUrl = type === 'sheet' ? 'spreadsheet.html' : 'https://drive.google.com/drive/my-drive';
    window.open(createUrl, '_blank');
    showToast(type === 'sheet' ? '📗 全5シートWebスプレッドシートを開きます' : '📁 Googleドライブを開きます');
    return;
  }
  const url = /^https?:\/\//i.test(raw)
    ? raw
    : (type === 'sheet' ? `https://docs.google.com/spreadsheets/d/${raw}/edit` : `https://drive.google.com/drive/folders/${raw}`);
  window.open(url, '_blank');
}

async function syncWithGoogleSheets() {
  saveGsConfig();
  const gasUrl = (document.getElementById('gs-gas-url')?.value || '').trim();
  const sheetUrl = (document.getElementById('gs-sheet-url')?.value || '').trim();
  if (!gasUrl && !sheetUrl) {
    const g = document.getElementById('gs-gas-guide');
    if (g) g.style.display = 'block';
    showToast('💡 まず「⚡ 自動構築GASをコピー」でスプレッドシートを作成するか、URLを入力してください');
    return;
  }
  if (!gasUrl) {
    showToast('✅ スプレッドシート・ドライブURLを保存しました！');
    return;
  }
  try {
    showToast('🔄 スプレッドシートと同期中...');
    const res = await fetch(gasUrl);
    const data = await res.json();
    if (data && data.ok) {
      if (data.spreadsheetUrl && !sheetUrl) {
        document.getElementById('gs-sheet-url').value = data.spreadsheetUrl;
      }
      if (data.driveFolderId && !document.getElementById('gs-drive-url').value) {
        document.getElementById('gs-drive-url').value = `https://drive.google.com/drive/folders/${data.driveFolderId}`;
      }
      saveGsConfig();
      showToast('✅ スプレッドシート全5シート＆Googleドライブとの同期が完了しました！');
    } else {
      showToast('⚠️ 同期レスポンスを確認してください');
    }
  } catch (err) {
    showToast('✅ 設定を保存しました（GAS公開URLでクラウド同期が有効になります）');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Supabase初期化 & 認証セッション復元
  SupabaseStore.init();

  // 新5タブ各画面の初期化
  initCasesView();
  initHomeWidgets();
  initBallsAndTasks();
  initAnalyticsCharts();

  // スプレッドシート連携＆フォーマットプレビュー初期化
  loadGsConfig();
  renderGsPreviewTable('bbs');

  // アカウント行のタップでアカウント詳細へ
  document.querySelectorAll('#view-accounts *').forEach(el => {
    if (el.textContent && (el.textContent.includes('@dummy_jiro') || el.textContent.includes('サンプル太郎'))) {
      const card = el.closest('div[style*="border"], tr') || el;
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        switchView('view-account-detail');
      });
    }
  });

  // 発信者行のタップで発信者詳細へ
  document.querySelectorAll('#view-senders *').forEach(el => {
    if (el.textContent && (el.textContent.includes('特定') || el.textContent.includes('山田') || el.textContent.includes('未特定'))) {
      const card = el.closest('div[style*="border"], tr') || el;
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        switchView('view-sender-detail');
      });
    }
  });

  // カルテ風タブ切り替え（onclick="switchKarteTab(...)" で直接処理するため重複リスナーなし）

  // クイックハブの2x2ボタン
  document.querySelectorAll('#quick-modal .quick-hub-tile, #quick-modal .card, #quick-modal button, #quick-modal div[style*="cursor"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.textContent.trim().split('\n')[0];
      closeQuickModal();
      if (label.includes('証拠URL') || label.includes('URL')) {
        openUrlCaptureModal();
      } else {
        showToast('「' + label.substring(0, 10) + '」を開きました');
      }
    });
  });

  // Q&Aアコーディオン
  document.querySelectorAll('#view-qa details, #view-qa .qa-item, #view-qa .qa-box-card, #view-qa div[style*="cursor:pointer"]').forEach(qa => {
    qa.addEventListener('click', () => {
      qa.classList.toggle('open');
    });
  });
});
