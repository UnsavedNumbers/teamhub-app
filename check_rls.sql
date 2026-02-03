SELECT policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'event_locations' 
ORDER BY policyname;
