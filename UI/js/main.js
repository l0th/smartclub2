document.addEventListener("DOMContentLoaded", () => {
  const btnLogin = document.getElementById("btnLogin");
  const btnLoginAccount = document.getElementById("btnLoginAccount");

  if (btnLogin) {
    btnLogin.addEventListener("click", handleLoginByCard);
  }

  if (btnLoginAccount) {
    btnLoginAccount.addEventListener("click", handleLoginByAccount);

    const passwordInput = document.getElementById("password");
    if (passwordInput) {
      passwordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          handleLoginByAccount();
        }
      });
    }
  }

  if (!btnLogin && !btnLoginAccount) {
    const token = window.getToken
      ? window.getToken()
      : localStorage.getItem("smartclub_token");
    if (!token) {
      window.location.href = "index.html";
      return;
    }
    loadMemberPage();
    initSocket();
    setupFileInput();
  } else {
    const token = window.getToken
      ? window.getToken()
      : localStorage.getItem("smartclub_token");
    const userKey = window.SMARTCLUB_USER_KEY || "smartclub_user";
    const user = JSON.parse(localStorage.getItem(userKey) || "null");
    
    if (token && user) {
      window.location.href = "member.html";
      return;
    }
  }
});

function switchLoginMode(mode) {
  const btnCard = document.getElementById("btnToggleCard");
  const btnAccount = document.getElementById("btnToggleAccount");
  const formCard = document.getElementById("loginCard");
  const formAccount = document.getElementById("loginAccount");
  const error = document.getElementById("error");

  error.textContent = "";
  error.style.display = "none";

  if (mode === "card") {
    btnCard.classList.add("active");
    btnAccount.classList.remove("active");
    formCard.style.display = "block";
    formAccount.style.display = "none";
  } else {
    btnCard.classList.remove("active");
    btnAccount.classList.add("active");
    formCard.style.display = "none";
    formAccount.style.display = "block";
  }
}

window.switchLoginMode = switchLoginMode;

async function handleLoginByCard() {
  const cardCode = document.getElementById("cardCode").value.trim();
  const error = document.getElementById("error");
  const btn = document.getElementById("btnLogin");

  if (cardCode === "") {
    error.textContent = "Vui lòng nhập mã thẻ!";
    error.style.display = "block";
    return;
  }
  // thêm patern kiểm tra mã thẻ chỉ gồm 10 chữ số
  if (!/^\d{10}$/.test(cardCode)) {
    error.textContent = "Mã thẻ phải gồm đúng 10 chữ số!";
    error.style.display = "block";
    return;
  }

  error.textContent = "";
  error.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Đang đăng nhập...";

  try {
    const result = await api.login(cardCode, null, null);
    if (result.success) {
      window.location.href = "member.html";
    } else {
      error.textContent = result.error || "Đăng nhập thất bại!";
      error.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Đăng nhập";
    }
  } catch (err) {
    error.textContent = err.message || "Lỗi kết nối. Vui lòng thử lại!";
    error.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Đăng nhập";
  }
}

async function handleLoginByAccount() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const error = document.getElementById("error");
  const btn = document.getElementById("btnLoginAccount");

  if (username === "") {
    error.textContent = "Vui lòng nhập tên đăng nhập!";
    error.style.display = "block";
    return;
  }
  // Kiểm tra username phải là số điện thoại Việt Nam hợp lệ (10 chữ số, bắt đầu bằng 0)
  if (!/^0\d{9}$/.test(username)) {
    error.textContent =
      "Tên đăng nhập phải là số điện thoại hợp lệ (10 chữ số, bắt đầu bằng 0)!";
    error.style.display = "block";
    return;
  }

  if (password === "") {
    error.textContent = "Vui lòng nhập mật khẩu!";
    error.style.display = "block";
    return;
  }

  error.textContent = "";
  error.style.display = "none";
  btn.disabled = true;
  btn.textContent = "Đang đăng nhập...";

  try {
    const result = await api.login(null, username, password);
    if (result.success) {
      window.location.href = "member.html";
    } else {
      error.textContent =
        result.error || "Tên đăng nhập hoặc mật khẩu không đúng!";
      error.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Đăng nhập";
    }
  } catch (err) {
    error.textContent = err.message || "Lỗi kết nối. Vui lòng thử lại!";
    error.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Đăng nhập";
  }
}

async function loadMemberPage() {
  try {
    const token = window.getToken
      ? window.getToken()
      : localStorage.getItem("smartclub_token");
    const userKey = window.SMARTCLUB_USER_KEY || "smartclub_user";
    const user = JSON.parse(localStorage.getItem(userKey) || "null");
    
    if (!token && !user) {
      window.location.href = "index.html";
      return;
    }
    
    if (token && !user) {
      try {
        const result = await api.getCurrentUser();
        if (result.success && result.data) {
          localStorage.setItem(userKey, JSON.stringify(result.data));
        } else {
          window.location.href = "index.html";
          return;
        }
      } catch (error) {
        const msg = window.i18n ? window.i18n.t('error.load_user_failed') : 'Không thể tải thông tin người dùng';
        console.error(msg + ':', error);
        window.location.href = "index.html";
        return;
      }
    }
    
    const finalUser = JSON.parse(localStorage.getItem(userKey) || "null");
    if (!finalUser) {
      window.location.href = "index.html";
      return;
    }

    document.getElementById("memberName").textContent =
      finalUser.fullName || finalUser.username;

    const historyLoading = document.getElementById("historyLoading");
    if (historyLoading) historyLoading.style.display = "block";

    const [profile, card, packageInfo, history, points] =
      await Promise.allSettled([
        api.getMemberProfile(),
        api.getCardInfo(),
        api.getPackageInfo(),
        api.getAccessHistory(1, HISTORY_LIMIT),
        api.getMemberPoints(),
      ]);

    if (profile.status === "fulfilled" && profile.value) {
      document.getElementById("name").textContent =
        profile.value.fullName || profile.value.username;
    }

    if (card.status === "fulfilled" && card.value) {
      document.getElementById("cardId").textContent =
        card.value.cardCode || "N/A";
    } else {
      if (card.status === "rejected") {
        const msg = window.i18n ? window.i18n.t('error.card_info') : 'Lỗi thông tin thẻ';
        console.warn(msg + ':', card.reason);
      }
      document.getElementById("cardId").textContent = "N/A";
    }

    if (packageInfo.status === "fulfilled" && packageInfo.value) {
      document.getElementById("plan").textContent =
        packageInfo.value.planName || "N/A";
      document.getElementById("start").textContent =
        formatDate(packageInfo.value.startDate) || "N/A";
      document.getElementById("end").textContent =
        formatDate(packageInfo.value.endDate) || "N/A";
    } else {
      if (packageInfo.status === "rejected") {
        const msg = window.i18n ? window.i18n.t('error.package_info') : 'Lỗi thông tin gói dịch vụ';
        console.warn(msg + ':', packageInfo.reason);
      }
      document.getElementById("plan").textContent = "N/A";
      document.getElementById("start").textContent = "N/A";
      document.getElementById("end").textContent = "N/A";
    }

    if (
      history.status === "fulfilled" &&
      history.value &&
      history.value.success
    ) {
      const total = history.value.pagination
        ? history.value.pagination.total
        : history.value.data.length;
      displayHistory(history.value.data, total);
    } else if (history.status === "rejected") {
      const msg = window.i18n ? window.i18n.t('error.history') : 'Lỗi lịch sử';
      console.warn(msg + ':', history.reason);
      showHistoryError();
    }

    const loadMoreBtn = document.getElementById("loadMoreHistoryBtn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", loadMoreHistory);
    }

    if (points.status === "fulfilled") {
      document.getElementById("points").textContent = points.value || 0;
    }

    await loadPlans();
    await getReceptionistUsername();
    await loadChatHistory();
    await loadRewards();
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.load_member_page') : 'Lỗi tải trang thành viên';
    console.error(msg + ':', error);
    showError("Không thể tải dữ liệu. Vui lòng thử lại!");
  }
}

function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add("active");

    if (
      tabId === "chat" &&
      target.querySelector("#chatBox").children.length === 0
    ) {
      loadChatHistory();
    } else if (tabId === "forgot-card") {
      loadForgotCardTab();
    }
  }
}

async function loadPlans() {
  try {
    const plans = await api.getPlans();
    const planSelect = document.getElementById("planSelect");
    if (planSelect && plans.length > 0) {
      planSelect.innerHTML = plans
        .map((plan) => {
          const price = new Intl.NumberFormat("vi-VN").format(plan.price);
          return `<option value="${plan.planId}">${plan.planName} - ${price}đ</option>`;
        })
        .join("");
    }
    
    // Thêm event listener cho payment select
    const paymentSelect = document.getElementById("paymentSelect");
    if (paymentSelect) {
      paymentSelect.addEventListener("change", function() {
        const renewMsg = document.getElementById("renewMsg");
        const paymentMethod = this.value;
        const underDevelopmentMethods = ["Chuyển khoản ngân hàng", "Ví điện tử"];
        
        if (underDevelopmentMethods.includes(paymentMethod)) {
          const msg = window.i18n ? window.i18n.t('message.payment_under_development') : 'Chức năng đang được phát triển, vui lòng chọn phương thức khác';
          renewMsg.innerHTML = `<p style="color: orange; font-weight: bold; padding: 10px; background: #fff3cd; border-radius: 5px; border: 1px solid #ffc107; margin-top: 10px;">${msg}</p>`;
        } else {
          renewMsg.innerHTML = "";
        }
      });
    }
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.load_plans') : 'Lỗi tải danh sách gói dịch vụ';
    console.error(msg + ':', error);
  }
}

async function confirmRenew() {
  const planSelect = document.getElementById("planSelect");
  const paymentSelect = document.getElementById("paymentSelect");
  const renewMsg = document.getElementById("renewMsg");
  const btn = document.querySelector("#renew button");

  if (!planSelect || !paymentSelect) return;

  const planId = parseInt(planSelect.value);
  const paymentMethod = paymentSelect.value;

  if (!planId) {
    renewMsg.innerHTML =
      '<p style="color: red;">Vui lòng chọn gói dịch vụ!</p>';
    return;
  }

  // Kiểm tra các phương thức thanh toán đang phát triển
  const underDevelopmentMethods = ["Chuyển khoản ngân hàng", "Ví điện tử"];
  if (underDevelopmentMethods.includes(paymentMethod)) {
    const msg = window.i18n ? window.i18n.t('message.payment_under_development') : 'Chức năng đang được phát triển, vui lòng chọn phương thức khác';
    renewMsg.innerHTML = `<p style="color: orange; font-weight: bold; padding: 10px; background: #fff3cd; border-radius: 5px; border: 1px solid #ffc107;">${msg}</p>`;
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Đang xử lý...";
  }

  renewMsg.innerHTML = "<p>Đang gửi yêu cầu...</p>";

  try {
    if (paymentMethod === "Thanh toán qua VNPay") {
      const result = await api.createVnpayPayment(planId);
      if (result.success && result.data.paymentId && result.data.amount) {
        renewMsg.innerHTML = "<p style='color: blue;'>Đang tạo liên kết thanh toán...</p>";
        const paymentUrl = await generateVnpayUrl(
          result.data.paymentId,
          result.data.amount,
          result.data.planName
        );
        renewMsg.innerHTML = "<p style='color: blue;'>Đang chuyển đến trang thanh toán VNPay...</p>";
        setTimeout(() => {
          window.location.href = paymentUrl;
        }, 1000);
        return;
      } else {
        renewMsg.innerHTML = `<p style="color: red;">${
          result.error || "Tạo yêu cầu thanh toán thất bại!"
        }</p>`;
      }
    } else {
      const result = await api.submitRenewal(planId, paymentMethod);
      if (result.success) {
        const price = new Intl.NumberFormat("vi-VN").format(result.data.amount);
        renewMsg.innerHTML = `<p style="color: green;">${result.message || `Yêu cầu gia hạn ${result.data.planName} (${price}đ) bằng ${paymentMethod} đã được gửi thành công!`}</p>`;
      } else {
        renewMsg.innerHTML = `<p style="color: red;">${
          result.error || "Gửi yêu cầu thất bại!"
        }</p>`;
      }
    }
  } catch (error) {
    renewMsg.innerHTML = `<p style="color: red;">${
      error.message || "Lỗi kết nối. Vui lòng thử lại!"
    }</p>`;
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Xác nhận gia hạn";
    }
  }
}

async function logout() {
  await api.logout();
  window.location.href = "index.html";
}

let socket;
let currentUsername = null;
let receptionistUsername = null;
let selectedFile = null;
let historyCurrentPage = 1;
const HISTORY_LIMIT = 20;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

let forgotCardCountdownInterval = null;

async function initSocket() {
  try {
    const userKey = window.SMARTCLUB_USER_KEY || "smartclub_user";
    const user = JSON.parse(localStorage.getItem(userKey));
    if (!user || !user.username) {
      const msg = window.i18n ? window.i18n.t('error.no_username') : 'Không tìm thấy tên người dùng';
      console.error(msg);
      return;
    }

    currentUsername = user.username;
    // Socket.IO server - dùng cùng origin với frontend (Railway hoặc local)
    // Cho phép override bằng window.SOCKET_IO_URL nếu cần
    const SOCKET_IO_URL = window.SOCKET_IO_URL || window.location.origin;

    console.log('🔌 [Socket] Connecting to:', SOCKET_IO_URL);
    socket = io(SOCKET_IO_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000
    });

    socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", socket.id);
      console.log("   - Transport:", socket.io.engine.transport.name);
      socket.emit("identify", { username: currentUsername });
    });

    socket.on("connect_error", (error) => {
      console.error("❌ Socket.IO connection error:", error);
      console.error("   - Error type:", error.type);
      console.error("   - Error message:", error.message);
      showError("Không thể kết nối đến server. Vui lòng thử lại!");
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Socket.IO reconnected after", attemptNumber, "attempts");
      socket.emit("identify", { username: currentUsername });
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Socket.IO reconnection error:", error);
    });

    socket.on("reconnect_failed", () => {
      console.error("❌ Socket.IO reconnection failed after all attempts");
      showError("Không thể kết nối lại đến server. Vui lòng tải lại trang!");
    });

    socket.on("private_message", (data) => {
      if (!receptionistUsername && data.from !== currentUsername) {
        receptionistUsername = data.from;
      }
      const isFromMe = data.from === currentUsername;
      const senderName = isFromMe
        ? "Bạn"
        : data.from === receptionistUsername
        ? "Lễ tân"
        : data.from;
      const filePath = data.filePath
        ? data.filePath.startsWith("http")
          ? data.filePath
          : `http://localhost:8080/api/uploads/${data.filePath}`
        : null;
      addMessage(
        isFromMe ? "user" : "staff",
        data.message || "",
        senderName,
        data.timestamp,
        filePath,
        data.fileName,
        data.fileType,
        data.fileData
      );
    });

    socket.on("message_sent", () => {
      const msg = window.i18n ? window.i18n.t('success.message_sent') : 'Tin nhắn đã được gửi thành công';
      console.log(msg);
    });

    socket.on("message_error", (error) => {
      const msg = window.i18n ? window.i18n.t('error.message') : 'Lỗi tin nhắn';
      console.error(msg + ':', error);
      const errorMessage = error.error || error.message || "Không thể gửi tin nhắn. Vui lòng thử lại!";
      showError(errorMessage);
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
    });
  } catch (err) {
    const msg = window.i18n ? window.i18n.t('error.socket_connection') : 'Lỗi kết nối Socket.IO';
    console.error("❌ " + msg + ":", err);
  }
}

async function loadChatHistory() {
  const chatLoading = document.getElementById("chatLoading");
  const chatEmpty = document.getElementById("chatEmpty");
  const chatBox = document.getElementById("chatBox");

  if (!chatBox) return;

  chatLoading.style.display = "block";
  chatEmpty.style.display = "none";
  chatBox.innerHTML = "";

  try {
    const messages = await api.getChatHistory(50);

    if (messages.length === 0) {
      chatEmpty.style.display = "block";
      chatLoading.style.display = "none";
      return;
    }

    const userKey = window.SMARTCLUB_USER_KEY || "smartclub_user";
    const user = JSON.parse(localStorage.getItem(userKey));
    const username = user ? user.username : null;

    if (messages.length > 0 && !receptionistUsername) {
      const firstMsg = messages.find((m) => m.sender !== username);
      if (firstMsg) {
        receptionistUsername = firstMsg.sender;
      }
    }

    messages.forEach((msg) => {
      const isFromMe = msg.sender === username;
      const senderName = isFromMe
        ? "Bạn"
        : msg.sender === receptionistUsername
        ? "Lễ tân"
        : msg.sender;
      addMessage(
        isFromMe ? "user" : "staff",
        msg.message || "",
        senderName,
        msg.timestamp || msg.created_at,
        msg.file_path,
        msg.file_name,
        msg.file_type,
        msg.file_data
      );
    });

    chatEmpty.style.display = "none";
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.load_chat_history') : 'Lỗi tải lịch sử chat';
    console.error(msg + ':', error);
    showError("Không thể tải lịch sử chat");
  } finally {
    chatLoading.style.display = "none";
  }
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const btn = document.getElementById("btnSend");
  const text = input.value.trim();

  if ((!text && !selectedFile) || !currentUsername) return;

  if (!receptionistUsername) {
    await getReceptionistUsername();
  }

  btn.disabled = true;

  try {
    let fileData = null;
    let fileName = null;
    let fileType = null;

    if (selectedFile) {
      fileData = await readFileAsBase64(selectedFile);
      fileName = selectedFile.name;
      fileType = getFileType(selectedFile.name);
    }

    // Kiểm tra Socket.IO có kết nối được không
    const useSocketIO = socket && socket.connected;

    if (useSocketIO) {
      // Gửi qua Socket.IO (real-time)
      console.log('📤 [Send] Using Socket.IO for real-time delivery');
      const messageData = {
        from: currentUsername,
        to: receptionistUsername || "receptionist",
        message: text || "",
      };

      if (fileData) {
        messageData.fileData = fileData;
        messageData.fileName = fileName;
        messageData.fileType = fileType;
      }

      socket.emit("private_message", messageData);
    } else {
      // Fallback: Gửi qua REST API (luôn lưu vào DB)
      console.log('📤 [Send] Socket.IO not connected, using REST API fallback');
      try {
        await api.saveMessage(
          text || "",
          receptionistUsername || "receptionist",
          null, // filePath
          fileName,
          fileType,
          fileData // Thêm fileData vào API call
        );
        console.log('✅ [Send] Message saved via REST API');
      } catch (apiError) {
        console.error('❌ [Send] REST API error:', apiError);
        throw apiError;
      }
    }

    // Hiển thị message ngay lập tức (optimistic UI)
    if (text) {
      addMessage("user", text, "Bạn", new Date().toISOString());
    }
    if (selectedFile && fileData) {
      const mimeType = fileType || 'application/octet-stream';
      const fileDataUrl = `data:${mimeType};base64,${fileData}`;
      addMessage(
        "user",
        "",
        "Bạn",
        new Date().toISOString(),
        null,
        fileName,
        fileType,
        fileDataUrl
      );
    }

    input.value = "";
    selectedFile = null;
    document.getElementById("selectedFileName").style.display = "none";
    document.getElementById("fileInput").value = "";
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.send_message') : 'Lỗi gửi tin nhắn';
    console.error(msg + ':', error);
    showError("Không thể gửi tin nhắn: " + (error.message || "Lỗi không xác định"));
  } finally {
    btn.disabled = false;
  }
}

function handleEnter(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
}

function setupFileInput() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput) return;

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      showError("File quá lớn! Kích thước tối đa là 10MB.");
      e.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-rar-compressed",
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.match(
        /\.(jpg|jpeg|png|gif|bmp|pdf|doc|docx|xls|xlsx|txt|zip|rar)$/i
      )
    ) {
      showError("Loại file không được hỗ trợ!");
      e.target.value = "";
      return;
    }

    selectedFile = file;
    const fileNameEl = document.getElementById("selectedFileName");
    fileNameEl.textContent = `📎 ${file.name} (${(file.size / 1024).toFixed(
      1
    )} KB)`;
    fileNameEl.style.display = "block";
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getFileType(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    txt: "text/plain",
    zip: "application/zip",
    rar: "application/x-rar-compressed",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

async function getReceptionistUsername() {
  try {
    receptionistUsername = await api.getReceptionistUsername();
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.get_receptionist') : 'Lỗi lấy thông tin lễ tân';
    console.error(msg + ':', error);
    receptionistUsername = "receptionist";
  }
}

function displayHistory(data, total, append = false) {
  const historyTable = document.getElementById("historyTable");
  const historyTableContainer = document.getElementById(
    "historyTableContainer"
  );
  const historyEmpty = document.getElementById("historyEmpty");
  const historyLoading = document.getElementById("historyLoading");
  const loadMoreBtn = document.getElementById("loadMoreHistoryBtn");

  if (historyLoading) historyLoading.style.display = "none";

  if (data.length === 0 && historyCurrentPage === 1) {
    if (historyEmpty) historyEmpty.style.display = "block";
    if (historyTableContainer) historyTableContainer.classList.remove("show");
    if (loadMoreBtn) loadMoreBtn.style.display = "none";
    return;
  }

  if (historyEmpty) historyEmpty.style.display = "none";
  if (historyTableContainer) historyTableContainer.classList.add("show");

  if (!append || historyCurrentPage === 1) {
    if (historyTable) historyTable.innerHTML = "";
  }

  if (data && data.length > 0 && historyTable) {
    data.forEach((h) => {
      const direction =
        h.direction === "IN"
          ? "Vào"
          : h.direction === "OUT"
          ? "Ra"
          : h.direction;
      const time = formatDateTime(h.timestamp);
      const gate = h.gate_name || h.gate_id || "N/A";
      const row = document.createElement("tr");
      row.innerHTML = `<td>${time}</td><td>${direction}</td><td>${gate}</td>`;
      historyTable.appendChild(row);
    });
  }

  if (loadMoreBtn) {
    const totalPages = Math.ceil(total / HISTORY_LIMIT);
    if (historyCurrentPage < totalPages) {
      loadMoreBtn.style.display = "block";
    } else {
      loadMoreBtn.style.display = "none";
    }
  }
}

function showHistoryError() {
  const historyTable = document.getElementById("historyTable");
  const historyTableContainer = document.getElementById(
    "historyTableContainer"
  );
  const historyEmpty = document.getElementById("historyEmpty");
  const historyLoading = document.getElementById("historyLoading");

  historyLoading.style.display = "none";
  historyEmpty.style.display = "block";
  historyEmpty.textContent = "Không thể tải lịch sử";
  historyTableContainer.classList.remove("show");
}

async function loadMoreHistory() {
  historyCurrentPage++;
  const historyLoading = document.getElementById("historyLoading");
  const loadMoreBtn = document.getElementById("loadMoreHistoryBtn");

  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = "Đang tải...";
  if (historyLoading) historyLoading.style.display = "block";

  try {
    const result = await api.getAccessHistory(
      historyCurrentPage,
      HISTORY_LIMIT
    );
    if (result && result.success && result.data) {
      const total = result.pagination
        ? result.pagination.total
        : result.data.length;
      displayHistory(result.data, total, true);
    } else {
      showHistoryError();
    }
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.load_more_history') : 'Lỗi tải thêm lịch sử';
    console.error(msg + ':', error);
    showHistoryError();
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Tải thêm";
    if (historyLoading) historyLoading.style.display = "none";
  }
}

function addMessage(
  type,
  text,
  senderName = null,
  timestamp = null,
  filePath = null,
  fileName = null,
  fileType = null,
  fileData = null
) {
  const box = document.getElementById("chatBox");
  if (!box) return;

  const el = document.createElement("div");
  el.className = "chat-msg " + type;

  if (senderName && senderName !== "Bạn") {
    const senderEl = document.createElement("div");
    senderEl.style.fontSize = "11px";
    senderEl.style.opacity = "0.7";
    senderEl.style.marginBottom = "2px";
    senderEl.textContent = senderName;
    el.appendChild(senderEl);
  }

  if (text) {
    const textEl = document.createElement("div");
    textEl.textContent = text;
    el.appendChild(textEl);
  }

  if (fileData || filePath || fileName) {
    const fileEl = document.createElement("div");
    fileEl.className = "file-attachment";

    const imageSource = fileData || (filePath && filePath.startsWith("http") ? filePath : filePath ? `http://localhost:8080/api/uploads/${filePath}` : null);

    if (imageSource && fileType && fileType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = imageSource;
      img.alt = fileName || "Image";
      img.onerror = function () {
        this.style.display = "none";
      };
      fileEl.appendChild(img);
    }

    if (fileName) {
      const link = document.createElement("a");
      link.href = imageSource || "#";
      link.target = "_blank";
      link.innerHTML = `<i class="fa-solid fa-file"></i> ${fileName}`;
      fileEl.appendChild(link);
    }

    el.appendChild(fileEl);
  }

  if (timestamp) {
    const timeEl = document.createElement("span");
    timeEl.className = "timestamp";
    timeEl.textContent = formatDateTime(timestamp);
    el.appendChild(timeEl);
  }

  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
}

async function loadForgotCardTab() {
  const loading = document.getElementById("forgotCardLoading");
  const passcodeDisplay = document.getElementById("forgotCardPasscodeDisplay");
  const requestForm = document.getElementById("forgotCardRequestForm");
  const empty = document.getElementById("forgotCardEmpty");
  const error = document.getElementById("forgotCardError");

  if (loading) loading.style.display = "block";
  if (passcodeDisplay) passcodeDisplay.style.display = "none";
  if (requestForm) requestForm.style.display = "none";
  if (empty) empty.style.display = "none";
  if (error) {
    error.style.display = "none";
    error.textContent = "";
  }

  try {
    const passcode = await api.getForgotCardPasscode();

    if (passcode && passcode.passcode && !passcode.used) {
      displayForgotCardPasscode(passcode.passcode, passcode.expiresAt);
      if (passcodeDisplay) passcodeDisplay.style.display = "block";
    } else {
      if (empty) empty.style.display = "block";
    }
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.load_forgot_card') : 'Lỗi tải passcode quên thẻ';
    console.error(msg + ':', error);
    if (empty) empty.style.display = "block";
  } finally {
    if (loading) loading.style.display = "none";
  }
}

function displayForgotCardPasscode(passcode, expiresAt) {
  const passcodeText = document.getElementById("forgotCardPasscodeText");
  if (passcodeText) {
    passcodeText.textContent = passcode;
  }

  generateQRCode(passcode);

  const expiryDate = new Date(expiresAt);
  startForgotCardCountdown(expiryDate);
}

function generateQRCode(passcode) {
  const qrContainer = document.getElementById("qrCodeContainer");
  if (!qrContainer || !passcode || passcode === "- - - - - - - -") {
    return;
  }

  if (typeof QRCode === "undefined") {
    const msg = window.i18n ? window.i18n.t('error.qrcode_not_loaded') : 'Thư viện QRCode chưa được tải, đang thử tải...';
    console.warn(msg);
    loadQRCodeLibrary()
      .then(() => {
        generateQRCode(passcode);
      })
      .catch(() => {
        qrContainer.innerHTML =
          '<p style="color: #999; font-size: 12px; margin: 10px 0;">QR code không khả dụng</p>';
      });
    return;
  }

  qrContainer.innerHTML = "";

  try {
    new QRCode(qrContainer, {
      text: passcode,
      width: 250,
      height: 250,
      colorDark: "#000000",
      colorLight: "#FFFFFF",
      correctLevel: 1,
    });
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.qrcode_generation') : 'Lỗi tạo QR code';
    console.error(msg + ':', error);
    qrContainer.innerHTML =
      '<p style="color: red; font-size: 12px;">Lỗi tạo QR code</p>';
  }
}

function loadQRCodeLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof QRCode !== "undefined") {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    script.onload = () => {
      if (typeof QRCode !== "undefined") {
        resolve();
      } else {
        reject(new Error("QRCode library loaded but not available"));
      }
    };
    script.onerror = () => {
      reject(new Error("Failed to load QRCode library"));
    };
    document.head.appendChild(script);
  });
}

function startForgotCardCountdown(expiryDate) {
  if (forgotCardCountdownInterval) {
    clearInterval(forgotCardCountdownInterval);
  }

  function updateCountdown() {
    const now = new Date();
    const diff = expiryDate - now;
    const timeRemaining = document.getElementById("forgotCardTimeRemaining");

    if (diff <= 0) {
      if (timeRemaining) timeRemaining.textContent = "00:00:00";
      clearInterval(forgotCardCountdownInterval);
      loadForgotCardTab();
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const timeStr = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    if (timeRemaining) timeRemaining.textContent = timeStr;
  }

  updateCountdown();
  forgotCardCountdownInterval = setInterval(updateCountdown, 1000);
}

async function initForgotCardRequest() {
  const loading = document.getElementById("forgotCardLoading");
  const passcodeDisplay = document.getElementById("forgotCardPasscodeDisplay");
  const requestForm = document.getElementById("forgotCardRequestForm");
  const empty = document.getElementById("forgotCardEmpty");
  const error = document.getElementById("forgotCardError");

  if (loading) loading.style.display = "block";
  if (passcodeDisplay) passcodeDisplay.style.display = "none";
  if (requestForm) requestForm.style.display = "none";
  if (empty) empty.style.display = "none";
  if (error) {
    error.style.display = "none";
    error.textContent = "";
  }

  try {
    const result = await api.requestForgotCard();

    if (result.success && result.data) {
      displayForgotCardPasscode(result.data.passcode, result.data.expiresAt);
      if (passcodeDisplay) passcodeDisplay.style.display = "block";
    } else {
      if (error) {
        error.textContent = result.error || "Tạo passcode thất bại!";
        error.style.display = "block";
      }
      if (empty) empty.style.display = "block";
    }
  } catch (err) {
    if (error) {
      error.textContent = err.message || "Lỗi kết nối. Vui lòng thử lại!";
      error.style.display = "block";
    }
    if (empty) empty.style.display = "block";
  } finally {
    if (loading) loading.style.display = "none";
  }
}

async function verifyForgotCardCode() {
  const code = document.getElementById("forgotCardVerificationCode");
  const btn = document.getElementById("btnVerifyForgotCard");
  const error = document.getElementById("forgotCardError");

  if (!code || !code.value || code.value.length !== 6) {
    if (error) {
      error.textContent = "Vui lòng nhập đúng mã 6 số!";
      error.style.display = "block";
    }
    return;
  }

  if (!forgotCardRequestUserId) {
    if (error) {
      error.textContent = "Lỗi: Không tìm thấy thông tin người dùng!";
      error.style.display = "block";
    }
    return;
  }

  if (error) {
    error.textContent = "";
    error.style.display = "none";
  }
  if (btn) btn.disabled = true;
  if (btn) btn.textContent = "Đang xác nhận...";

  try {
    const result = await api.verifyForgotCardCode(
      forgotCardRequestUserId,
      code.value
    );

    if (result.success) {
      displayForgotCardPasscode(result.data.passcode, result.data.expiresAt);
      const passcodeDisplay = document.getElementById(
        "forgotCardPasscodeDisplay"
      );
      const requestForm = document.getElementById("forgotCardRequestForm");
      if (passcodeDisplay) passcodeDisplay.style.display = "block";
      if (requestForm) requestForm.style.display = "none";
      forgotCardRequestUserId = null;
    } else {
      if (error) {
        error.textContent = result.error || "Mã xác nhận không hợp lệ!";
        error.style.display = "block";
      }
    }
  } catch (err) {
    if (error) {
      error.textContent =
        err.message || "Mã xác nhận không hợp lệ hoặc đã hết hạn!";
      error.style.display = "block";
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Xác nhận";
    }
  }
}

function cancelForgotCardRequest() {
  const requestForm = document.getElementById("forgotCardRequestForm");
  const empty = document.getElementById("forgotCardEmpty");
  const codeInput = document.getElementById("forgotCardVerificationCode");
  const error = document.getElementById("forgotCardError");

  forgotCardRequestUserId = null;
  if (codeInput) codeInput.value = "";
  if (error) {
    error.textContent = "";
    error.style.display = "none";
  }
  if (requestForm) requestForm.style.display = "none";
  if (empty) empty.style.display = "block";
}

function requestNewForgotCardPasscode() {
  const passcodeDisplay = document.getElementById("forgotCardPasscodeDisplay");
  if (passcodeDisplay) passcodeDisplay.style.display = "none";
  initForgotCardRequest();
}

async function copyForgotCardPasscode() {
  const passcodeText = document.getElementById("forgotCardPasscodeText");
  if (!passcodeText) return;

  const passcode = passcodeText.textContent.trim();
  if (passcode === "- - - - - - - -" || !passcode) {
    return;
  }

  try {
    await navigator.clipboard.writeText(passcode);
    const btn = document.getElementById("btnCopyForgotCard");
    if (btn) {
      const originalHTML = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i>';
      btn.style.background = "#4caf50";

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = "";
      }, 2000);
    }
  } catch (err) {
    const msg = window.i18n ? window.i18n.t('error.copy_failed') : 'Sao chép thất bại';
    console.error(msg + ':', err);
    const alertMsg = window.i18n ? window.i18n.t('message.cannot_copy', { text: passcode }) : "Không thể sao chép. Vui lòng sao chép thủ công: " + passcode;
    alert(alertMsg);
  }
}

async function loadMemberPoints() {
  try {
    const points = await api.getMemberPoints();
    const pointsElement = document.getElementById("points");
    if (pointsElement) {
      pointsElement.textContent = points || 0;
    }
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.load_points') : 'Lỗi tải điểm tích lũy';
    console.error(msg + ':', error);
  }
}

async function loadRewards() {
  try {
    const currentPoints = await api.getMemberPoints();
    const rewardsCurrentPoints = document.getElementById(
      "rewardsCurrentPoints"
    );
    if (rewardsCurrentPoints) {
      rewardsCurrentPoints.textContent = currentPoints || 0;
    }

    const rewards = await api.getAllRewards();
    const rewardsContainer = document.getElementById("rewardsContainer");
    if (!rewardsContainer) return;

    if (rewards.length === 0) {
      rewardsContainer.innerHTML =
        '<p style="text-align: center; color: #999; padding: 20px;">Chưa có quà nào</p>';
      return;
    }

    let html = '<div class="rewards-grid">';
    rewards.forEach((reward) => {
      const canRedeem = currentPoints >= reward.points_required;
      const isOutOfStock = reward.quantity !== null && reward.quantity <= 0;
      const disabled = !canRedeem || isOutOfStock;

      const quantityText =
        reward.quantity === null
          ? "Không giới hạn"
          : `Còn ${reward.quantity} sản phẩm`;

      html += `
        <div class="reward-card ${disabled ? "disabled" : ""}">
          <h4>${reward.name}</h4>
          <p class="reward-description">${reward.description || ""}</p>
          <div class="reward-info">
            <span class="reward-points">${reward.points_required} điểm</span>
            <span class="reward-quantity">${quantityText}</span>
          </div>
          <button 
            class="btn-redeem" 
            onclick="redeemReward(${reward.reward_id})"
            ${disabled ? "disabled" : ""}
          >
            ${
              disabled
                ? isOutOfStock
                  ? "Hết hàng"
                  : "Không đủ điểm"
                : "Đổi quà"
            }
          </button>
        </div>
      `;
    });
    html += "</div>";
    rewardsContainer.innerHTML = html;
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.load_rewards') : 'Lỗi tải danh sách quà';
    console.error(msg + ':', error);
    const rewardsContainer = document.getElementById("rewardsContainer");
    if (rewardsContainer) {
      rewardsContainer.innerHTML =
        '<p style="text-align: center; color: red; padding: 20px;">Lỗi tải danh sách quà</p>';
    }
  }
}

async function redeemReward(rewardId) {
  if (!confirm("Bạn có chắc chắn muốn đổi quà này?")) {
    return;
  }

  const btn = event.target;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Đang xử lý...";

  try {
    const result = await api.redeemReward(rewardId);

    if (result.success) {
      const successMsg = window.i18n ? window.i18n.t('success.redeem_success') : "Đổi quà thành công!";
      alert(result.message || successMsg);
      await loadMemberPoints();
      await loadRewards();
    } else {
      const failMsg = window.i18n ? window.i18n.t('message.redeem_failed') : "Đổi quà thất bại";
      alert(result.error || failMsg);
      btn.disabled = false;
      btn.textContent = originalText;
    }
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.redeem_reward') : 'Lỗi đổi quà';
    console.error(msg + ':', error);
    const alertMsg = window.i18n ? window.i18n.t('message.redeem_error') : "Lỗi khi đổi quà. Vui lòng thử lại!";
    alert(error.message || alertMsg);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function formatFullDate(date) {
  const year = date.getFullYear();
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const day = ("0" + date.getDate()).slice(-2);
  const hours = ("0" + date.getHours()).slice(-2);
  const minutes = ("0" + date.getMinutes()).slice(-2);
  const seconds = ("0" + date.getSeconds()).slice(-2);
  return year + month + day + hours + minutes + seconds;
}

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
    const originalKey = decodeURIComponent(str[key]);
    sorted[str[key]] = encodeURIComponent(obj[originalKey]).replace(/%20/g, '+');
  }
  return sorted;
}

async function generateVnpayUrl(paymentId, amount, planName) {
  let vnp_TmnCode = "SO3GSJQG";
  let vnp_ReturnUrl = window.location.origin + "/payment-success.html";
  
  try {
    const config = await api.getVnpayConfig();
    if (config.success && config.data) {
      vnp_TmnCode = config.data.tmnCode || vnp_TmnCode;
      if (config.data.returnUrl) {
        vnp_ReturnUrl = config.data.returnUrl;
      }
    }
  } catch (error) {
    const msg = window.i18n ? window.i18n.t('error.vnpay_config') : 'Không thể lấy cấu hình VNPay, sử dụng mặc định';
    console.warn(msg + ':', error);
  }

  const vnp_HashSecret = "ZKUNPZCP7S0FPKZRLF30ZA7WA4CZ15UP";
  const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

  const date = new Date();
  const createDate = formatFullDate(date);

  const params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: vnp_TmnCode,
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: 'VND',
    vnp_TxnRef: paymentId.toString(),
    vnp_OrderInfo: `Thanh toan goi ${planName}`,
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: vnp_ReturnUrl,
    vnp_IpAddr: '127.0.0.1',
    vnp_CreateDate: createDate
  };

  const sortedParams = sortObject(params);
  let signData = '';
  for (const key in sortedParams) {
    if (signData) signData += '&';
    signData += key + '=' + sortedParams[key];
  }
  const hmac = CryptoJS.HmacSHA512(signData, vnp_HashSecret);
  const vnpSecureHash = hmac.toString(CryptoJS.enc.Hex);
  const finalUrl = vnp_Url + "?" + signData + "&vnp_SecureHash=" + vnpSecureHash;

  return finalUrl;
}

window.initForgotCardRequest = initForgotCardRequest;
window.verifyForgotCardCode = verifyForgotCardCode;
window.cancelForgotCardRequest = cancelForgotCardRequest;
window.requestNewForgotCardPasscode = requestNewForgotCardPasscode;
window.copyForgotCardPasscode = copyForgotCardPasscode;
window.redeemReward = redeemReward;
