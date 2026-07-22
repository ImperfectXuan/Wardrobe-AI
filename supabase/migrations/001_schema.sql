-- 001_schema.sql
-- 在 public schema 下创建业务表

-- 扩展用户 profiles 表（与 Supabase Auth 的 auth.users 关联）
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  avatar_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 衣物表
CREATE TABLE public.clothing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('上衣', '裤子', '外套', '鞋子', '配饰')),
  brand VARCHAR(100),
  color VARCHAR(50),
  season VARCHAR(20),
  style VARCHAR(50),
  image_url VARCHAR(500),
  notes TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clothing_items_user_id ON public.clothing_items(user_id);
CREATE INDEX idx_clothing_items_category ON public.clothing_items(category);
CREATE INDEX idx_clothing_items_is_deleted ON public.clothing_items(is_deleted);

-- 标签表
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  "group" VARCHAR(50) DEFAULT '自定义'
);

CREATE UNIQUE INDEX idx_tags_user_name ON public.tags(user_id, name);

-- 衣物-标签关联表
CREATE TABLE public.clothing_tags (
  clothing_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (clothing_id, tag_id)
);

-- 为 PostgREST 启用行安全
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clothing_tags ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能看到自己的数据
CREATE POLICY "Users can view own profiles" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profiles" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own clothing" ON public.clothing_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clothing" ON public.clothing_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clothing" ON public.clothing_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clothing" ON public.clothing_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tags" ON public.tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON public.tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own clothing_tags" ON public.clothing_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clothing_items WHERE id = clothing_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert own clothing_tags" ON public.clothing_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.clothing_items WHERE id = clothing_id AND user_id = auth.uid())
  );
