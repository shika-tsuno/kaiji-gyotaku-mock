const tokenInput = document.getElementById("tokenInput");
    const toggleTokenBtn = document.getElementById("toggleTokenBtn");
    const urlInput = document.getElementById("urlInput");
    const captureBtn = document.getElementById("captureBtn");
    const statusMsg = document.getElementById("statusMsg");
    const resultBox = document.getElementById("resultBox");
    const metaInfo = document.getElementById("metaInfo");
    const previewImg = document.getElementById("previewImg");
    const downloadLink = document.getElementById("downloadLink");

    // URLの #token=... があれば自動保存してURL欄から隠す（招待リンク用）
    const hashMatch = location.hash.match(/token=([a-fA-F0-9]+)/);
    if (hashMatch) {
      localStorage.setItem("kaiji_gyotaku_token", hashMatch[1]);
      history.replaceState(null, "", location.pathname + location.search);
    }

    // URLパラメータ（?caseId=#01&url=...）があれば反映
    const params = new URLSearchParams(location.search);
    const paramCaseId = params.get("caseId");
    const paramUrl = params.get("url");
    if (paramUrl) {
      urlInput.value = paramUrl;
    }
    if (paramCaseId) {
      const subEl = document.getElementById("caseContextSubtitle");
      const backEl = document.getElementById("backToAppLink");
      if (subEl) subEl.textContent = `案件 ${paramCaseId} の証拠保全：URLから自動撮影、または手動スクショに日時＋URLの帯を合成します`;
      if (backEl) backEl.textContent = `‹ 管理アプリ（${paramCaseId}）に戻る`;
    }

    // 初期トークンの読み込み
    tokenInput.value = localStorage.getItem("kaiji_gyotaku_token") || "";
    tokenInput.addEventListener("input", () => {
      localStorage.setItem("kaiji_gyotaku_token", tokenInput.value.trim());
    });

    toggleTokenBtn.addEventListener("click", () => {
      if (tokenInput.type === "password") {
        tokenInput.type = "text";
        toggleTokenBtn.textContent = "隠す";
      } else {
        tokenInput.type = "password";
        toggleTokenBtn.textContent = "表示";
      }
    });

    function setStatus(type, text) {
      statusMsg.className = "status " + type;
      statusMsg.textContent = text;
    }

    function formatFilename(stampStr) {
      const digits = (stampStr || "").replace(/[^0-9]/g, "").slice(0, 14);
      return digits ? `gyotaku_${digits}.png` : `gyotaku_${Date.now()}.png`;
    }

    captureBtn.addEventListener("click", async () => {
      const url = urlInput.value.trim();
      const token = tokenInput.value.trim();
      if (!url) return setStatus("error", "URLを入力してください。");
      if (!token) return setStatus("error", "合言葉（CAPTURE_TOKEN）を入力してください。");

      localStorage.setItem("kaiji_gyotaku_token", token);
      captureBtn.disabled = true;
      setStatus("info", "⏳ クラウド上でページを開いて撮影しています（7〜20秒ほどかかります）...");

      const startTime = Date.now();
      try {
        const res = await fetch("/api/capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
          },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          let errText = `エラー (HTTP ${res.status})`;
          try {
            const j = await res.json();
            if (j.message) errText += `: ${j.message}`;
            else if (j.error) errText += `: ${j.error}`;
          } catch {}
          throw new Error(errText);
        }

        const capturedAt = decodeURIComponent(res.headers.get("x-captured-at") || "");
        const normUrl = decodeURIComponent(res.headers.get("x-normalized-url") || url);
        const mode = res.headers.get("x-capture-mode") || "";
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);

        const sec = ((Date.now() - startTime) / 1000).toFixed(1);
        setStatus("ok", `✅ 撮影完了しました！（所要時間: ${sec}秒）`);

        metaInfo.innerHTML = `
          <div><strong>取得日時:</strong> ${capturedAt || "-"}</div>
          <div><strong>正規化URL:</strong> ${normUrl}</div>
          <div><strong>撮影モード:</strong> ${mode === "post" ? "投稿単体切り抜き (post)" : "ページ全体上部 (page)"}</div>
        `;
        previewImg.src = objUrl;
        downloadLink.href = objUrl;
        downloadLink.download = formatFilename(capturedAt);
        resultBox.style.display = "block";
      } catch (e) {
        setStatus("error", "❌ " + e.message);
      } finally {
        captureBtn.disabled = false;
      }
    });

    // 予備：手動スクショへの帯合成
    function stampNow() {
      const d = new Date();
      const p = (n) => String(n).padStart(2, "0");
      const off = -d.getTimezoneOffset(), a = Math.abs(off);
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())} ${off >= 0 ? "+" : "-"}${p(Math.floor(a / 60))}:${p(a % 60)}`;
    }

    document.getElementById("manualMakeBtn").addEventListener("click", async () => {
      const file = document.getElementById("manualFile").files[0];
      const rawUrl = document.getElementById("manualUrl").value.trim() || urlInput.value.trim();
      const stampStr = document.getElementById("manualStamp").value.trim() || stampNow();
      if (!file) return setStatus("error", "スクリーンショット画像ファイルを選択してください。");
      if (!rawUrl) return setStatus("error", "帯に記載するURLを入力してください。");

      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight;
      const fs = Math.max(14, Math.round(W * 0.024));
      const padX = Math.round(fs * 0.9), padY = Math.round(fs * 0.75), lh = Math.round(fs * 1.4), rule = Math.max(2, Math.round(fs * 0.14));
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      const font = `${fs}px "DejaVu Sans Mono", Menlo, Consolas, monospace`;
      ctx.font = font;
      const lines = [stampStr, rawUrl];
      const wrapped = [];
      for (const t of lines) {
        let line = "";
        for (const ch of t) {
          if (ctx.measureText(line + ch).width > W - padX * 2 && line) { wrapped.push(line); line = ch; } else line += ch;
        }
        wrapped.push(line);
      }
      const bandH = padY * 2 + lh * wrapped.length + rule;
      c.width = W; c.height = H + bandH;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0);
      ctx.fillStyle = "#3b5bdb"; ctx.fillRect(0, H, W, rule);
      ctx.fillStyle = "#0f1a2b"; ctx.fillRect(0, H + rule, W, bandH - rule);
      ctx.fillStyle = "#fff"; ctx.font = font; ctx.textBaseline = "middle";
      wrapped.forEach((t, i) => ctx.fillText(t, padX, H + rule + padY + lh * i + lh / 2));

      const outUrl = c.toDataURL("image/png");
      setStatus("ok", "✅ 手動スクリーンショットに日時＋URLの帯を合成しました！");
      metaInfo.innerHTML = `
        <div><strong>取得日時:</strong> ${stampStr}</div>
        <div><strong>記載URL:</strong> ${rawUrl}</div>
        <div><strong>撮影モード:</strong> 手動スクショ＋帯合成</div>
      `;
      previewImg.src = outUrl;
      downloadLink.href = outUrl;
      downloadLink.download = formatFilename(stampStr);
      resultBox.style.display = "block";
    });
