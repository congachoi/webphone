// ================= INITIALIZE =================
document.addEventListener('DOMContentLoaded', () => {
  loadConfig(); 
  setupEventListeners(); 
  setupAudioElements(); 
  renderCallHistory();
  
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
    const events = ['registered', 'incoming', 'accepted', 'ended', 'failed', 'logout'];
    events.forEach(evt => { const el = document.getElementById(`event_${evt}`); if(el) appConfig.webhook.events[evt] = el.checked; });
    saveConfigToStorage();
    log('Đã lưu cấu hình', 'success');
    applyOutputDevice();
    toggleWebhookModal();
  });
  window.addEventListener('mousedown', () => DOM.remoteAudio.play().catch(() => {}), { once: true });
  window.addEventListener('beforeunload', (e) => { if (currentSession && currentSession.isEstablished()) { e.preventDefault(); e.returnValue = ''; } });
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