const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const { authenticateToken } = require('../config/jwt');

router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    console.log('GET /api/chat/messages - userId:', req.user.userId, 'limit:', limit);
    const messages = await chatService.getChatHistory(req.user.userId, limit);

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Get chat messages error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

router.get('/receptionist', authenticateToken, async (req, res) => {
  try {
    const receptionistUsername = await chatService.getActiveReceptionist();
    res.json({
      success: true,
      data: { username: receptionistUsername }
    });
  } catch (error) {
    console.error('Get receptionist error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { message, receiver, filePath, fileName, fileType, fileData } = req.body;

    if (!message && !filePath && !fileData) {
      return res.status(400).json({ error: 'Message or file is required' });
    }

    const username = await chatService.getUsernameByUserId(req.user.userId);
    if (!username) {
      return res.status(404).json({ error: 'User not found' });
    }

    let targetReceiver = receiver;
    if (!targetReceiver) {
      targetReceiver = await chatService.getActiveReceptionist();
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    let fileBuffer = null;
    let fileSize = null;
    if (fileData) {
      fileBuffer = Buffer.from(fileData, 'base64');
      fileSize = fileBuffer.length;

      if (fileSize > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File size exceeds 10MB limit' });
      }
    }

    await chatService.saveMessage(username, targetReceiver, message || '', fileBuffer, fileName, fileType, filePath, fileSize);

    res.json({
      success: true,
      message: 'Message saved successfully'
    });
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

