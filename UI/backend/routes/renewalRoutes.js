const express = require('express');
const router = express.Router();
const renewalService = require('../services/renewalService');
const { authenticateToken } = require('../config/jwt');

router.get('/plans', authenticateToken, async (req, res) => {
  try {
    const plans = await renewalService.getAllPlans();

    res.json({
      success: true,
      data: plans.map(plan => ({
        planId: plan.plan_id,
        planName: plan.plan_name,
        durationMonths: plan.duration_months,
        price: plan.price,
        description: plan.description
      }))
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;

    if (!planId || !paymentMethod) {
      return res.status(400).json({ error: 'Plan ID and payment method are required' });
    }

    const result = await renewalService.createRenewalRequest(
      req.user.userId,
      planId,
      paymentMethod
    );

    res.json({
      success: true,
      message: result.message,
      data: {
        planName: result.planName,
        amount: result.amount,
        paymentId: result.paymentId,
        isAsync: result.isAsync
      }
    });
  } catch (error) {
    console.error('Renewal request error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/vnpay/create', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    const paymentData = await renewalService.createVnpayPaymentRequest(
      req.user.userId,
      planId
    );

    res.json({
      success: true,
      message: 'VNPay payment request created',
      data: {
        paymentId: paymentData.paymentId,
        amount: paymentData.amount,
        planName: paymentData.planName
      }
    });
  } catch (error) {
    console.error('Create VNPay payment error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

module.exports = router;

