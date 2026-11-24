-- ========================================================
-- 開示請求管理＆証拠保全スイート（kaiji-gyotaku）初期マイグレーション
-- PostgreSQL 15+ / Supabase 準拠
-- ========================================================

-- UUID拡張
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ワークスペース
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    lawyer_office TEXT,
    lawyer_name TEXT,
    lawyer_tel TEXT,
    lawyer_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. メンバーシップ
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'client', 'lawyer', 'viewer')),
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, user_id)
);

-- 3. 本名・特定人物（センシティブ情報）
CREATE TABLE IF NOT EXISTS public.persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    tel TEXT,
    contact_memo TEXT,
    settlement_amount INTEGER DEFAULT 0,
    payment_due DATE,
    payment_done_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 発信者・アカウント
CREATE TABLE IF NOT EXISTS public.senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    sender_no TEXT NOT NULL,
    name TEXT NOT NULL,
    site TEXT NOT NULL,
    handle TEXT,
    profile_url TEXT,
    person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, sender_no)
);

-- 5. 投稿事案
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    case_display_id TEXT NOT NULL,
    post_no TEXT NOT NULL,
    sender_id UUID NOT NULL REFERENCES public.senders(id) ON DELETE RESTRICT,
    posted_at TIMESTAMPTZ,
    content_text TEXT NOT NULL,
    crimes TEXT[] DEFAULT '{}',
    target_url TEXT NOT NULL,
    url_deleted BOOLEAN DEFAULT false,
    step INTEGER NOT NULL DEFAULT 1 CHECK (step BETWEEN 1 AND 12),
    branch_code INTEGER,
    is_closed BOOLEAN DEFAULT false,
    filing_type TEXT,
    schedule_label TEXT,
    schedule_date DATE,
    reaction_stamp TEXT CHECK (reaction_stamp IS NULL OR reaction_stamp IN ('good', 'hmm', 'meh')),
    reaction_at TIMESTAMPTZ,
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (workspace_id, post_no)
);

-- 6. 証拠保全・魚拓メタデータ
CREATE TABLE IF NOT EXISTS public.evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/png',
    sha256_hash TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    target_url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    capture_mode TEXT NOT NULL,
    image_width INTEGER,
    image_height INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. 手続進捗履歴
CREATE TABLE IF NOT EXISTS public.case_step_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    step_no INTEGER NOT NULL,
    reached_date DATE NOT NULL,
    updated_by UUID REFERENCES auth.users(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. 書類テンプレート
CREATE TABLE IF NOT EXISTS public.document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    scope_type TEXT NOT NULL,
    note TEXT,
    package_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. 事案別書類ステータス
CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '記入待ち',
    file_url TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. メッセージ・タイムライン
CREATE TABLE IF NOT EXISTS public.case_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    sender_role TEXT NOT NULL CHECK (sender_role IN ('client', 'lawyer', 'system')),
    message TEXT NOT NULL,
    read_by_lawyer BOOLEAN DEFAULT false,
    read_by_client BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_workspace ON public.cases(workspace_id);
CREATE INDEX IF NOT EXISTS idx_cases_sender ON public.cases(sender_id);
CREATE INDEX IF NOT EXISTS idx_evidences_case ON public.evidences(case_id);
CREATE INDEX IF NOT EXISTS idx_evidences_hash ON public.evidences(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_messages_case ON public.case_messages(case_id);

-- ========================================================
-- Row Level Security (RLS) 設定
-- ========================================================

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_step_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;

-- ヘルパー関数: ログイン中のユーザーが参加しているワークスペース一覧
CREATE OR REPLACE FUNCTION public.get_user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid();
$$;

-- ワークスペースアクセス権
CREATE POLICY "Members can view workspaces they belong to"
    ON public.workspaces FOR SELECT
    USING (id IN (SELECT public.get_user_workspace_ids()));

-- ワークスペースメンバーアクセス権
CREATE POLICY "Members can view co-members"
    ON public.workspace_members FOR SELECT
    USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- 事案 (cases) アクセス権
CREATE POLICY "Members can view cases"
    ON public.cases FOR SELECT
    USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can insert cases"
    ON public.cases FOR INSERT
    WITH CHECK (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can update cases"
    ON public.cases FOR UPDATE
    USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- 証拠 (evidences) アクセス権
CREATE POLICY "Members can view evidences"
    ON public.evidences FOR SELECT
    USING (case_id IN (SELECT id FROM public.cases WHERE workspace_id IN (SELECT public.get_user_workspace_ids())));

CREATE POLICY "Members can insert evidences"
    ON public.evidences FOR INSERT
    WITH CHECK (case_id IN (SELECT id FROM public.cases WHERE workspace_id IN (SELECT public.get_user_workspace_ids())));

-- 発信者 (senders) アクセス権
CREATE POLICY "Members can view senders"
    ON public.senders FOR SELECT
    USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

CREATE POLICY "Members can manage senders"
    ON public.senders FOR ALL
    USING (workspace_id IN (SELECT public.get_user_workspace_ids()));

-- 人物 (persons) アクセス権（弁護士・オーナー・依頼者のみ）
CREATE POLICY "Authorized members can manage persons"
    ON public.persons FOR ALL
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'client', 'lawyer')
    ));

-- メッセージ (case_messages) アクセス権
CREATE POLICY "Members can view and post messages"
    ON public.case_messages FOR ALL
    USING (case_id IN (SELECT id FROM public.cases WHERE workspace_id IN (SELECT public.get_user_workspace_ids())));
