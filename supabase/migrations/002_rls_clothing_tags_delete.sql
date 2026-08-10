-- 002_rls_clothing_tags_delete.sql
-- 更新衣物标签时需要删除旧关联，补齐 DELETE 策略

CREATE POLICY "Users can delete own clothing_tags" ON public.clothing_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.clothing_items
      WHERE id = clothing_id AND user_id = auth.uid()
    )
  );
