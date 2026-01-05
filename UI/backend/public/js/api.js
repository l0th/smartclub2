// Dynamic API URL - works for both local and production
const API_BASE_URL = (window.location.origin || 'http://localhost:8080') + '/api';

const TOKEN_KEY = 'smartclub_token';
const USER_KEY = 'smartclub_user';

window.SMARTCLUB_TOKEN_KEY = TOKEN_KEY;
window.SMARTCLUB_USER_KEY = USER_KEY;

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

window.getToken = getToken;
window.setToken = setToken;
window.removeToken = removeToken;

function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

async function makeRequest(method, endpoint, data = null, requiresAuth = false) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: getAuthHeaders()
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    
    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      if (response.status === 404) {
        const msg = window.i18n ? window.i18n.t('api.endpoint_not_found') : 'Không tìm thấy API endpoint. Vui lòng kiểm tra server đã chạy và routes đã được đăng ký.';
        throw new Error(msg);
      }
      const msg = window.i18n ? window.i18n.t('api.non_json_response') : 'Server trả về phản hồi không phải JSON';
      throw new Error(`${msg}: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      const isLoginEndpoint = endpoint === '/auth/login';
      
      if ((response.status === 401 || response.status === 403) && !isLoginEndpoint) {
        removeToken();
        if (window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('index.html')) {
          window.location.href = 'index.html';
        }
        const msg = window.i18n ? window.i18n.t('api.session_expired') : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        throw new Error(msg);
      }
      
      const msg = window.i18n ? window.i18n.t('api.http_error', { status: response.status }) : `Lỗi HTTP! Mã trạng thái: ${response.status}`;
      throw new Error(result.error || msg);
    }

    return result;
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      const msg = window.i18n ? window.i18n.t('api.connection_failed') : 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối của bạn.';
      throw new Error(msg);
    }
    throw error;
  }
}

const api = {
  async login(cardCode, username, password) {
    const body = cardCode ? { cardCode } : { username, password };
    const result = await makeRequest('POST', '/auth/login', body);
    if (result.success && result.data) {
      setToken(result.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.data.user));
    }
    return result;
  },

  async logout() {
    try {
      await makeRequest('POST', '/auth/logout', null, true);
    } catch (error) {
      const msg = window.i18n ? window.i18n.t('error.logout') : 'Lỗi đăng xuất';
      console.error(msg + ':', error);
    } finally {
      removeToken();
    }
  },

  async getCurrentUser() {
    const result = await makeRequest('GET', '/auth/me', null, true);
    return result.success ? result.data : null;
  },

  async getMemberProfile() {
    const result = await makeRequest('GET', '/member/profile', null, true);
    return result.success ? result.data : null;
  },

  async getCardInfo() {
    const result = await makeRequest('GET', '/member/card', null, true);
    return result.success ? result.data : null;
  },

  async getPackageInfo() {
    const result = await makeRequest('GET', '/member/package', null, true);
    return result.success ? result.data : null;
  },

  async getAccessHistory(page = 1, limit = 20) {
    const result = await makeRequest('GET', `/member/history?page=${page}&limit=${limit}`, null, true);
    return result.success ? result : null;
  },

  async getPlans() {
    const result = await makeRequest('GET', '/member/renewal/plans', null, true);
    return result.success ? result.data : [];
  },

  async submitRenewal(planId, paymentMethod) {
    const result = await makeRequest('POST', '/member/renewal/request', {
      planId,
      paymentMethod
    }, true);
    return result;
  },

  async getChatHistory(limit = 50) {
    const result = await makeRequest('GET', `/chat/messages?limit=${limit}`, null, true);
    return result.success ? result.data : [];
  },

  async saveMessage(message, receiver = 'reception01', filePath = null, fileName = null, fileType = null) {
    const result = await makeRequest('POST', '/chat/messages', {
      message,
      receiver,
      filePath,
      fileName,
      fileType
    }, true);
    return result;
  },

  async getReceptionistUsername() {
    const result = await makeRequest('GET', '/chat/receptionist', null, true);
    return result.success ? result.data.username : 'receptionist';
  },

  async requestForgotCard() {
    const result = await makeRequest('POST', '/forgot-card/request', null, true);
    return result;
  },

  async verifyForgotCardCode(userId, code) {
    const result = await makeRequest('POST', '/forgot-card/verify', { userId, code });
    return result;
  },

  async getForgotCardPasscode() {
    const result = await makeRequest('GET', '/forgot-card/passcode', null, true);
    return result.success ? result.data : null;
  },

  async getMemberPoints() {
    const result = await makeRequest('GET', '/member/points', null, true);
    return result.success ? result.data.points : 0;
  },

  async getPointsHistory(page = 1, limit = 20) {
    const result = await makeRequest('GET', `/member/points/history?page=${page}&limit=${limit}`, null, true);
    return result.success ? result : null;
  },

  async getAllRewards() {
    const result = await makeRequest('GET', '/rewards', null, false);
    return result.success ? result.data : [];
  },

  async redeemReward(rewardId) {
    const result = await makeRequest('POST', '/rewards/redeem', { rewardId }, true);
    return result;
  },

  async requestPasswordReset(emailOrPhone) {
    const result = await makeRequest('POST', '/auth/password-reset/request', { emailOrPhone });
    return result;
  },

  async verifyPasswordResetCode(userId, code) {
    const result = await makeRequest('POST', '/auth/password-reset/verify', { userId, code });
    return result;
  },

  async resetPassword(userId, code, newPassword) {
    const result = await makeRequest('POST', '/auth/password-reset/reset', { userId, code, newPassword });
    return result;
  },

  async createVnpayPayment(planId) {
    const result = await makeRequest('POST', '/member/renewal/vnpay/create', { planId }, true);
    return result;
  },

  async checkPaymentStatus(paymentId) {
    const result = await makeRequest('GET', `/payment/vnpay/status/${paymentId}`, null, true);
    return result;
  },

  async confirmVnpayPayment(params) {
    const result = await makeRequest('POST', '/payment/vnpay/confirm', params, false);
    return result;
  },

  async getVnpayConfig() {
    const result = await makeRequest('GET', '/payment/vnpay/config', null, true);
    return result;
  }
};

// Expose api to global scope
window.api = api;

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showError(message) {
  const errorEl = document.getElementById('error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => {
      errorEl.classList.remove('show');
    }, 5000);
  } else {
    alert(message);
  }
}

window.showError = showError;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;

function showLoading(elementId, show = true) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (show) {
    element.style.opacity = '0.6';
    element.style.pointerEvents = 'none';
  } else {
    element.style.opacity = '1';
    element.style.pointerEvents = 'auto';
  }
}

