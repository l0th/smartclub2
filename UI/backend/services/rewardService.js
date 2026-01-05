const { query, pool } = require('../config/database');

async function getAllActiveRewards() {
  try {
    const sql = `
      SELECT 
        reward_id,
        name,
        description,
        points_required,
        reward_type,
        related_plan_id,
        quantity,
        active
      FROM rewards
      WHERE active = 1 AND deleted_at IS NULL
      ORDER BY points_required ASC
    `;

    return await query(sql);
  } catch (error) {
    console.error('getAllActiveRewards error:', error);
    throw error;
  }
}

async function getRewardById(rewardId) {
  try {
    const sql = `
      SELECT 
        reward_id,
        name,
        description,
        points_required,
        reward_type,
        related_plan_id,
        quantity,
        active
      FROM rewards
      WHERE reward_id = ? AND deleted_at IS NULL
      LIMIT 1
    `;

    const results = await query(sql, [rewardId]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('getRewardById error:', error);
    throw error;
  }
}

async function redeemReward(userId, rewardId) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const [rewardRows] = await connection.execute(
      `SELECT reward_id, name, description, points_required, reward_type, related_plan_id, quantity, active
       FROM rewards
       WHERE reward_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [rewardId]
    );

    if (rewardRows.length === 0) {
      throw new Error('Quà không tồn tại hoặc đã bị vô hiệu hóa');
    }

    const reward = rewardRows[0];

    if (!reward.active) {
      throw new Error('Quà không tồn tại hoặc đã bị vô hiệu hóa');
    }

    const [userRows] = await connection.execute(
      'SELECT points FROM user WHERE user_id = ? FOR UPDATE',
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error('Người dùng không tồn tại');
    }

    const userPoints = userRows[0].points;
    if (userPoints < reward.points_required) {
      throw new Error('Bạn không đủ điểm để đổi quà này');
    }

    if (reward.quantity !== null && reward.quantity <= 0) {
      throw new Error('Quà đã hết hàng');
    }

    let subscriptionId = null;
    let planName = null;

    if (reward.reward_type === 'SUBSCRIPTION') {
      if (!reward.related_plan_id) {
        throw new Error('Gói liên quan không tồn tại');
      }

      const [planRows] = await connection.execute(
        'SELECT plan_id, name, duration_months FROM plan WHERE plan_id = ? AND deleted_at IS NULL',
        [reward.related_plan_id]
      );

      if (planRows.length === 0) {
        throw new Error('Gói liên quan không tồn tại');
      }

      const plan = planRows[0];
      planName = plan.name;

      const [activeSubs] = await connection.execute(
        `SELECT sub_id, start_date, end_date 
         FROM subscription 
         WHERE member_id = ? AND status = 'Active' 
         ORDER BY end_date DESC 
         LIMIT 1`,
        [userId]
      );

      if (activeSubs.length > 0) {
        const activeSub = activeSubs[0];
        subscriptionId = activeSub.sub_id;

        await connection.execute(
          `UPDATE subscription 
           SET end_date = DATE_ADD(end_date, INTERVAL ? MONTH) 
           WHERE sub_id = ?`,
          [plan.duration_months, subscriptionId]
        );
      } else {
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.duration_months);

        const [subResult] = await connection.execute(
          `INSERT INTO subscription (member_id, plan_id, start_date, end_date, status, created_by)
           VALUES (?, ?, ?, ?, 'Active', ?)`,
          [userId, reward.related_plan_id, formatDate(startDate), formatDate(endDate), userId]
        );

        subscriptionId = subResult.insertId;
      }

      const invoiceNo = `INV-${Date.now()}`;
      await connection.execute(
        `INSERT INTO payment (sub_id, amount, method, invoice_no, cashier_id)
         VALUES (?, 0, 'Cash', ?, ?)`,
        [subscriptionId, invoiceNo, userId]
      );
    }

    await connection.execute(
      'UPDATE user SET points = points - ? WHERE user_id = ?',
      [reward.points_required, userId]
    );

    if (reward.quantity !== null) {
      await connection.execute(
        'UPDATE rewards SET quantity = quantity - 1 WHERE reward_id = ?',
        [rewardId]
      );
    }

    const description = reward.reward_type === 'SUBSCRIPTION' 
      ? `Đổi quà: ${reward.name} - Gói: ${planName}`
      : `Đổi quà: ${reward.name}`;

    await connection.execute(
      `INSERT INTO points_transaction 
       (user_id, transaction_type, points, description, related_subscription_id, created_by, created_at)
       VALUES (?, 'REDEEMED', ?, ?, ?, ?, NOW())`,
      [userId, -reward.points_required, description, subscriptionId, userId]
    );

    const [updatedUser] = await connection.execute(
      'SELECT points FROM user WHERE user_id = ?',
      [userId]
    );

    await connection.commit();

    return {
      success: true,
      message: 'Đổi quà thành công',
      data: {
        rewardName: reward.name,
        pointsUsed: reward.points_required,
        remainingPoints: updatedUser[0].points,
        subscriptionId: subscriptionId,
        planName: planName
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getAllActiveRewards,
  getRewardById,
  redeemReward
};

