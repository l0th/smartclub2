const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticateToken } = require('../config/jwt');

router.get('/login', (req, res) => {
  res.status(405).json({ 
    error: 'Method not allowed',
    message: 'This endpoint requires POST method. Please use POST request with JSON body: { "cardCode": "your_card_code" }'
  });
});

router.post('/login', async (req, res) => {
  try {
    const { cardCode, username, password } = req.body;

    let result = null;

    if (cardCode) {
      result = await authService.loginByCardCode(cardCode);
      if (!result) {
        return res.status(400).json({ error: 'Invalid card code or account not found' });
      }
    } else if (username && password) {
      result = await authService.loginByUsernamePassword(username, password);
      if (!result) {
        return res.status(400).json({ error: 'Invalid username or password' });
      }
    } else {
      return res.status(400).json({ error: 'Either cardCode or (username and password) is required' });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await authService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        id: user.user_id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

