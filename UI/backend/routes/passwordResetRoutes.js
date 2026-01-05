const express = require('express');
const router = express.Router();
const passwordResetService = require('../services/passwordResetService');

router.post('/request', async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    if (!emailOrPhone) {
      return res.status(400).json({ error: 'Email hoặc số điện thoại là bắt buộc' });
    }

    const result = await passwordResetService.requestPasswordReset(emailOrPhone);

    res.json({
      success: true,
      message: 'Mã xác nhận đã được gửi',
      data: result
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ error: error.message || 'Lỗi hệ thống' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID và mã xác nhận là bắt buộc' });
    }

    const result = await passwordResetService.verifyCode(userId, code);

    res.json({
      success: true,
      message: 'Mã xác nhận hợp lệ',
      data: result
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(400).json({ error: error.message || 'Mã xác nhận không hợp lệ' });
  }
});

router.post('/reset', async (req, res) => {
  try {
    const { userId, code, newPassword } = req.body;

    if (!userId || !code || !newPassword) {
      return res.status(400).json({ error: 'Thông tin đặt lại mật khẩu không đầy đủ' });
    }

    const result = await passwordResetService.resetPassword(userId, code, newPassword);

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công',
      data: result
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(400).json({ error: error.message || 'Đặt lại mật khẩu thất bại' });
  }
});

module.exports = router;

