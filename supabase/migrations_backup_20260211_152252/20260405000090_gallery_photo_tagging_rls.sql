-- Enable RLS on gallery_photo_tags
ALTER TABLE gallery_photo_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view photo tags" ON gallery_photo_tags;
DROP POLICY IF EXISTS "Users can insert photo tags" ON gallery_photo_tags;
DROP POLICY IF EXISTS "Users can delete photo tags" ON gallery_photo_tags;

-- Allow authenticated users to view photo tags
CREATE POLICY "Authenticated users can view photo tags"
ON gallery_photo_tags
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert photo tags
CREATE POLICY "Authenticated users can insert photo tags"
ON gallery_photo_tags
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to delete photo tags
CREATE POLICY "Authenticated users can delete photo tags"
ON gallery_photo_tags
FOR DELETE
TO authenticated
USING (true);
