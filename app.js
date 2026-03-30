// ================= INITIALIZE =================
document.addEventListener('DOMContentLoaded', () => {
  loadConfig(); 
  setupEventListeners(); 
  setupAudioElements(); 
  renderCallHistory();
  applyLogsVisibility(); // Áp dụng trạng thái ẩn/hiện log khi khởi động
  loadSMSContent(); // Tải SMS lần đầu
  
  if (appConfig.saveConfig && appConfig.user && appConfig.pass && appConfig.ws) {
    setTimeout(() => { log('Tự động đăng nhập...', 'info'); handleLogin(); }, 500);
  }
});
// ================= EVENT LISTENERS =================
function setupEventListeners() {
  DOM.formLogin.addEventListener('submit', handleLogin);
  document.getElementById('btn_logout').addEventListener('click', handleLogout);
  document.querySelectorAll('.dial-btn').forEach(btn => btn.addEventListener('click', () => handleDTMF(btn.getAttribute('data-num'))));
  document.getElementById('btn_delete').addEventListener('click', () => { DOM.inputCallTo.value = DOM.inputCallTo.value.slice(0, -1); DOM.inputCallTo.focus(); });
  DOM.inputCallTo.addEventListener('keydown', handleKeyboardDTMF);
  DOM.btnCall.addEventListener('click', makeCall);
  DOM.btnHangup.addEventListener('click', hangupCall);
  DOM.btnAnswer.addEventListener('click', answerCall);
  DOM.btnReject.addEventListener('click', hangupCall);
  DOM.btnMute.addEventListener('click', () => toggleMute(true));
  DOM.btnUnmute.addEventListener('click', () => toggleMute(false));
  DOM.btnHold.addEventListener('click', () => toggleHold(true));
  DOM.btnUnhold.addEventListener('click', () => toggleHold(false));
  DOM.btnTransfer.addEventListener('click', transferCall);
  
  DOM.callHistoryList.addEventListener('click', (e) => {
    // Kiểm tra nếu nhấn vào nút xoá
    const deleteBtn = e.target.closest('.btn-delete-history-item');
    if (deleteBtn) {
      e.stopPropagation(); // Ngăn chặn sự kiện click lan ra ngoài (không gọi điện)
      const timestamp = deleteBtn.getAttribute('data-timestamp');
      deleteCallFromHistory(timestamp);
      return;
    }

    const item = e.target.closest('.history-item');
    if (item) {
      const number = item.getAttribute('data-number');
      DOM.inputCallTo.value = number;
      makeCall();
    }
  });

  document.getElementById('btn_clear_log').addEventListener('click', () => DOM.logDiv.innerHTML = '');
  DOM.btnClearHistory.addEventListener('click', () => {
    if(confirm('Bạn có chắc chắn muốn xoá toàn bộ lịch sử?')) {
      localStorage.removeItem('webphone_history');
      renderCallHistory();
    }
  });
  document.getElementById('btn_open_webhook').addEventListener('click', toggleWebhookModal);
  document.getElementById('btn_close_webhook').addEventListener('click', toggleWebhookModal);
  document.getElementById('btn_close_webhook_top').addEventListener('click', toggleWebhookModal);
  document.getElementById('btn_save_webhook').addEventListener('click', () => {
    appConfig.webhook.enabled = document.getElementById('webhook_enable').checked;
    appConfig.webhook.url = document.getElementById('webhook_url').value;
    appConfig.ws = document.getElementById('settings_sip_ws').value;
    appConfig.audioInputId = document.getElementById('audio_input_device').value;
    appConfig.audioOutputId = document.getElementById('audio_output_device').value;
    appConfig.showLogs = document.getElementById('show_system_logs').checked;
    appConfig.autoClearLogs = document.getElementById('auto_clear_logs').checked;
    const events = ['registered', 'incoming', 'accepted', 'ended', 'failed', 'logout'];
    events.forEach(evt => { const el = document.getElementById(`event_${evt}`); if(el) appConfig.webhook.events[evt] = el.checked; });
    saveConfigToStorage();
    log('Đã lưu cấu hình', 'success');
    applyOutputDevice();
    toggleWebhookModal();
    applyLogsVisibility(); // Cập nhật giao diện ngay lập tức sau khi lưu
  });
  window.addEventListener('mousedown', () => DOM.remoteAudio.play().catch(() => {}), { once: true });
  window.addEventListener('beforeunload', (e) => { if (currentSession && currentSession.isEstablished()) { e.preventDefault(); e.returnValue = ''; } });

  // Event cho nút Cập nhật SMS và Form lọc
  document.getElementById('btn_refresh_sms_manual').addEventListener('click', triggerSMSUpdate);
  
  // Ngăn reload trang khi nhấn vào các link phân trang trong SMS
  document.getElementById('sms-app-container').addEventListener('click', (e) => {
    const pageLink = e.target.closest('.pagination a');
    if (pageLink) {
      e.preventDefault();
      const url = new URL(pageLink.href, window.location.origin);
      loadSMSContent(url.search);
    }
  });

  DOM.smsContainer = document.getElementById('sms-app-container');
  DOM.smsContainer.addEventListener('submit', (e) => {
    if (e.target.tagName === 'FORM') {
      e.preventDefault();
      const formData = new FormData(e.target);
      const params = new URLSearchParams(formData).toString();
      loadSMSContent('?' + params);
    }
  });
}

function loadSMSContent(queryString = '') {
  const container = document.getElementById('sms-app-container');
  // Chúng ta fetch sms.php. Bạn nên chỉnh sms.php để trả về partial HTML 
  // hoặc đơn giản là fetch và lấy phần body.
  fetch('sms.php' + queryString)
    .then(res => res.text())
    .then(html => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const content = doc.querySelector('.sms-container') || doc.body;
      container.innerHTML = content.innerHTML;
    })
    .catch(err => {
      container.innerHTML = `<div class="p-4 text-red-500 text-center">Lỗi tải tin nhắn: ${err.message}</div>`;
    });
}

function applyLogsVisibility() {
  const container = document.getElementById('system-logs-container');
  if (container) {
    if (appConfig.showLogs === false) {
      container.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
      container.classList.remove('max-h-[500px]', 'opacity-100');
      // Triệt tiêu khoảng cách gap-6 (1.5rem) của flex container khi ẩn
      container.style.marginTop = "-1.5rem";
    } else {
      container.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
      container.classList.add('max-h-[500px]', 'opacity-100');
      container.style.marginTop = "0px";
    }
  }
}

function triggerSMSUpdate() {
  const btn = document.getElementById('btn_refresh_sms_manual');
  btn.disabled = true;
  btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i>...`;
  
  const formData = new FormData();
  formData.append('ajax', '1'); // Đánh dấu là request AJAX

  fetch('updatesms.php', { method: 'POST', body: formData })
    .then(() => {
      loadSMSContent();
      btn.disabled = false;
      btn.innerHTML = `<i class='bx bx-refresh'></i> Cập nhật`;
      log('Đã cập nhật dữ liệu SMS mới', 'success');
    })
    .catch(err => log('Lỗi cập nhật SMS: ' + err.message, 'error'));
}
function handleKeyboardDTMF(e) {
  const key = e.key;
  if (key === 'Enter') { e.preventDefault(); DOM.btnCall.click(); return; }
  const validKeys = ['0','1','2','3','4','5','6','7','8','9','*','#'];
  const isControlKey = key === 'Backspace' || key === 'Delete' || key.startsWith('Arrow') || e.ctrlKey || e.metaKey;
  if (currentSession && currentSession.isEstablished()) { 
    if (validKeys.includes(key)) { e.preventDefault(); handleDTMF(key); } else if (!isControlKey) e.preventDefault(); 
  } else if (!validKeys.includes(key) && !isControlKey) e.preventDefault(); 
}