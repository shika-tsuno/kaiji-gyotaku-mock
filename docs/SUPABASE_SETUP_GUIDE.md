# Supabase プロジェクト開設 & 環境構築完全ガイド

**プロジェクト名**: 開示請求管理＆魚拓証拠保全スイート（kaiji-gyotaku）  
**対象読者**: 開発者および運用担当者

---

## 1. Supabase プロジェクトの作成（約3分）

1. [Supabase 公式サイト](https://supabase.com/) にアクセスし、ログインします。
2. **「New Project」** をクリックします。
3. 以下の項目を設定します：
   - **Name**: `kaiji-gyotaku`（任意）
   - **Database Password**: 強力なパスワードを生成し、安全に保管してください。
   - **Region**: `Tokyo (ap-northeast-1)`（日本の裁判・通信レスポンスに最適）
   - **Pricing Plan**: `Free`（無料枠で十分開始可能）
4. **「Create new project」** をクリックし、プロビジョニング完了（約1〜2分）を待ちます。

---

## 2. APIキーとURLの取得

プロジェクトダッシュボードの左メニューから **「Project Settings」 (歯車アイコン) -> 「API」** を開きます。

以下の3つの値をメモします：
1. **Project URL**: `https://<your-project-ref>.supabase.co`
2. **Project API keys (anon / public)**: `eyJhbGciOi...`（ブラウザPWA用）
3. **Project API keys (service_role / secret)**: `eyJhbGciOi...`（Cloud Run バックエンド用特権キー。**外部公開厳禁**）

---

## 3. データベースマイグレーションの適用

1. Supabase ダッシュボードの左メニューから **「SQL Editor」** を開きます。
2. **「New Query」** をクリックします。
3. リポジトリ内の以下のファイル内容をそのまま貼り付けます：
   - [docs/migrations/001_initial_schema.sql](file:///Users/kazuna/workSpace/kaiji-gyotaku/docs/migrations/001_initial_schema.sql)
4. 右下の **「Run」** ボタンを押します。
5. 「Success. No rows returned」と表示されれば、テーブル（workspaces, cases, senders, evidences等）およびRLSセキュリティポリシーの作成が完了です。

---

## 4. Storage バケットの作成（証拠画像用）

1. 左メニューの **「Storage」** を開きます。
2. **「New bucket」** をクリックします。
3. 以下の通り設定します：
   - **Bucket name**: `evidences`
   - **Public bucket**: **OFF**（裁判証拠・相手方個人情報のため非公開）
4. **「Save」** をクリックして作成完了です。

---

## 5. 初期テストデータのシード投入（コマンド実行）

ローカルターミナルで以下のコマンドを実行すると、サンプル事案（#01〜#07）、発信者、書類テンプレートが投入されます。

```bash
cd /Users/kazuna/workSpace/kaiji-gyotaku

SUPABASE_URL="https://<your-project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>" \
node scripts/seed.js
```

---

## 6. 各環境への環境変数設定

### A. バックエンド（Cloud Run）
Cloud Shell または gcloud CLI で環境変数を設定します：

```bash
gcloud run services update kaiji-gyotaku \
  --region asia-northeast1 \
  --set-env-vars SUPABASE_URL="https://<your-project-ref>.supabase.co",SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

### B. フロントエンド PWA（app.html）
ブラウザ側（`app.html`）では、画面右上の「☁️ クラウド連携設定」ボタンから `Project URL` と `anon key` を入力して保存するか、`window.SUPABASE_CONFIG` に埋め込むことで、どの端末からでも即座に接続できます。
