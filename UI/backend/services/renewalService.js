const { query } = require('../config/database');

function mapPaymentMethodToDatabase(frontendMethod) {
  const mapping = {
    'Tiền mặt tại quầy': 'Cash',
    'Chuyển khoản ngân hàng': 'Transfer',
    'Ví điện tử': 'Card',
    'Thanh toán qua VNPay': 'VNPay'
  };
  return mapping[frontendMethod] || 'Cash';
}

function requiresConfirmation(paymentMethod) {
  if (paymentMethod === 'VNPay') {
    return false;
  }
  return true;
}

async function getAllPlans() {
  try {
    const sql = `
      SELECT 
        plan_id,
        name as plan_name,
        duration_months,
        price,
        description,
        active as status
      FROM plan
      WHERE active = 1 AND (deleted_at IS NULL OR deleted_at = '')
      ORDER BY duration_months ASC
    `;

    return await query(sql);
  } catch (error) {
    console.error('getAllPlans error:', error);
    throw error;
  }
}

async function createRenewalRequest(userId, planId, paymentMethod) {
  const connection = await require('../config/database').pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const checkActiveSql = `
      SELECT sub_id, end_date
      FROM subscription
      WHERE member_id = ? AND status = 'Active'
      ORDER BY end_date DESC
      LIMIT 1
    `;
    const [activeSubs] = await connection.execute(checkActiveSql, [userId]);

    const planSql = `SELECT name, duration_months, price, points_earned FROM plan WHERE plan_id = ?`;
    const [plans] = await connection.execute(planSql, [planId]);
    
    if (plans.length === 0) {
      throw new Error('Plan not found');
    }

    const plan = plans[0];

    const dbPaymentMethod = mapPaymentMethodToDatabase(paymentMethod);
    const needsConfirmation = requiresConfirmation(dbPaymentMethod);
    const subscriptionStatus = 'Pending';

    let subId;

    if (activeSubs.length > 0) {
      const activeSub = activeSubs[0];
      subId = activeSub.sub_id;

      await connection.execute(
        `UPDATE subscription 
         SET end_date = DATE_ADD(end_date, INTERVAL ? MONTH), status = 'Pending'
         WHERE sub_id = ?`,
        [plan.duration_months, subId]
      );
    } else {
      const insertSql = `
        INSERT INTO subscription (member_id, plan_id, start_date, end_date, status, created_by)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), ?, ?)
      `;
      
      await connection.execute(insertSql, [userId, planId, plan.duration_months, subscriptionStatus, userId]);

      const subIdResult = await connection.execute('SELECT LAST_INSERT_ID() as sub_id');
      subId = subIdResult[0][0].sub_id;
    }

    const invoiceNo = `INV-${Date.now()}`;
    const paymentStatus = 'PENDING';
    const paymentSql = `
      INSERT INTO payment (sub_id, amount, method, invoice_no, cashier_id, payment_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [paymentResult] = await connection.execute(paymentSql, [subId, plan.price, dbPaymentMethod, invoiceNo, userId, paymentStatus]);
    const paymentId = paymentResult.insertId;

    await connection.commit();

    return {
      success: true,
      message: 'Yêu cầu gia hạn đã được gửi. Vui lòng thanh toán tại quầy và chờ xác nhận từ nhân viên.',
      planName: plan.name,
      amount: plan.price,
      paymentId: paymentId,
      requiresConfirmation: needsConfirmation
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function createVnpayPaymentRequest(userId, planId) {
  const connection = await require('../config/database').pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const checkActiveSql = `
      SELECT sub_id, end_date
      FROM subscription
      WHERE member_id = ? AND status = 'Active'
      ORDER BY end_date DESC
      LIMIT 1
    `;
    const [activeSubs] = await connection.execute(checkActiveSql, [userId]);

    const planSql = `SELECT name, duration_months, price, points_earned FROM plan WHERE plan_id = ?`;
    const [plans] = await connection.execute(planSql, [planId]);
    
    if (plans.length === 0) {
      throw new Error('Plan not found');
    }

    const plan = plans[0];

    let subId;

    if (activeSubs.length > 0) {
      const activeSub = activeSubs[0];
      subId = activeSub.sub_id;

      await connection.execute(
        `UPDATE subscription 
         SET end_date = DATE_ADD(end_date, INTERVAL ? MONTH), status = 'Pending'
         WHERE sub_id = ?`,
        [plan.duration_months, subId]
      );
    } else {
      const insertSql = `
        INSERT INTO subscription (member_id, plan_id, start_date, end_date, status, created_by)
        VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MONTH), 'Pending', ?)
      `;
      
      await connection.execute(insertSql, [userId, planId, plan.duration_months, userId]);

      const subIdResult = await connection.execute('SELECT LAST_INSERT_ID() as sub_id');
      subId = subIdResult[0][0].sub_id;
    }

    const invoiceNo = `INV-${Date.now()}`;
    const paymentSql = `
      INSERT INTO payment (sub_id, amount, method, invoice_no, cashier_id, payment_status)
      VALUES (?, ?, 'VNPay', ?, ?, 'PENDING')
    `;
    
    const [paymentResult] = await connection.execute(paymentSql, [subId, plan.price, invoiceNo, userId]);
    const paymentId = paymentResult.insertId;

    await connection.commit();

    return {
      paymentId: paymentId,
      amount: plan.price,
      planName: plan.name,
      subId: subId
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { getAllPlans, createRenewalRequest, createVnpayPaymentRequest };

