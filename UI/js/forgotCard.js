let currentUserId = null;
let countdownInterval = null;

function goToStep(step) {
  document.querySelectorAll('.step-content').forEach(el => {
    el.style.display = 'none';
    el.classList.remove('active');
  });
  
  const stepEl = document.getElementById(`step${step}`);
  if (stepEl) {
    stepEl.style.display = 'block';
    stepEl.classList.add('active');
  }
  
  document.querySelectorAll('.error').forEach(el => {
    el.textContent = '';
    el.style.display = 'none';
  });
  
  if (step === 1) {
    document.getElementById('emailOrPhone').value = '';
    currentUserId = null;
  } else if (step === 2) {
    document.getElementById('verificationCode').value = '';
  }
}

async function requestForgotCard() {
  const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
  const errorEl = document.getElementById('error1');
  const successEl = document.getElementById('success1');
  const btn = document.getElementById('btnRequest');

  if (!emailOrPhone) {
    errorEl.textContent = 'Vui lòng nhập email hoặc số điện thoại!';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.textContent = '';
  errorEl.style.display = 'none';
  successEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Đang gửi...';

  try {
    const result = await api.requestForgotCard(emailOrPhone);
    
    if (result.success) {
      currentUserId = result.data.userId;
      const contactInfo = result.data.contact;
      document.getElementById('contactInfo').textContent = contactInfo;
      successEl.textContent = `Mã xác nhận đã được gửi đến ${result.data.codeType === 'EMAIL' ? 'email' : 'số điện thoại'} của bạn!`;
      successEl.style.display = 'block';
      setTimeout(() => {
        goToStep(2);
      }, 1500);
    } else {
      errorEl.textContent = result.error || 'Gửi mã xác nhận thất bại!';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Lỗi kết nối. Vui lòng thử lại!';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gửi mã xác nhận';
  }
}

async function verifyCode() {
  const code = document.getElementById('verificationCode').value.trim();
  const errorEl = document.getElementById('error2');
  const btn = document.getElementById('btnVerify');

  if (!code || code.length !== 6) {
    errorEl.textContent = 'Vui lòng nhập đúng mã 6 số!';
    errorEl.style.display = 'block';
    return;
  }

  if (!currentUserId) {
    errorEl.textContent = 'Lỗi: Không tìm thấy thông tin người dùng!';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.textContent = '';
  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Đang xác nhận...';

  try {
    const result = await api.verifyForgotCardCode(currentUserId, code);
    
    if (result.success) {
      displayPasscode(result.data.passcode, result.data.expiresAt);
      goToStep(3);
    } else {
      errorEl.textContent = result.error || 'Mã xác nhận không hợp lệ!';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn!';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Xác nhận';
  }
}

function displayPasscode(passcode, expiresAt) {
  document.getElementById('passcodeText').textContent = passcode;
  
  const expiryDate = new Date(expiresAt);
  startCountdown(expiryDate);
}

function startCountdown(expiryDate) {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  function updateCountdown() {
    const now = new Date();
    const diff = expiryDate - now;

    if (diff <= 0) {
      document.getElementById('timeRemaining').textContent = '00:00:00';
      clearInterval(countdownInterval);
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    document.getElementById('timeRemaining').textContent = timeStr;
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

async function copyPasscode() {
  const passcode = document.getElementById('passcodeText').textContent;
  
  if (passcode === '- - - - - - - -') {
    return;
  }

  try {
    await navigator.clipboard.writeText(passcode);
    const btn = document.getElementById('btnCopy');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    btn.style.background = '#4caf50';
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    alert('Không thể sao chép. Vui lòng sao chép thủ công: ' + passcode);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const codeInput = document.getElementById('verificationCode');
  if (codeInput) {
    codeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    });
  }
});

