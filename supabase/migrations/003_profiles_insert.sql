-- 允许用户为自己创建 profiles 行（设置页 upsert 需要）
CREATE POLICY "Users can insert own profiles" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
