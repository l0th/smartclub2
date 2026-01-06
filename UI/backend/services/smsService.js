let twilio = null;
try {
  twilio = require('twilio');
} catch (e) {
  console.warn('Twilio package not installed. SMS functionality will be disabled.');
}

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || '+18165726509';

const client = (twilio && AUTH_TOKEN) ? twilio(ACCOUNT_SID, AUTH_TOKEN) : null;

async function sendSMS(phone, message) {
  if (!client) {
    console.warn('Twilio client not initialized. SMS not sent:', message);
    return false;
  }

  try {
    const formattedPhone = formatPhoneNumber(phone);
    const messageResult = await client.messages.create({
      body: message,
      from: TWILIO_PHONE,
      to: formattedPhone
    });
    
    console.log('SMS sent successfully:', messageResult.sid);
    return true;
  } catch (error) {
    console.error('SMS sending error:', error.message);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}

function formatPhoneNumber(phone) {
  if (!phone) return phone;
  
  phone = phone.trim().replace(/\s+/g, '');
  
  if (phone.startsWith('+1')) {
    return phone;
  }
  
  if (phone.startsWith('0') && phone.length === 10) {
    return '+1' + phone.substring(1);
  }
  
  if (phone.length === 10 && !phone.startsWith('+')) {
    return '+1' + phone;
  }
  
  return phone;
}

async function sendPasswordResetCode(phone, code) {
  const message = `SmartClub: Ma xac nhan dat lai mat khau cua ban la: ${code}. Ma nay co hieu luc trong 15 phut.`;
  return await sendSMS(phone, message);
}

module.exports = { sendSMS, sendPasswordResetCode };

