const crypto = require('crypto');
const querystring = require('qs');
const moment = require('moment');
const { query } = require('../config/database');
const tunnelService = require('./tunnelService');

const VNPAY_TMN_CODE = process.env.VNPAY_TMN_CODE || 'SO3GSJQG';
const VNPAY_HASH_SECRET = process.env.VNPAY_HASH_SECRET || 'ZKUNPZCP7S0FPKZRLF30ZA7WA4CZ15UP';
const VNPAY_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

function getBaseUrl() {
  const tunnelUrl = tunnelService.getTunnelUrl();
  if (tunnelUrl && tunnelService.isTunnelActive()) {
    console.log(`[VNPay] Using tunnel URL: ${tunnelUrl}`);
    return tunnelUrl;
  }
  
  const envReturnUrl = process.env.VNPAY_RETURN_URL;
  if (envReturnUrl) {
    const baseUrl = envReturnUrl.replace('/payment-callback.html', '').replace('/api/payment/vnpay/ipn', '');
    console.log(`[VNPay] Using environment URL: ${baseUrl}`);
    return baseUrl;
  }
  
  const port = process.env.PORT || 8080;
  const localhostUrl = `http://localhost:${port}`;
  console.warn(`[VNPay] ⚠️  Using localhost URL (VNPay may not work): ${localhostUrl}`);
  return localhostUrl;
}

function getReturnUrl() {
  const baseUrl = getBaseUrl();
  const returnUrl = `${baseUrl}/payment-callback.html`;
  console.log(`[VNPay] Return URL: ${returnUrl}`);
  return returnUrl;
}

function getIpnUrl() {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/payment/vnpay/ipn`;
}

process.env.TZ = 'Asia/Ho_Chi_Minh';

function sortObject(obj) {
  const sorted = {};
  const str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

function createSecureHash(data) {
  const sortedData = sortObject(data);
  const signData = querystring.stringify(sortedData, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  return hmac.update(new Buffer(signData, 'utf-8')).digest('hex');
}

function getIpAddress(req) {
  return req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
    '127.0.0.1';
}

async function createPaymentUrl(req, paymentId, amount, orderInfo, orderType = 'other', locale = 'vn', bankCode = null) {
  if (!process.env.VNPAY_RETURN_URL && !tunnelService.isTunnelActive()) {
    try {
      console.log('[VNPay] Waiting for tunnel to be ready...');
      await tunnelService.waitForTunnelReady(10000);
      console.log('[VNPay] Tunnel is ready');
    } catch (error) {
      console.warn(`[VNPay] ⚠️  Tunnel not ready: ${error.message}. Using available URL.`);
    }
  }

  if (!process.env.VNPAY_RETURN_URL && !tunnelService.isTunnelActive()) {
    throw new Error('VNPay requires a public URL. Tunnel is not available and VNPAY_RETURN_URL is not set.');
  }

  if (tunnelService.isTunnelActive()) {
    const isHealthy = await tunnelService.checkTunnelHealth();
    if (!isHealthy) {
      console.warn('[VNPay] ⚠️  Tunnel health check failed. Payment may fail.');
    } else {
      console.log('[VNPay] ✅ Tunnel health check passed');
    }
  }

  const date = new Date();
  const createDate = moment(date).format('YYYYMMDDHHmmss');
  const ipAddr = getIpAddress(req);
  const returnUrl = getReturnUrl();
  
  console.log(`[VNPay] Creating payment URL for paymentId: ${paymentId}`);
  console.log(`[VNPay] Amount: ${amount} VND`);
  console.log(`[VNPay] OrderInfo: ${orderInfo}`);
  console.log(`[VNPay] Return URL: ${returnUrl}`);
  console.log(`[VNPay] TMN Code: ${VNPAY_TMN_CODE}`);
  
  const vnpParams = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_TMN_CODE,
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: paymentId.toString(),
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Locale: locale,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate
  };

  if (bankCode !== null && bankCode !== '') {
    vnpParams['vnp_BankCode'] = bankCode;
  }

  console.log(`[VNPay] Parameters before signing:`, JSON.stringify(vnpParams, null, 2));

  const sortedParams = sortObject(vnpParams);
  const signData = querystring.stringify(sortedParams, { encode: false });
  console.log(`[VNPay] Sign data: ${signData}`);
  
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  const signed = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');
  console.log(`[VNPay] SecureHash: ${signed}`);
  
  vnpParams['vnp_SecureHash'] = signed;
  const vnpUrl = VNPAY_URL + '?' + querystring.stringify(vnpParams, { encode: false });
  
  console.log(`[VNPay] Final payment URL length: ${vnpUrl.length} characters`);

  return vnpUrl;
}

function verifyCallback(params) {
  const secureHash = params.vnp_SecureHash;
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sortedParams = sortObject(params);
  const signData = querystring.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_HASH_SECRET);
  const calculatedHash = hmac.update(new Buffer(signData, 'utf-8')).digest('hex');

  return secureHash === calculatedHash;
}

async function getPaymentById(paymentId) {
  const sql = `
    SELECT 
      payment_id,
      sub_id,
      amount,
      method,
      payment_status,
      invoice_no,
      vnpay_transaction_id,
      vnpay_response_code
    FROM payment
    WHERE payment_id = ?
    LIMIT 1
  `;

  const results = await query(sql, [paymentId]);
  return results.length > 0 ? results[0] : null;
}

async function updatePaymentStatus(paymentId, status, vnpayData = {}) {
  const sql = `
    UPDATE payment
    SET payment_status = ?,
        vnpay_transaction_id = ?,
        vnpay_response_code = ?,
        vnpay_bank_code = ?,
        payment_date = CASE WHEN ? = 'SUCCESS' THEN NOW() ELSE payment_date END
    WHERE payment_id = ?
  `;

  await query(sql, [
    status,
    vnpayData.transactionId || null,
    vnpayData.responseCode || null,
    vnpayData.bankCode || null,
    status,
    paymentId
  ]);
}

module.exports = {
  createPaymentUrl,
  verifyCallback,
  getPaymentById,
  updatePaymentStatus
};


