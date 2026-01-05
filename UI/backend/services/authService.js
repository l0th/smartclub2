const { query } = require('../config/database');
const { generateToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');

async function loginByCardCode(cardCode) {
  const sql = `
    SELECT 
      u.user_id,
      u.username,
      u.full_name,
      u.email,
      u.phone,
      u.address,
      u.role,
      u.status,
      c.card_id,
      c.card_code,
      c.state as card_state
    FROM user u
    INNER JOIN card c ON u.user_id = c.user_id
    WHERE c.card_code = ? 
      AND u.deleted_at IS NULL 
      AND u.role = 'Member'
      AND c.state = 'Active'
    LIMIT 1
  `;

  const results = await query(sql, [cardCode]);
  
  if (results.length === 0) {
    return null;
  }

  const user = results[0];
  
  const token = generateToken({
    userId: user.user_id,
    username: user.username,
    cardCode: user.card_code,
    role: user.role
  });

  return {
    user: {
      id: user.user_id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      cardCode: user.card_code,
      cardId: user.card_id
    },
    token
  };
}

async function loginByUsernamePassword(username, password) {
  if (!username || !password) {
    return null;
  }

  const sql = `
    SELECT 
      u.user_id,
      u.username,
      u.full_name,
      u.email,
      u.phone,
      u.address,
      u.role,
      u.status,
      u.password_hash,
      c.card_id,
      c.card_code,
      c.state as card_state
    FROM user u
    LEFT JOIN card c ON u.user_id = c.user_id AND c.state = 'Active'
    WHERE u.username = ?
      AND u.deleted_at IS NULL
      AND u.role = 'Member'
      AND u.status = 'Active'
    LIMIT 1
  `;

  const results = await query(sql, [username]);
  
  if (results.length === 0) {
    return null;
  }

  const user = results[0];
  
  if (!user.password_hash) {
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  
  if (!passwordMatch) {
    return null;
  }

  const token = generateToken({
    userId: user.user_id,
    username: user.username,
    cardCode: user.card_code || null,
    role: user.role
  });

  return {
    user: {
      id: user.user_id,
      username: user.username,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
      cardCode: user.card_code || null,
      cardId: user.card_id || null
    },
    token
  };
}

async function getUserById(userId) {
  const sql = `
    SELECT 
      user_id,
      username,
      full_name,
      email,
      phone,
      address,
      role,
      status,
      created_at,
      updated_at
    FROM user
    WHERE user_id = ? AND deleted_at IS NULL
    LIMIT 1
  `;

  const results = await query(sql, [userId]);
  return results.length > 0 ? results[0] : null;
}

module.exports = { loginByCardCode, loginByUsernamePassword, getUserById };

