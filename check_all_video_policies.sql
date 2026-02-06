-- Check ALL RLS policies on videos table, not just update policy

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'videos'
ORDER BY policyname;
