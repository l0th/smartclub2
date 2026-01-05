const express = require('express');
const router = express.Router();
const rewardService = require('../services/rewardService');
const { authenticateToken } = require('../config/jwt');

router.get('/', async (req, res) => {
  try {
    const rewards = await rewardService.getAllActiveRewards();
    res.json({
      success: true,
      data: rewards
    });
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rewardId = parseInt(req.params.id);
    if (isNaN(rewardId)) {
      return res.status(400).json({ error: 'Invalid reward ID' });
    }

    const reward = await rewardService.getRewardById(rewardId);
    
    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({
      success: true,
      data: reward
    });
  } catch (error) {
    console.error('Get reward by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const { rewardId } = req.body;

    if (!rewardId) {
      return res.status(400).json({ error: 'Reward ID is required' });
    }

    const result = await rewardService.redeemReward(req.user.userId, rewardId);

    res.json(result);
  } catch (error) {
    console.error('Redeem reward error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error' 
    });
  }
});

module.exports = router;


