INSERT IGNORE INTO sports (name, slug) VALUES
  ('Football',   'football'),
  ('Basketball', 'basketball'),
  ('Tennis',     'tennis'),
  ('Baseball',   'baseball'),
  ('Volleyball', 'volleyball'),
  ('Other',      'other');

INSERT IGNORE INTO leagues (sport_id, name, slug) VALUES
  ((SELECT id FROM sports WHERE slug = 'football'),   'Premier League',        'premier-league'),
  ((SELECT id FROM sports WHERE slug = 'football'),   'La Liga',               'la-liga'),
  ((SELECT id FROM sports WHERE slug = 'football'),   'Serie A',               'serie-a'),
  ((SELECT id FROM sports WHERE slug = 'football'),   'Bundesliga',            'bundesliga'),
  ((SELECT id FROM sports WHERE slug = 'football'),   'Ligue 1',               'ligue-1'),
  ((SELECT id FROM sports WHERE slug = 'football'),   'UEFA Champions League', 'uefa-champions-league'),
  ((SELECT id FROM sports WHERE slug = 'basketball'), 'NBA',                   'nba'),
  ((SELECT id FROM sports WHERE slug = 'basketball'), 'EuroLeague',            'euroleague'),
  ((SELECT id FROM sports WHERE slug = 'tennis'),     'ATP Tour',              'atp-tour'),
  ((SELECT id FROM sports WHERE slug = 'tennis'),     'WTA Tour',              'wta-tour'),
  ((SELECT id FROM sports WHERE slug = 'tennis'),     'Grand Slam',            'grand-slam'),
  ((SELECT id FROM sports WHERE slug = 'baseball'),   'MLB',                   'mlb'),
  ((SELECT id FROM sports WHERE slug = 'baseball'),   'NPB',                   'npb'),
  ((SELECT id FROM sports WHERE slug = 'volleyball'), 'FIVB Nations League',   'fivb-nations-league');