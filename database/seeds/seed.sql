UPDATE users SET role='admin' WHERE email='root@c.com';

SHOW TABLES;                                -- audit_logs, bet_categories, bets, leagues, sessions, sports, users
SELECT id, name, slug FROM sports;          -- 6 rows
SELECT COUNT(*) FROM leagues;               -- 14

SELECT u.id, u.name, u.email, COUNT(b.id) AS bets
FROM users u
LEFT JOIN bets b ON b.user_id = u.id
GROUP BY u.id, u.name, u.email;