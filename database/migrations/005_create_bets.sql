SHOW CREATE TABLE users;

CREATE TABLE IF NOT EXISTS bets (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
   user_id           INT           NOT NULL,
  sport_id          INT UNSIGNED  NOT NULL,
  category_id       INT UNSIGNED  NULL,
  league            VARCHAR(100)  NULL,
  match_title       VARCHAR(200)  NOT NULL,
  home_team         VARCHAR(100)  NOT NULL,
  away_team         VARCHAR(100)  NOT NULL,
  home_score        SMALLINT UNSIGNED NULL,
  away_score        SMALLINT UNSIGNED NULL,
  bet_type          VARCHAR(50)   NOT NULL,
  selection         VARCHAR(150)  NOT NULL,
  odds              DECIMAL(7,2)  NOT NULL,
  stake             DECIMAL(12,2) NOT NULL,
  potential_return  DECIMAL(12,2) NOT NULL,
  result            ENUM('pending','won','lost','void') NOT NULL DEFAULT 'pending',
  profit_loss       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  bet_date          DATETIME      NOT NULL,
  status            ENUM('upcoming','live','settled') NOT NULL DEFAULT 'upcoming',
  notes             TEXT          NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),

  KEY idx_bets_user_date   (user_id, bet_date),
  KEY idx_bets_user_result (user_id, result),
  KEY idx_bets_bet_date    (bet_date),
  KEY idx_bets_status      (status),
  KEY idx_bets_sport_id    (sport_id),
  KEY idx_bets_category_id (category_id),

  CONSTRAINT chk_bets_odds  CHECK (odds > 1),
  CONSTRAINT chk_bets_stake CHECK (stake > 0),

  CONSTRAINT fk_bets_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bets_sport FOREIGN KEY (sport_id)
    REFERENCES sports (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_bets_category FOREIGN KEY (category_id)
    REFERENCES bet_categories (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;