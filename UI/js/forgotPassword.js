let currentStep = 1;
let resetUserId = null;
let resetCode = null;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.error').forEach(el => {
    el.style.display = 'none';
  });
});

function goToStep(step) {
  document.querySelectorAll('.step-content').forEach(el => {
    el.style.display = 'none';
  });
  document.getElementById(`step${step}`).style.display = 'block';
  currentStep = step;
  
  document.querySelectorAll('.error').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
}

async function requestPasswordReset() {
  const emailOrPhone = document.getElementById('emailOrPhone').value.trim();
  const errorEl = document.getElementById('error1');
  const successEl = document.getElementById('success1');
  const btn = document.getElementById('btnRequest');

  if (!emailOrPhone) {
    errorEl.textContent = 'Vui lòng nhập email hoặc số điện thoại!';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  successEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Đang gửi...';

  try {
    const result = await api.requestPasswordReset(emailOrPhone);

    if (result.success) {
      resetUserId = result.data.userId;
      successEl.textContent = `Mã xác nhận đã được gửi đến ${result.data.contactInfo}`;
      successEl.style.display = 'block';
      document.getElementById('contactInfo').textContent = result.data.contactInfo;
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

  if (!resetUserId) {
    errorEl.textContent = 'Lỗi: Không tìm thấy thông tin người dùng!';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Đang xác nhận...';

  try {
    const result = await api.verifyPasswordResetCode(resetUserId, code);

    if (result.success) {
      resetCode = code;
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

async function resetPassword() {
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const errorEl = document.getElementById('error3');
  const btn = document.getElementById('btnReset');

  if (!newPassword) {
    errorEl.textContent = 'Vui lòng nhập mật khẩu mới!';
    errorEl.style.display = 'block';
    return;
  }

  if (newPassword.length < 6) {
    errorEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự!';
    errorEl.style.display = 'block';
    return;
  }

  if (newPassword !== confirmPassword) {
    errorEl.textContent = 'Mật khẩu xác nhận không khớp!';
    errorEl.style.display = 'block';
    return;
  }

  if (!resetCode || !resetUserId) {
    errorEl.textContent = 'Lỗi: Không tìm thấy thông tin xác thực!';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

  try {
    const result = await api.resetPassword(resetUserId, resetCode, newPassword);

    if (result.success) {
      goToStep(4);
    } else {
      errorEl.textContent = result.error || 'Đặt lại mật khẩu thất bại!';
      errorEl.style.display = 'block';
    }
  } catch (err) {
    errorEl.textContent = err.message || 'Lỗi khi đặt lại mật khẩu. Vui lòng thử lại!';
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Đặt lại mật khẩu';
  }
}

window.goToStep = goToStep;
window.requestPasswordReset = requestPasswordReset;
window.verifyCode = verifyCode;
window.resetPassword = resetPassword;

