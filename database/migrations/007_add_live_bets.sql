ALTER TABLE bets
  ADD COLUMN is_live TINYINT(1) NOT NULL DEFAULT 0 AFTER away_score,
  ADD COLUMN live_minute VARCHAR(10) NULL AFTER is_live,
  ADD INDEX idx_bets_user_live (user_id, is_live, result);