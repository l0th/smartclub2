const express = require('express');
const router = express.Router();
const vnpayService = require('../services/vnpayService');
const renewalService = require('../services/renewalService');
const { query, pool } = require('../config/database');
const { authenticateToken } = require('../config/jwt');

router.get('/vnpay/callback', async (req, res) => {
  try {
    const params = req.query;
    
    if (!params.vnp_TxnRef) {
      return res.redirect('/payment-callback.html?error=missing_transaction');
    }

    const paymentId = parseInt(params.vnp_TxnRef);
    const isValid = vnpayService.verifyCallback(params);

    if (!isValid) {
      return res.redirect(`/payment-callback.html?error=invalid_signature&paymentId=${paymentId}`);
    }

    const payment = await vnpayService.getPaymentById(paymentId);
    if (!payment) {
      return res.redirect('/payment-callback.html?error=payment_not_found');
    }

    const callbackAmount = params.vnp_Amount ? parseInt(params.vnp_Amount) / 100 : null;
    if (callbackAmount !== null && Math.abs(callbackAmount - payment.amount) > 0.01) {
      return res.redirect(`/payment-callback.html?error=amount_mismatch&paymentId=${paymentId}`);
    }

    const responseCode = params.vnp_ResponseCode;
    const isSuccess = responseCode === '00';

    if (isSuccess && payment.payment_status !== 'SUCCESS') {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await vnpayService.updatePaymentStatus(paymentId, 'SUCCESS', {
          transactionId: params.vnp_TransactionNo || null,
          responseCode: responseCode,
          bankCode: params.vnp_BankCode || null
        });

        const subscriptionSql = `
          SELECT s.sub_id, s.member_id, s.plan_id, p.points_earned
          FROM subscription s
          JOIN plan p ON s.plan_id = p.plan_id
          WHERE s.sub_id = ?
        `;
        const [subs] = await connection.execute(subscriptionSql, [payment.sub_id]);
        
        if (subs.length > 0) {
          const sub = subs[0];
          
          await connection.execute(
            `UPDATE subscription SET status = 'Active' WHERE sub_id = ?`,
            [payment.sub_id]
          );

          if (sub.points_earned && sub.points_earned > 0) {
            await connection.execute(
              'UPDATE user SET points = points + ? WHERE user_id = ?',
              [sub.points_earned, sub.member_id]
            );

            await connection.execute(
              `INSERT INTO points_transaction 
               (user_id, transaction_type, points, description, related_subscription_id, created_by, created_at)
               VALUES (?, 'EARNED', ?, ?, ?, ?, NOW())`,
              [
                sub.member_id,
                sub.points_earned,
                `Đăng ký gói qua VNPay`,
                payment.sub_id,
                sub.member_id
              ]
            );
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else if (!isSuccess && payment.payment_status === 'PENDING') {
      await vnpayService.updatePaymentStatus(paymentId, 'FAILED', {
        responseCode: responseCode
      });
    }

    const status = isSuccess ? 'success' : 'failed';
    return res.redirect(`/payment-callback.html?status=${status}&paymentId=${paymentId}&message=${encodeURIComponent(params.vnp_ResponseMessage || '')}`);
  } catch (error) {
    console.error('VNPay callback error:', error);
    return res.redirect('/payment-callback.html?error=server_error');
  }
});

router.post('/vnpay/ipn', async (req, res) => {
  try {
    const params = req.body;
    
    if (!params.vnp_TxnRef) {
      return res.status(400).json({ RspCode: '01', Message: 'Missing transaction reference' });
    }

    const paymentId = parseInt(params.vnp_TxnRef);
    const isValid = vnpayService.verifyCallback(params);

    if (!isValid) {
      return res.status(400).json({ RspCode: '97', Message: 'Invalid signature' });
    }

    const payment = await vnpayService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
    }

    const callbackAmount = params.vnp_Amount ? parseInt(params.vnp_Amount) / 100 : null;
    const checkAmount = callbackAmount !== null && Math.abs(callbackAmount - payment.amount) <= 0.01;
    
    if (!checkAmount) {
      return res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
    }

    const responseCode = params.vnp_ResponseCode;
    const isSuccess = responseCode === '00';

    if (isSuccess && payment.payment_status !== 'SUCCESS') {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await vnpayService.updatePaymentStatus(paymentId, 'SUCCESS', {
          transactionId: params.vnp_TransactionNo || null,
          responseCode: responseCode,
          bankCode: params.vnp_BankCode || null
        });

        const subscriptionSql = `
          SELECT s.sub_id, s.member_id, s.plan_id, p.points_earned
          FROM subscription s
          JOIN plan p ON s.plan_id = p.plan_id
          WHERE s.sub_id = ?
        `;
        const [subs] = await connection.execute(subscriptionSql, [payment.sub_id]);
        
        if (subs.length > 0) {
          const sub = subs[0];
          
          await connection.execute(
            `UPDATE subscription SET status = 'Active' WHERE sub_id = ?`,
            [payment.sub_id]
          );

          if (sub.points_earned && sub.points_earned > 0) {
            await connection.execute(
              'UPDATE user SET points = points + ? WHERE user_id = ?',
              [sub.points_earned, sub.member_id]
            );

            await connection.execute(
              `INSERT INTO points_transaction 
               (user_id, transaction_type, points, description, related_subscription_id, created_by, created_at)
               VALUES (?, 'EARNED', ?, ?, ?, ?, NOW())`,
              [
                sub.member_id,
                sub.points_earned,
                `Đăng ký gói qua VNPay`,
                payment.sub_id,
                sub.member_id
              ]
            );
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else if (!isSuccess && payment.payment_status === 'PENDING') {
      await vnpayService.updatePaymentStatus(paymentId, 'FAILED', {
        responseCode: responseCode
      });
      return res.status(200).json({ RspCode: '00', Message: 'Success' });
    } else if (payment.payment_status === 'SUCCESS') {
      return res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
    }

    return res.status(200).json({ RspCode: '00', Message: 'Success' });
  } catch (error) {
    console.error('VNPay IPN error:', error);
    return res.status(500).json({ RspCode: '99', Message: 'Internal error' });
  }
});

router.get('/vnpay/config', authenticateToken, async (req, res) => {
  try {
    const vnpayService = require('../services/vnpayService');
    res.json({
      success: true,
      data: {
        tmnCode: process.env.VNPAY_TMN_CODE || 'SO3GSJQG',
        returnUrl: process.env.VNPAY_RETURN_URL || (req.protocol + '://' + req.get('host') + '/payment-success.html')
      }
    });
  } catch (error) {
    console.error('Get VNPay config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vnpay/create-url', authenticateToken, async (req, res) => {
  try {
    const { paymentId, amount, planName } = req.body;
    
    if (!paymentId || !amount || !planName) {
      return res.status(400).json({ error: 'paymentId, amount, and planName are required' });
    }

    const payment = await vnpayService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (Math.abs(payment.amount - amount) > 0.01) {
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    const orderInfo = `Thanh toan goi ${planName}`;
    const paymentUrl = await vnpayService.createPaymentUrl(req, paymentId, amount, orderInfo);
    
    console.log(`[VNPay Desktop] Payment URL created: ${paymentUrl}`);
    console.log(`[VNPay Desktop] URL length: ${paymentUrl.length}`);
    console.log(`[VNPay Desktop] URL contains SecureHash: ${paymentUrl.includes('vnp_SecureHash')}`);

    res.json({
      success: true,
      data: {
        paymentUrl: paymentUrl
      }
    });
  } catch (error) {
    console.error('Create VNPay URL error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/vnpay/status/:paymentId', authenticateToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    
    const payment = await vnpayService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.payment_id,
        status: payment.payment_status,
        amount: payment.amount,
        method: payment.method,
        vnpayTransactionId: payment.vnpay_transaction_id,
        vnpayResponseCode: payment.vnpay_response_code
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vnpay/confirm', async (req, res) => {
  try {
    const params = req.body;
    
    if (!params.vnp_TxnRef) {
      return res.status(400).json({ error: 'Missing transaction reference' });
    }

    const paymentId = parseInt(params.vnp_TxnRef);
    const isValid = vnpayService.verifyCallback(params);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const payment = await vnpayService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const callbackAmount = params.vnp_Amount ? parseInt(params.vnp_Amount) / 100 : null;
    if (callbackAmount !== null && Math.abs(callbackAmount - payment.amount) > 0.01) {
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    const responseCode = params.vnp_ResponseCode;
    const isSuccess = responseCode === '00';

    if (isSuccess && payment.payment_status !== 'SUCCESS') {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        await vnpayService.updatePaymentStatus(paymentId, 'SUCCESS', {
          transactionId: params.vnp_TransactionNo || null,
          responseCode: responseCode,
          bankCode: params.vnp_BankCode || null
        });

        const subscriptionSql = `
          SELECT s.sub_id, s.member_id, s.plan_id, p.points_earned
          FROM subscription s
          JOIN plan p ON s.plan_id = p.plan_id
          WHERE s.sub_id = ?
        `;
        const [subs] = await connection.execute(subscriptionSql, [payment.sub_id]);
        
        if (subs.length > 0) {
          const sub = subs[0];
          
          await connection.execute(
            `UPDATE subscription SET status = 'Active' WHERE sub_id = ?`,
            [payment.sub_id]
          );

          if (sub.points_earned && sub.points_earned > 0) {
            await connection.execute(
              'UPDATE user SET points = points + ? WHERE user_id = ?',
              [sub.points_earned, sub.member_id]
            );

            await connection.execute(
              `INSERT INTO points_transaction 
               (user_id, transaction_type, points, description, related_subscription_id, created_by, created_at)
               VALUES (?, 'EARNED', ?, ?, ?, ?, NOW())`,
              [
                sub.member_id,
                sub.points_earned,
                `Đăng ký gói qua VNPay`,
                payment.sub_id,
                sub.member_id
              ]
            );
          }
        }

        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else if (!isSuccess && payment.payment_status === 'PENDING') {
      await vnpayService.updatePaymentStatus(paymentId, 'FAILED', {
        responseCode: responseCode
      });
    }

    res.json({
      success: isSuccess,
      message: isSuccess ? 'Payment confirmed successfully' : 'Payment failed',
      data: {
        paymentId: paymentId,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        responseCode: responseCode
      }
    });
  } catch (error) {
    console.error('VNPay confirm error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.get('/vnpay/status/:paymentId', authenticateToken, async (req, res) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const payment = await vnpayService.getPaymentById(paymentId);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.payment_id,
        status: payment.payment_status,
        amount: payment.amount,
        method: payment.method,
        vnpayTransactionId: payment.vnpay_transaction_id,
        vnpayResponseCode: payment.vnpay_response_code
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/confirm/:paymentId', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const paymentId = parseInt(req.params.paymentId);
    const confirmedBy = req.user.userId;

    if (!paymentId || !confirmedBy) {
      return res.status(400).json({ error: 'Payment ID and user authentication are required' });
    }

    const userSql = `SELECT role FROM user WHERE user_id = ?`;
    const [users] = await connection.execute(userSql, [confirmedBy]);
    if (users.length === 0 || users[0].role !== 'Receptionist') {
      return res.status(403).json({ error: 'Only receptionist can confirm payments' });
    }

    await connection.beginTransaction();

    const paymentSql = `
      SELECT p.payment_id, p.sub_id, p.amount, p.method, p.payment_status,
             s.member_id, s.plan_id, s.status as subscription_status,
             pl.points_earned, pl.name as plan_name
      FROM payment p
      JOIN subscription s ON p.sub_id = s.sub_id
      JOIN plan pl ON s.plan_id = pl.plan_id
      WHERE p.payment_id = ?
    `;
    const [payments] = await connection.execute(paymentSql, [paymentId]);
    
    if (payments.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = payments[0];

    if (payment.payment_status !== 'PENDING') {
      await connection.rollback();
      return res.status(400).json({ 
        error: `Payment is already ${payment.payment_status}. Cannot confirm.` 
      });
    }

    await connection.execute(
      `UPDATE payment 
       SET payment_status = 'SUCCESS', 
           cashier_id = ?,
           payment_date = NOW()
       WHERE payment_id = ?`,
      [confirmedBy, paymentId]
    );

    if (payment.subscription_status === 'Pending') {
      await connection.execute(
        `UPDATE subscription SET status = 'Active' WHERE sub_id = ?`,
        [payment.sub_id]
      );
    }

    if (payment.points_earned && payment.points_earned > 0) {
      await connection.execute(
        'UPDATE user SET points = points + ? WHERE user_id = ?',
        [payment.points_earned, payment.member_id]
      );

      await connection.execute(
        `INSERT INTO points_transaction 
         (user_id, transaction_type, points, description, related_subscription_id, created_by, created_at)
         VALUES (?, 'EARNED', ?, ?, ?, ?, NOW())`,
        [
          payment.member_id,
          payment.points_earned,
          `Đăng ký gói: ${payment.plan_name}`,
          payment.sub_id,
          confirmedBy
        ]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: {
        paymentId: payment.payment_id,
        subscriptionId: payment.sub_id,
        pointsAwarded: payment.points_earned || 0
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Confirm payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;


