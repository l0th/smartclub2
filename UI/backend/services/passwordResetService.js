const { query, pool } = require('../config/database');
const emailService = require('./emailService');
const smsService = require('./smsService');

const CODE_EXPIRY_MINUTES = 15;

function generateResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function findUserByEmailOrPhone(emailOrPhone) {
  const sql = `
    SELECT 
      user_id,
      username,
      full_name,
      email,
      phone,
      role,
      status
    FROM user
    WHERE deleted_at IS NULL 
      AND status = 'Active'
      AND (email = ? OR phone = ?)
    LIMIT 1
  `;
  
  const results = await query(sql, [emailOrPhone, emailOrPhone]);
  return results.length > 0 ? results[0] : null;
}

async function invalidateOldCodes(userId) {
  const sql = `
    UPDATE password_reset_tokens
    SET used = TRUE
    WHERE user_id = ?
      AND used = FALSE
      AND expires_at > NOW()
  `;
  
  await query(sql, [userId]);
}

async function requestPasswordReset(emailOrPhone) {
  if (!emailOrPhone) {
    throw new Error('Email hoặc số điện thoại là bắt buộc');
  }

  const user = await findUserByEmailOrPhone(emailOrPhone);
  if (!user) {
    throw new Error('Không tìm thấy tài khoản với email hoặc số điện thoại này');
  }

  await invalidateOldCodes(user.user_id);

  const resetCode = generateResetCode();
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRY_MINUTES);

  let codeType = user.email ? 'EMAIL' : 'SMS';

  const sql = `
    INSERT INTO password_reset_tokens 
      (user_id, email, phone, reset_code, code_type, expires_at, used)
    VALUES (?, ?, ?, ?, ?, ?, FALSE)
  `;

  await query(sql, [
    user.user_id,
    user.email || null,
    user.phone || null,
    resetCode,
    codeType,
    expiresAt
  ]);

  let contactInfo;
  let sendSuccess = false;

  if (codeType === 'EMAIL' && user.email) {
    try {
      await emailService.sendPasswordResetCode(user.email, resetCode);
      contactInfo = user.email;
      sendSuccess = true;
    } catch (emailError) {
      console.error('Email sending failed, attempting SMS fallback:', emailError.message);
      if (user.phone) {
        try {
          await smsService.sendPasswordResetCode(user.phone, resetCode);
          contactInfo = user.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1***$3');
          codeType = 'SMS';
          sendSuccess = true;
          
          await query(`
            UPDATE password_reset_tokens 
            SET code_type = 'SMS' 
            WHERE user_id = ? AND reset_code = ? AND used = FALSE
          `, [user.user_id, resetCode]);
        } catch (smsError) {
          throw new Error(`Không thể gửi mã xác nhận qua email hoặc SMS. Vui lòng thử lại sau.`);
        }
      } else {
        throw new Error(`Không thể gửi email đến ${user.email}. Vui lòng thử lại sau.`);
      }
    }
  } else if (user.phone) {
    try {
      await smsService.sendPasswordResetCode(user.phone, resetCode);
      contactInfo = user.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1***$3');
      sendSuccess = true;
    } catch (smsError) {
      console.error('SMS sending failed, attempting email fallback:', smsError.message);
      if (user.email) {
        try {
          await emailService.sendPasswordResetCode(user.email, resetCode);
          contactInfo = user.email;
          codeType = 'EMAIL';
          sendSuccess = true;
          
          await query(`
            UPDATE password_reset_tokens 
            SET code_type = 'EMAIL' 
            WHERE user_id = ? AND reset_code = ? AND used = FALSE
          `, [user.user_id, resetCode]);
        } catch (emailError) {
          throw new Error(`Không thể gửi mã xác nhận qua SMS hoặc email. Vui lòng thử lại sau.`);
        }
      } else {
        throw new Error(`Không thể gửi SMS đến ${user.phone}. Vui lòng thử lại sau.`);
      }
    }
  } else {
    throw new Error('Tài khoản không có email hoặc số điện thoại để gửi mã xác nhận');
  }

  if (!sendSuccess) {
    throw new Error('Không thể gửi mã xác nhận. Vui lòng thử lại sau.');
  }

  return {
    userId: user.user_id,
    contactInfo: contactInfo
  };
}

async function verifyCode(userId, code) {
  const sql = `
    SELECT token_id, user_id, reset_code, expires_at
    FROM password_reset_tokens
    WHERE user_id = ?
      AND reset_code = ?
      AND used = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const results = await query(sql, [userId, code]);
  
  if (results.length === 0) {
    throw new Error('Mã xác nhận không hợp lệ hoặc đã hết hạn');
  }

  return {
    success: true
  };
}

async function resetPassword(userId, code, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
  }

  const sql = `
    SELECT token_id, user_id, expires_at
    FROM password_reset_tokens
    WHERE user_id = ?
      AND reset_code = ?
      AND used = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const results = await query(sql, [userId, code]);
  
  if (results.length === 0) {
    throw new Error('Mã xác nhận không hợp lệ hoặc đã hết hạn');
  }

  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const updatePasswordSql = `
    UPDATE user
    SET password_hash = ?, updated_at = NOW()
    WHERE user_id = ?
  `;

  await query(updatePasswordSql, [passwordHash, userId]);

  const markTokenUsedSql = `
    UPDATE password_reset_tokens
    SET used = TRUE
    WHERE token_id = ?
  `;

  await query(markTokenUsedSql, [results[0].token_id]);

  return {
    success: true
  };
}

module.exports = {
  requestPasswordReset,
  verifyCode,
  resetPassword
};

