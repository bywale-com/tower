-- Seed initial topics so the Discover search has real data beyond canada-immigration
INSERT INTO topics (slug, title, query, status)
VALUES
  ('atlantic-canada-immigration', 'Atlantic Canada Immigration', 'atlantic canada immigration', 'active'),
  ('canada-study-permit',         'Canada Study Permit',         'canada study permit',         'active'),
  ('south-africa-immigration',    'South Africa Immigration',    'south africa immigration',    'active')
ON CONFLICT (slug) DO NOTHING;
