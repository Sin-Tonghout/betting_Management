CREATE TABLE IF NOT EXISTS audit_logs (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id      INT          NULL,
  action       VARCHAR(60)  NOT NULL,
  entity_type  VARCHAR(50)  NULL,
  entity_id    INT UNSIGNED NULL,
  details      JSON         NULL,
  ip_address   VARCHAR(45)  NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_user    (user_id),
  KEY idx_audit_action  (action),
  KEY idx_audit_entity  (entity_type, entity_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;