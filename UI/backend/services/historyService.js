const { query } = require('../config/database');

async function getAccessHistory(userId, page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const countSql = `
      SELECT COUNT(*) as total
      FROM access_log
      WHERE member_id = ?
    `;
    const countResults = await query(countSql, [userId]);
    const total = countResults[0].total;

    const sql = `
      SELECT 
        al.log_id,
        al.card_id,
        al.timestamp,
        al.direction,
        al.result,
        al.gate_id,
        CASE al.gate_id 
          WHEN 1 THEN 'Cổng 1' 
          WHEN 2 THEN 'Cổng 2' 
          WHEN 3 THEN 'Cổng VIP' 
          ELSE CONCAT('Cổng ', CAST(al.gate_id AS CHAR)) 
        END as gate_name
      FROM access_log al
      WHERE al.member_id = ?
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `;

    const data = await query(sql, [userId, limit, offset]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('getAccessHistory error:', error);
    throw error;
  }
}

module.exports = { getAccessHistory };

