let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('Nodemailer package not installed. Email functionality will be disabled.');
}

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

let transporter = null;

function getTransporter() {
  if (!nodemailer) {
    return null;
  }
  
  if (!transporter) {
    if (!SMTP_USER || !SMTP_PASS) {
      return null;
    }
    
    try {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
      
      console.log(`Email transporter initialized using environment credentials`);
    } catch (error) {
      console.error('Failed to initialize email transporter:', error.message);
      return null;
    }
  }
  
  return transporter;
}

async function sendEmail(to, subject, text, html) {
  const transport = getTransporter();
  
  if (!transport) {
    const errorMsg = !nodemailer 
      ? 'Nodemailer package not installed. Please run: npm install nodemailer'
      : 'Email credentials not configured. Please set SMTP_USER and SMTP_PASS environment variables.';
    console.warn(`Email not sent to ${to}: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  try {
    const info = await transport.sendMail({
      from: `"SmartClub" <${SMTP_USER}>`,
      to: to,
      subject: subject,
      text: text,
      html: html || text
    });
    
    console.log(`Email sent successfully to ${to}, messageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Email sending error to ${to}:`, error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

async function sendVerificationCode(email, code) {
  const subject = 'SmartClub - Mã xác nhận quên thẻ';
  const text = `Mã xác nhận của bạn là: ${code}\n\nMã này có hiệu lực trong 15 phút.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">SmartClub - Mã xác nhận quên thẻ</h2>
      <p>Mã xác nhận của bạn là:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #666; font-size: 12px;">Mã này có hiệu lực trong 15 phút.</p>
    </div>
  `;
  
  return await sendEmail(email, subject, text, html);
}

async function sendPasswordResetCode(email, code) {
  const subject = 'SmartClub - Mã xác nhận đặt lại mật khẩu';
  const text = `Mã xác nhận đặt lại mật khẩu của bạn là: ${code}\n\nMã này có hiệu lực trong 15 phút.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">SmartClub - Mã xác nhận đặt lại mật khẩu</h2>
      <p>Mã xác nhận đặt lại mật khẩu của bạn là:</p>
      <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
        ${code}
      </div>
      <p style="color: #666; font-size: 12px;">Mã này có hiệu lực trong 15 phút.</p>
    </div>
  `;
  
  return await sendEmail(email, subject, text, html);
}

module.exports = { sendEmail, sendVerificationCode, sendPasswordResetCode };

