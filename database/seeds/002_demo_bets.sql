use betting_management;
SET @uid = (SELECT id FROM users ORDER BY id LIMIT 1);

INSERT INTO bets
  (user_id, sport_id, league, match_title, home_team, away_team, home_score, away_score,
   bet_type, selection, odds, stake, potential_return, result, profit_loss, bet_date, status)
VALUES
  (@uid, (SELECT id FROM sports WHERE slug='football'),   'La Liga',        'Barcelona vs Sevilla',  'Barcelona', 'Sevilla',  2,    1,    '1X2',            'Barcelona Win',  1.85, 20, 37.00, 'won',     17.00, DATE_SUB(NOW(), INTERVAL 1 DAY), 'settled'),
  (@uid, (SELECT id FROM sports WHERE slug='basketball'), 'NBA',            'Lakers vs Warriors',    'Lakers',    'Warriors', 108,  104,  'Moneyline',      'Lakers Win',     1.90, 20, 38.00, 'won',     18.00, DATE_SUB(NOW(), INTERVAL 2 DAY), 'settled'),
  (@uid, (SELECT id FROM sports WHERE slug='tennis'),     'ATP Tour',       'Player A vs Player B',  'Player A',  'Player B', 1,    2,    'Match Winner',   'Player A',       2.10, 10, 21.00, 'lost',   -10.00, DATE_SUB(NOW(), INTERVAL 3 DAY), 'settled'),
  (@uid, (SELECT id FROM sports WHERE slug='football'),   'Premier League', 'Arsenal vs Chelsea',    'Arsenal',   'Chelsea',  3,    0,    'Over/Under',     'Over 2.5 Goals', 1.75, 25, 43.75, 'won',     18.75, DATE_SUB(NOW(), INTERVAL 4 DAY), 'settled'),
  (@uid, (SELECT id FROM sports WHERE slug='baseball'),   'MLB',            'Yankees vs Red Sox',    'Yankees',   'Red Sox',  2,    5,    'Moneyline',      'Yankees Win',    1.95, 15, 29.25, 'lost',   -15.00, DATE_SUB(NOW(), INTERVAL 5 DAY), 'settled'),
  (@uid, (SELECT id FROM sports WHERE slug='volleyball'), 'FIVB Nations League', 'Brazil vs Poland', 'Brazil',    'Poland',   NULL, NULL, 'Match Winner',   'Brazil Win',     1.60, 20, 32.00, 'pending',  0.00, DATE_ADD(NOW(), INTERVAL 1 DAY), 'upcoming'),
  (@uid, (SELECT id FROM sports WHERE slug='football'),   'Serie A',        'Inter vs Napoli',       'Inter',     'Napoli',   1,    0,    '1X2',            'Inter Win',      1.75, 20, 35.00, 'pending',  0.00, NOW(),                             'live'),
  (@uid, (SELECT id FROM sports WHERE slug='basketball'), 'NBA',            'Celtics vs Heat',       'Celtics',   'Heat',     99,   101,  'Handicap',       'Celtics -3.5',   1.91, 30, 57.30, 'lost',   -30.00, DATE_SUB(NOW(), INTERVAL 7 DAY), 'settled'),
  (@uid, (SELECT id FROM sports WHERE slug='tennis'),     'WTA Tour',       'Player C vs Player D',  'Player C',  'Player D', 2,    0,    'Match Winner',   'Player C',       1.45, 40, 58.00, 'won',     18.00, DATE_SUB(NOW(), INTERVAL 8 DAY), 'settled');