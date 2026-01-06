const express = require('express');
const router = express.Router();
const forgotCardService = require('../services/forgotCardService');
const { authenticateToken } = require('../config/jwt');

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Forgot card routes are working' });
});

router.post('/request', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const result = await forgotCardService.requestForgotCard(req.user.userId);

    res.json({
      success: true,
      message: 'Passcode created successfully',
      data: {
        passcode: result.passcode,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Forgot card request error:', error);
    console.error('Error stack:', error.stack);
    const statusCode = error.message.includes('not found') || error.message.includes('exceeded') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and verification code are required' });
    }

    const result = await forgotCardService.verifyCode(userId, code);

    res.json({
      success: true,
      message: 'Verification code verified successfully',
      data: {
        passcode: result.passcode,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(400).json({ error: error.message || 'Invalid verification code' });
  }
});

router.get('/passcode', authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const passcode = await forgotCardService.getActivePasscode(req.user.userId);

    if (!passcode) {
      return res.status(404).json({ 
        success: false,
        error: 'No active passcode found. Please request a new one.' 
      });
    }

    res.json({
      success: true,
      data: passcode
    });
  } catch (error) {
    console.error('Get passcode error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { passcode } = req.body;

    if (!passcode) {
      return res.status(400).json({ error: 'Passcode is required' });
    }

    const result = await forgotCardService.validatePasscodeAtGate(passcode);

    if (!result) {
      return res.status(404).json({ 
        error: 'Invalid or expired passcode' 
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Validate passcode error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

