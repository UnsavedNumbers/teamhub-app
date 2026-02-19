-- Help Center: allow authenticated users to read shared configuration and metadata
-- so all roles can render /help and role category pages using the platform-admin setup.

DROP POLICY IF EXISTS "Authenticated users can read WordPress config" ON help_wordpress_config;
CREATE POLICY "Authenticated users can read WordPress config"
  ON help_wordpress_config
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read role mappings" ON help_role_category_mappings;
CREATE POLICY "Authenticated users can read role mappings"
  ON help_role_category_mappings
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read category page mappings" ON help_category_page_mappings;
CREATE POLICY "Authenticated users can read category page mappings"
  ON help_category_page_mappings
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read help sections" ON help_sections;
CREATE POLICY "Authenticated users can read help sections"
  ON help_sections
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can read section tag combinations" ON help_section_tag_combinations;
CREATE POLICY "Authenticated users can read section tag combinations"
  ON help_section_tag_combinations
  FOR SELECT
  USING (auth.role() = 'authenticated');
