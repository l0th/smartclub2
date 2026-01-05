// Hệ thống đa ngôn ngữ (i18n) cho SmartClub
// Hỗ trợ chuyển đổi giữa tiếng Việt và tiếng Anh

const i18n = {
  currentLang: localStorage.getItem('smartclub_lang') || 'vi',
  
  translations: {
    vi: {
      // API Errors
      'api.endpoint_not_found': 'Không tìm thấy API endpoint. Vui lòng kiểm tra server đã chạy và routes đã được đăng ký.',
      'api.non_json_response': 'Server trả về phản hồi không phải JSON',
      'api.session_expired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      'api.http_error': 'Lỗi HTTP! Mã trạng thái: {status}',
      'api.connection_failed': 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối của bạn.',
      
      // General Errors
      'error.load_user_failed': 'Không thể tải thông tin người dùng',
      'error.logout': 'Lỗi đăng xuất',
      'error.card_info': 'Lỗi thông tin thẻ',
      'error.package_info': 'Lỗi thông tin gói dịch vụ',
      'error.history': 'Lỗi lịch sử',
      'error.load_member_page': 'Lỗi tải trang thành viên',
      'error.load_plans': 'Lỗi tải danh sách gói dịch vụ',
      'error.no_username': 'Không tìm thấy tên người dùng',
      'error.message': 'Lỗi tin nhắn',
      'error.socket_connection': 'Lỗi kết nối Socket.IO',
      'error.load_chat_history': 'Lỗi tải lịch sử chat',
      'error.send_message': 'Lỗi gửi tin nhắn',
      'error.get_receptionist': 'Lỗi lấy thông tin lễ tân',
      'error.load_more_history': 'Lỗi tải thêm lịch sử',
      'error.load_forgot_card': 'Lỗi tải passcode quên thẻ',
      'error.qrcode_not_loaded': 'Thư viện QRCode chưa được tải, đang thử tải...',
      'error.qrcode_generation': 'Lỗi tạo QR code',
      'error.copy_failed': 'Sao chép thất bại',
      'error.load_points': 'Lỗi tải điểm tích lũy',
      'error.load_rewards': 'Lỗi tải danh sách quà',
      'error.redeem_reward': 'Lỗi đổi quà',
      'error.vnpay_config': 'Không thể lấy cấu hình VNPay, sử dụng mặc định',
      
      // Success Messages
      'success.message_sent': 'Tin nhắn đã được gửi thành công',
      'success.redeem_success': 'Đổi quà thành công!',
      'success.copy_success': 'Đã sao chép',
      
      // Validation Messages
      'validation.card_code_required': 'Vui lòng nhập mã thẻ!',
      'validation.card_code_format': 'Mã thẻ phải gồm đúng 10 chữ số!',
      'validation.username_required': 'Vui lòng nhập tên đăng nhập!',
      'validation.username_format': 'Tên đăng nhập phải là số điện thoại hợp lệ (10 chữ số, bắt đầu bằng 0)!',
      'validation.password_required': 'Vui lòng nhập mật khẩu!',
      'validation.email_phone_required': 'Vui lòng nhập email hoặc số điện thoại!',
      'validation.code_6_digits': 'Vui lòng nhập đúng mã 6 số!',
      'validation.user_not_found': 'Lỗi: Không tìm thấy thông tin người dùng!',
      'validation.password_min_length': 'Mật khẩu phải có ít nhất 6 ký tự!',
      'validation.password_mismatch': 'Mật khẩu xác nhận không khớp!',
      'validation.auth_info_missing': 'Lỗi: Không tìm thấy thông tin xác thực!',
      
      // Login Errors
      'login.failed': 'Đăng nhập thất bại!',
      'login.invalid_credentials': 'Tên đăng nhập hoặc mật khẩu không đúng!',
      'login.connection_error': 'Lỗi kết nối. Vui lòng thử lại!',
      
      // Other Messages
      'message.loading': 'Đang tải...',
      'message.login_processing': 'Đang đăng nhập...',
      'message.cannot_copy': 'Không thể sao chép. Vui lòng sao chép thủ công: {text}',
      'message.redeem_failed': 'Đổi quà thất bại',
      'message.redeem_error': 'Lỗi khi đổi quà. Vui lòng thử lại!',
      'message.payment_under_development': 'Chức năng đang được phát triển, vui lòng chọn phương thức khác',
      
      // UI Text - Index Page
      'ui.title.member_lookup': 'TRA CỨU THÀNH VIÊN',
      'ui.button.card_id': 'Mã thẻ',
      'ui.button.account': 'Tài khoản',
      'ui.text.enter_card_info': 'Nhập mã thẻ của bạn để xem thông tin',
      'ui.placeholder.card_code': 'Nhập mã thẻ...',
      'ui.button.login': 'Đăng nhập',
      'ui.text.enter_username_password': 'Nhập tên đăng nhập và mật khẩu',
      'ui.placeholder.username': 'Tên đăng nhập (số điện thoại)...',
      'ui.placeholder.password': 'Mật khẩu...',
      'ui.link.forgot_password': 'Quên mật khẩu?'
    },
    
    en: {
      // API Errors
      'api.endpoint_not_found': 'API endpoint not found. Please check if the server is running and routes are registered.',
      'api.non_json_response': 'Server returned non-JSON response',
      'api.session_expired': 'Session expired. Please login again.',
      'api.http_error': 'HTTP error! Status: {status}',
      'api.connection_failed': 'Cannot connect to server. Please check your connection.',
      
      // General Errors
      'error.load_user_failed': 'Failed to get user',
      'error.logout': 'Logout error',
      'error.card_info': 'Card info error',
      'error.package_info': 'Package info error',
      'error.history': 'History error',
      'error.load_member_page': 'Load member page error',
      'error.load_plans': 'Load plans error',
      'error.no_username': 'No username found',
      'error.message': 'Message error',
      'error.socket_connection': 'Socket.IO connection error',
      'error.load_chat_history': 'Load chat history error',
      'error.send_message': 'Send message error',
      'error.get_receptionist': 'Error getting receptionist username',
      'error.load_more_history': 'Load more history error',
      'error.load_forgot_card': 'Load forgot card passcode error',
      'error.qrcode_not_loaded': 'QRCode library not loaded, attempting to load...',
      'error.qrcode_generation': 'QR code generation exception',
      'error.copy_failed': 'Failed to copy',
      'error.load_points': 'Load member points error',
      'error.load_rewards': 'Load rewards error',
      'error.redeem_reward': 'Redeem reward error',
      'error.vnpay_config': 'Failed to get VNPay config, using defaults',
      
      // Success Messages
      'success.message_sent': 'Message sent successfully',
      'success.redeem_success': 'Redeem reward successfully!',
      'success.copy_success': 'Copied',
      
      // Validation Messages
      'validation.card_code_required': 'Please enter card code!',
      'validation.card_code_format': 'Card code must be exactly 10 digits!',
      'validation.username_required': 'Please enter username!',
      'validation.username_format': 'Username must be a valid phone number (10 digits, starting with 0)!',
      'validation.password_required': 'Please enter password!',
      'validation.email_phone_required': 'Please enter email or phone number!',
      'validation.code_6_digits': 'Please enter a valid 6-digit code!',
      'validation.user_not_found': 'Error: User information not found!',
      'validation.password_min_length': 'Password must be at least 6 characters!',
      'validation.password_mismatch': 'Password confirmation does not match!',
      'validation.auth_info_missing': 'Error: Authentication information not found!',
      
      // Login Errors
      'login.failed': 'Login failed!',
      'login.invalid_credentials': 'Invalid username or password!',
      'login.connection_error': 'Connection error. Please try again!',
      
      // Other Messages
      'message.loading': 'Loading...',
      'message.login_processing': 'Logging in...',
      'message.cannot_copy': 'Cannot copy. Please copy manually: {text}',
      'message.redeem_failed': 'Redeem reward failed',
      'message.redeem_error': 'Error redeeming reward. Please try again!',
      'message.payment_under_development': 'This feature is under development, please choose another payment method',
      
      // UI Text - Index Page
      'ui.title.member_lookup': 'MEMBER LOOKUP',
      'ui.button.card_id': 'Card ID',
      'ui.button.account': 'Account',
      'ui.text.enter_card_info': 'Enter your card ID to view information',
      'ui.placeholder.card_code': 'Enter card ID...',
      'ui.button.login': 'Login',
      'ui.text.enter_username_password': 'Enter username and password',
      'ui.placeholder.username': 'Username (phone number)...',
      'ui.placeholder.password': 'Password...',
      'ui.link.forgot_password': 'Forgot password?'
    }
  },
  
  // Lấy bản dịch theo key
  t(key, params = {}) {
    const lang = this.currentLang;
    let translation = this.translations[lang]?.[key] || this.translations['vi'][key] || key;
    
    // Thay thế các tham số {param}
    if (params && typeof translation === 'string') {
      Object.keys(params).forEach(param => {
        translation = translation.replace(`{${param}}`, params[param]);
      });
    }
    
    return translation;
  },
  
  // Đổi ngôn ngữ
  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('smartclub_lang', lang);
      // Trigger event để các component có thể cập nhật
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
      return true;
    }
    return false;
  },
  
  // Lấy ngôn ngữ hiện tại
  getLanguage() {
    return this.currentLang;
  },
  
  // Translate tất cả các element có data-i18n attribute
  translatePage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      // Xử lý placeholder cho input
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translation;
      } 
      // Xử lý title cho các thẻ
      else if (element.hasAttribute('title')) {
        element.title = translation;
      }
      // Xử lý value cho button/input type button
      else if (element.tagName === 'BUTTON' || (element.tagName === 'INPUT' && element.type === 'button')) {
        element.textContent = translation;
      }
      // Xử lý text content cho các thẻ khác
      else {
        element.textContent = translation;
      }
    });
    
    // Cập nhật lang attribute của html tag
    document.documentElement.lang = this.currentLang;
  }
};

// Export để sử dụng global
window.i18n = i18n;

// Khởi tạo ngôn ngữ từ localStorage hoặc mặc định là tiếng Việt
if (!localStorage.getItem('smartclub_lang')) {
  localStorage.setItem('smartclub_lang', 'vi');
  i18n.currentLang = 'vi';
}

