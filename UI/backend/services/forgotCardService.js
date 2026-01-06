const { query } = require('../config/database');
const crypto = require('crypto');

const PASSCODE_EXPIRY_HOURS = 24;
const VERIFICATION_CODE_EXPIRY_MINUTES = 15;
const MAX_REQUESTS_PER_DAY = 100;

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generatePasscode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let passcode = '';
  for (let i = 0; i < 8; i++) {
    passcode += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return passcode;
}

async function findUserByEmailOrPhone(email, phone) {
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
      AND role = 'Member'
      AND status = 'Active'
      AND (email = ? OR phone = ?)
    LIMIT 1
  `;
  
  const results = await query(sql, [
    email || '',
    phone || ''
  ]);
  
  return results.length > 0 ? results[0] : null;
}

async function checkRequestLimit(userId) {
  const sql = `
    SELECT COUNT(*) as count
    FROM forgot_card_tokens
    WHERE user_id = ?
      AND created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
  `;
  
  const results = await query(sql, [userId]);
  return results[0].count < MAX_REQUESTS_PER_DAY;
}

async function invalidateOldPasscodes(userId) {
  const sql = `
    UPDATE forgot_card_tokens
    SET used = TRUE
    WHERE user_id = ?
      AND used = FALSE
      AND verified = TRUE
      AND expires_at > NOW()
  `;
  
  await query(sql, [userId]);
}

async function requestForgotCard(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    const userSql = `
      SELECT user_id, email, phone
      FROM user
      WHERE user_id = ? AND deleted_at IS NULL AND role = 'Member' AND status = 'Active'
      LIMIT 1
    `;
    
    const userResults = await query(userSql, [userId]);
    if (userResults.length === 0) {
      throw new Error('Member not found');
    }

    const user = userResults[0];

    if (!(await checkRequestLimit(user.user_id))) {
      throw new Error(`Maximum ${MAX_REQUESTS_PER_DAY} requests per day exceeded`);
    }

    await invalidateOldPasscodes(user.user_id);

    const passcode = generatePasscode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + PASSCODE_EXPIRY_HOURS);

    let sql;
    let params;
    
    try {
      sql = `
        INSERT INTO forgot_card_tokens 
          (user_id, email, phone, verification_code, passcode, code_type, expires_at, verified, used)
        VALUES (?, ?, ?, NULL, ?, 'WEB', ?, TRUE, FALSE)
      `;
      params = [
        user.user_id,
        user.email || null,
        user.phone || null,
        passcode,
        expiresAt
      ];
      await query(sql, params);
    } catch (error) {
      if (error.message && (error.message.includes('code_type') || error.message.includes("'WEB'"))) {
        sql = `
          INSERT INTO forgot_card_tokens 
            (user_id, email, phone, verification_code, passcode, code_type, expires_at, verified, used)
          VALUES (?, ?, ?, '', ?, 'EMAIL', ?, TRUE, FALSE)
        `;
        params = [
          user.user_id,
          user.email || null,
          user.phone || null,
          passcode,
          expiresAt
        ];
        await query(sql, params);
      } else if (error.message && (error.message.includes('verification_code') || error.message.includes('NULL'))) {
        sql = `
          INSERT INTO forgot_card_tokens 
            (user_id, email, phone, verification_code, passcode, code_type, expires_at, verified, used)
          VALUES (?, ?, ?, '000000', ?, 'EMAIL', ?, TRUE, FALSE)
        `;
        params = [
          user.user_id,
          user.email || null,
          user.phone || null,
          passcode,
          expiresAt
        ];
        await query(sql, params);
      } else {
        throw error;
      }
    }

    return {
      userId: user.user_id,
      passcode: passcode,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('requestForgotCard error:', error);
    throw error;
  }
}

async function verifyCode(userId, code) {
  const sql = `
    SELECT token_id, passcode, expires_at
    FROM forgot_card_tokens
    WHERE user_id = ?
      AND verification_code = ?
      AND verified = FALSE
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const results = await query(sql, [userId, code]);
  
  if (results.length === 0) {
    throw new Error('Invalid or expired verification code');
  }

  const token = results[0];
  
  const updateSql = `
    UPDATE forgot_card_tokens
    SET verified = TRUE
    WHERE token_id = ?
  `;
  
  await query(updateSql, [token.token_id]);

  return {
    passcode: token.passcode,
    expiresAt: token.expires_at
  };
}

async function getActivePasscode(userId) {
  try {
    const sql = `
      SELECT passcode, expires_at, used, used_at
      FROM forgot_card_tokens
      WHERE user_id = ?
        AND verified = TRUE
        AND used = FALSE
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const results = await query(sql, [userId]);
    
    if (results.length === 0) {
      return null;
    }

    return {
      passcode: results[0].passcode,
      expiresAt: results[0].expires_at,
      used: results[0].used === 1 || results[0].used === true,
      usedAt: results[0].used_at
    };
  } catch (error) {
    console.error('getActivePasscode error:', error);
    throw error;
  }
}

async function validatePasscodeAtGate(passcode) {
  const sql = `
    SELECT 
      fct.token_id,
      fct.user_id,
      fct.passcode,
      fct.expires_at,
      fct.used,
      u.full_name,
      u.username,
      c.card_id,
      c.card_code
    FROM forgot_card_tokens fct
    INNER JOIN user u ON fct.user_id = u.user_id
    LEFT JOIN card c ON u.user_id = c.user_id AND c.state = 'Active'
    WHERE fct.passcode = ?
      AND fct.verified = TRUE
      AND fct.used = FALSE
      AND fct.expires_at > NOW()
    LIMIT 1
  `;

  const results = await query(sql, [passcode]);
  
  if (results.length === 0) {
    return null;
  }

  const token = results[0];
  
  const updateSql = `
    UPDATE forgot_card_tokens
    SET used = TRUE, used_at = NOW()
    WHERE token_id = ?
  `;
  
  await query(updateSql, [token.token_id]);

  return {
    valid: true,
    userId: token.user_id,
    cardId: token.card_id,
    cardCode: token.card_code,
    memberName: token.full_name,
    username: token.username
  };
}

module.exports = {
  requestForgotCard,
  verifyCode,
  getActivePasscode,
  validatePasscodeAtGate
};

