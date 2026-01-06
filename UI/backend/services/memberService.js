const { query } = require('../config/database');

async function getMemberProfile(userId) {
  const sql = `
    SELECT 
      u.user_id,
      u.username,
      u.full_name,
      u.email,
      u.phone,
      u.address,
      u.status,
      u.created_at,
      u.updated_at
    FROM user u
    WHERE u.user_id = ? AND u.deleted_at IS NULL AND u.role = 'Member'
    LIMIT 1
  `;

  const results = await query(sql, [userId]);
  return results.length > 0 ? results[0] : null;
}

async function getCardInfo(userId) {
  const sql = `
    SELECT 
      c.card_id,
      c.card_code,
      c.state,
      c.issue_date,
      c.expire_date
    FROM card c
    WHERE c.user_id = ? AND c.state = 'Active'
    LIMIT 1
  `;

  try {
    const results = await query(sql, [userId]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('getCardInfo error:', error);
    console.error('SQL:', sql);
    console.error('Params:', [userId]);
    throw error;
  }
}

async function getPackageInfo(userId) {
  try {
    const sql = `
      SELECT 
        s.sub_id as subscription_id,
        s.start_date,
        s.end_date,
        s.status,
        p.plan_id,
        p.name as plan_name,
        p.duration_months,
        p.price
    FROM subscription s
    INNER JOIN plan p ON s.plan_id = p.plan_id
    WHERE s.member_id = ? AND s.status = 'Active'
    ORDER BY s.start_date DESC
    LIMIT 1
    `;

    const results = await query(sql, [userId]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('getPackageInfo error:', error);
    throw error;
  }
}

async function getMemberPoints(userId) {
  try {
    const sql = `
      SELECT points
      FROM user
      WHERE user_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;

    const results = await query(sql, [userId]);
    return results.length > 0 ? results[0].points : 0;
  } catch (error) {
    console.error('getMemberPoints error:', error);
    throw error;
  }
}

async function getPointsTransactionHistory(userId, page = 1, limit = 20) {
  try {
    const offset = (page - 1) * limit;

    const countSql = `
      SELECT COUNT(*) as total
      FROM points_transaction
      WHERE user_id = ?
    `;

    const dataSql = `
      SELECT 
        transaction_id,
        transaction_type,
        points,
        description,
        related_subscription_id,
        created_at
      FROM points_transaction
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [countResults] = await query(countSql, [userId]);
    const total = countResults[0].total;

    const data = await query(dataSql, [userId, limit, offset]);

    return {
      data: data,
      pagination: {
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('getPointsTransactionHistory error:', error);
    throw error;
  }
}

module.exports = { 
  getMemberProfile, 
  getCardInfo, 
  getPackageInfo,
  getMemberPoints,
  getPointsTransactionHistory
};

