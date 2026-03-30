function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString('vi-VN', {hour12: false});
  
  // Bổ sung ghi log ra Console trình duyệt để debug
  console.log(`[${time}] [${type.toUpperCase()}] ${msg}`);

  const div = document.createElement('div'); 
  div.className = 'mb-1';
  let color = 'text-blue-400', icon = 'ℹ️';
  
  if (type === 'success') { color = 'text-green-400'; icon = '✅'; } 
  else if (type === 'error') { color = 'text-red-400'; icon = '❌'; } 
  else if (type === 'warning') { color = 'text-yellow-400'; icon = '⚠️'; }
  
  div.innerHTML = `<span class="text-gray-500">[${time}]</span> <span class="${color}">${icon} ${msg}</span>`;
  const logDiv = document.getElementById('log');
  if (logDiv) {
    logDiv.appendChild(div); 
    logDiv.scrollTop = logDiv.scrollHeight;
  }
}

function sendWebhook(eventName, sessionData = {}) {
  const wh = appConfig.webhook;
  if (!wh.enabled || !wh.events[eventName] || !wh.url) return;

  const payload = {
    event: eventName,
    direction: sessionData.direction || 'unknown',
    from: sessionData.from || '',
    to: sessionData.to || '',
    timestamp: new Date().toISOString()
  };

  fetch(wh.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).then(r => {
    if(r.ok) log(`📤 Gửi Webhook [${eventName}] thành công`, 'success');
  }).catch((e) => log(`❌ Lỗi gửi Webhook: ${e.message}`, 'error'));
}

function addCallToHistory(callData) {
  try {
    const history = JSON.parse(localStorage.getItem('webphone_history') || '[]');
    history.unshift({
      ...callData,
      timestamp: new Date().toISOString()
    });
    // Giới hạn 50 bản ghi gần nhất
    if (history.length > 50) history.pop();
    localStorage.setItem('webphone_history', JSON.stringify(history));
    renderCallHistory();
  } catch (e) { console.error("Lỗi lưu lịch sử", e); }
}

function deleteCallFromHistory(timestamp) {
  try {
    let history = JSON.parse(localStorage.getItem('webphone_history') || '[]');
    history = history.filter(item => item.timestamp !== timestamp);
    localStorage.setItem('webphone_history', JSON.stringify(history));
    renderCallHistory();
    log('Đã xoá một mục trong lịch sử', 'info');
  } catch (e) { console.error("Lỗi xóa mục lịch sử", e); }
}

function renderCallHistory() {
  if (!DOM.callHistoryList) return;
  const history = JSON.parse(localStorage.getItem('webphone_history') || '[]');
  
  if (history.length === 0) {
    DOM.callHistoryList.innerHTML = '<div class="p-8 text-center text-gray-400 text-sm">Chưa có lịch sử cuộc gọi</div>';
    return;
  }

  DOM.callHistoryList.innerHTML = history.map(item => {
    const isIncoming = item.direction === 'incoming';
    const icon = isIncoming ? 'bx-phone-incoming' : 'bx-phone-outgoing';
    const iconCol = isIncoming ? 'text-blue-500 bg-blue-50' : 'text-green-500 bg-green-50';
    const timeStr = new Date(item.timestamp).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    
    return `
      <div class="history-item group flex items-center justify-between p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" data-number="${item.number}">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center ${iconCol}">
            <i class='bx ${icon}'></i>
          </div>
          <div>
            <div class="font-semibold text-sm text-gray-700">${item.number}</div>
            <div class="text-[10px] text-gray-400">${timeStr}</div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <div class="text-xs font-medium text-gray-600">${item.duration !== '00:00' ? item.duration : '0s'}</div>
            <div class="text-[10px] text-gray-400 uppercase">${item.status}</div>
          </div>
          <button class="btn-delete-history-item p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100" data-timestamp="${item.timestamp}" title="Xoá">
            <i class='bx bx-trash text-sm'></i>
          </button>
        </div>
      </div>`;
  }).join('');
}

const extractDomain = (wssUrl) => { 
  try { return new URL(wssUrl).hostname; } 
  catch(e) { return wssUrl.replace(/^wss?:\/\//, '').split(/[:\/]/)[0]; } 
};

const formatURI = (user, domain) => { 
  if (!user) return null; 
  if (user.startsWith('sip:')) return user; 
  if (user.includes('@')) return `sip:${user}`; 
  return `sip:${user}@${domain}`; 
};