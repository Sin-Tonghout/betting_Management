const pool = require('../config/db');

// Best-effort audit trail. A logging failure must never break the request.
async function logAction(req, action, entityType, entityId, details) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session?.user?.id ?? null,
        action,
        entityType || null,
        entityId || null,
        details ? JSON.stringify(details) : null,
        (req.ip || '').slice(0, 45),
        (req.get('user-agent') || '').slice(0, 255),
      ]
    );
  } catch (err) {
    console.error('audit log failed:', err.message);
  }
}

module.exports = { logAction };
