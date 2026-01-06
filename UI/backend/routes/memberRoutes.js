const express = require('express');
const router = express.Router();
const memberService = require('../services/memberService');
const { authenticateToken } = require('../config/jwt');

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await memberService.getMemberProfile(req.user.userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      success: true,
      data: {
        id: profile.user_id,
        username: profile.username,
        fullName: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
        status: profile.status,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/card', authenticateToken, async (req, res) => {
  try {
    const card = await memberService.getCardInfo(req.user.userId);
    
    if (!card) {
      return res.json({
        success: true,
        data: null,
        message: 'No active card found'
      });
    }

    res.json({
      success: true,
      data: {
        cardId: card.card_id,
        cardCode: card.card_code,
        state: card.state,
        expireDate: card.expire_date,
        createdAt: card.created_at
      }
    });
  } catch (error) {
    console.error('Get card error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

router.get('/package', authenticateToken, async (req, res) => {
  try {
    const packageInfo = await memberService.getPackageInfo(req.user.userId);
    
    if (!packageInfo) {
      return res.json({
        success: true,
        data: null,
        message: 'No active package found'
      });
    }

    res.json({
      success: true,
      data: {
        subscriptionId: packageInfo.subscription_id,
        planId: packageInfo.plan_id,
        planName: packageInfo.plan_name,
        durationMonths: packageInfo.duration_months,
        price: packageInfo.price,
        startDate: packageInfo.start_date,
        endDate: packageInfo.end_date,
        status: packageInfo.status
      }
    });
  } catch (error) {
    console.error('Get package error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

router.get('/points', authenticateToken, async (req, res) => {
  try {
    const points = await memberService.getMemberPoints(req.user.userId);
    res.json({
      success: true,
      data: { points: points }
    });
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/points/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await memberService.getPointsTransactionHistory(
      req.user.userId,
      page,
      limit
    );

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get points history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

