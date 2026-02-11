-- Query to verify feature hierarchy setup
-- Run this in Supabase SQL editor

SELECT 
  fe.feature_key,
  fe.display_name,
  fe.parent_feature_key,
  pf.display_name as parent_name,
  CASE 
    WHEN fe.parent_feature_key IS NOT NULL THEN '  └─ child'
    ELSE 'ROOT'
  END as hierarchy_level
FROM feature_entitlements fe
LEFT JOIN feature_entitlements pf ON pf.feature_key = fe.parent_feature_key
WHERE 
  fe.parent_feature_key IS NOT NULL 
  OR fe.feature_key IN ('gallery_photos', 'video_library')
ORDER BY 
  COALESCE(fe.parent_feature_key, fe.feature_key),
  fe.feature_key;

-- Test get_feature_ancestors function
SELECT get_feature_ancestors('photos_zip_downloads');

-- Test get_feature_children function
SELECT * FROM get_feature_children('gallery_photos');
