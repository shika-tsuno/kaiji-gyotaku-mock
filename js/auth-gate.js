(function () {
  "use strict";

  const EXPECTED_HASH =
    "0ad20b069d8d2583bd40fa0d054379ee56fb3ea9690986283c9c82cdbd9af00f";
  const STORAGE_KEY = "kaiji_mock_auth_v1";

  // すでに認証済みの場合は何もしない
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === EXPECTED_HASH) {
      return;
    }
  } catch (_) {}

  // 読み込み直後に本体を隠すスタイルを即座に適用
  const hideStyle = document.createElement("style");
  hideStyle.id = "auth-gate-hide-style";
  hideStyle.textContent =
    "html.auth-locked body > *:not(#auth-gate-overlay) { visibility: hidden !important; } html.auth-locked body { overflow: hidden !important; }";
  document.head.appendChild(hideStyle);
  document.documentElement.classList.add("auth-locked");

  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function unlock() {
    document.documentElement.classList.remove("auth-locked");
    const overlay = document.getElementById("auth-gate-overlay");
    if (overlay) overlay.remove();
    const style = document.getElementById("auth-gate-hide-style");
    if (style) style.remove();
  }

  function mountGate() {
    if (document.getElementById("auth-gate-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "auth-gate-overlay";
    overlay.setAttribute(
      "style",
      [
        "position:fixed",
        "inset:0",
        "z-index:2147483647",
        "background:#f6f7f9",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "padding:20px",
        "font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif",
      ].join(";")
    );

    overlay.innerHTML = `
      <div style="width:100%;max-width:360px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 24px;box-shadow:0 12px 32px rgba(15,23,42,0.08);text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">🔒</div>
        <h1 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#0f172a;">閲覧パスワード</h1>
        <p style="margin:0 0 20px;font-size:13px;color:#64748b;line-height:1.5;">このページを閲覧するにはパスワードを入力してください。</p>
        <form id="auth-gate-form" style="display:flex;flex-direction:column;gap:12px;">
          <input
            id="auth-gate-input"
            type="password"
            autocomplete="current-password"
            placeholder="パスワードを入力"
            required
            style="width:100%;box-sizing:border-box;padding:12px 14px;font-size:15px;border:1px solid #cbd5e1;border-radius:10px;outline:none;"
          />
          <button
            type="submit"
            style="width:100%;padding:12px;font-size:15px;font-weight:600;color:#ffffff;background:#0f172a;border:none;border-radius:10px;cursor:pointer;"
          >開く</button>
          <p id="auth-gate-error" style="margin:0;font-size:13px;color:#dc2626;min-height:18px;"></p>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    const form = document.getElementById("auth-gate-form");
    const input = document.getElementById("auth-gate-input");
    const errEl = document.getElementById("auth-gate-error");

    setTimeout(() => input && input.focus(), 50);

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      errEl.textContent = "";
      const val = input.value || "";
      try {
        const hash = await sha256Hex(val);
        if (hash === EXPECTED_HASH) {
          try {
            sessionStorage.setItem(STORAGE_KEY, EXPECTED_HASH);
          } catch (_) {}
          unlock();
        } else {
          errEl.textContent = "パスワードが正しくありません。";
          input.value = "";
          input.focus();
        }
      } catch (_) {
        errEl.textContent = "認証処理でエラーが発生しました。";
      }
    });
  }

  if (document.body) {
    mountGate();
  } else {
    document.addEventListener("DOMContentLoaded", mountGate, { once: true });
  }
})();
