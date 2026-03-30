let statsInterval = null;

function playTone(type) {
  stopTones();
  try {
    if (type === 'ringtone' && DOM.ringtone) {
      DOM.ringtone.currentTime = 0;
      DOM.ringtone.play().catch(e => log(`Trình duyệt chặn phát nhạc chuông: ${e.message}`, 'warning'));
    } else if (type === 'ringback' && DOM.ringback) {
      DOM.ringback.currentTime = 0;
      DOM.ringback.play().catch(e => log(`Trình duyệt chặn phát nhạc chờ: ${e.message}`, 'warning'));
    }
  } catch (err) { console.error("Lỗi phát âm thanh", err); }
}

function stopTones() {
  try {
    if (DOM.ringtone) { DOM.ringtone.pause(); DOM.ringtone.currentTime = 0; }
    if (DOM.ringback) { DOM.ringback.pause(); DOM.ringback.currentTime = 0; }
  } catch (err) {}
}

async function updateDeviceList() {
  const inputSelect = document.getElementById('audio_input_device');
  const outputSelect = document.getElementById('audio_output_device');
  if (!inputSelect || !outputSelect) return;

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
    const devices = await navigator.mediaDevices.enumerateDevices();    
    inputSelect.innerHTML = '';
    outputSelect.innerHTML = '';
    
    devices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `${device.kind} - ${device.deviceId.slice(0, 5)}`;
      if (device.kind === 'audioinput') inputSelect.appendChild(option);
      else if (device.kind === 'audiooutput') outputSelect.appendChild(option);
    });

    if (appConfig.audioInputId) inputSelect.value = appConfig.audioInputId;
    if (appConfig.audioOutputId) outputSelect.value = appConfig.audioOutputId;
  } catch (err) { log(`Lỗi tải danh sách thiết bị: ${err.message}`, 'error'); }
}

async function applyOutputDevice() {
  if (DOM.remoteAudio.setSinkId && appConfig.audioOutputId) {
    try {
      await DOM.remoteAudio.setSinkId(appConfig.audioOutputId);
      log('Đã áp dụng thiết bị đầu ra âm thanh đã chọn', 'info');
    } catch (err) { console.error('Lỗi thiết lập thiết bị đầu ra:', err); }
  }
}

function setupAudioElements() {
  DOM.remoteAudio.onplay = () => {
    log('Đã có luồng Audio (Bắt đầu nghe tiếng)', 'success');
    DOM.audioDot.classList.replace('bg-white', 'bg-green-400');
    DOM.audioDot.classList.add('animate-ping');
    DOM.audioText.textContent = "Audio: Đang đàm thoại";
  };
  DOM.remoteAudio.onpause = () => {
    DOM.audioDot.classList.replace('bg-green-400', 'bg-white');
    DOM.audioDot.classList.remove('animate-ping');
    DOM.audioText.textContent = "Audio: Tạm dừng";
  };
}

function startStatsMonitoring(pc) {
  stopStatsMonitoring();
  log('Bắt đầu giám sát lưu lượng gói tin...', 'info');
  statsInterval = setInterval(async () => {
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          const bytes = report.bytesReceived;
          const packets = report.packetsReceived;
          const jitter = report.jitter ? report.jitter.toFixed(3) : 0;
          if (bytes === 0) log(`DEBUG: Đang nhận 0 bytes. Kiểm tra lại Firewall/NAT!`, 'error');
          else console.log(`Stats: Received ${bytes} bytes, Packets: ${packets}, Jitter: ${jitter}`);
        }
      });
    } catch (e) { console.error('Error getting stats:', e); }
  }, 3000);
}

function stopStatsMonitoring() {
  if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
}

function handleDTMF(num) {
  if (currentSession && currentSession.isEstablished()) { 
    try { 
      currentSession.sendDTMF(num); 
      log(`Gửi DTMF: ${num}`, 'info'); 
    } catch(e) { log(`Lỗi gửi DTMF: ${e.message}`, 'error'); } 
  } else {
    const start = DOM.inputCallTo.selectionStart; 
    const end = DOM.inputCallTo.selectionEnd;
    const text = DOM.inputCallTo.value; 
    DOM.inputCallTo.value = text.slice(0, start) + num + text.slice(end);
    DOM.inputCallTo.selectionStart = DOM.inputCallTo.selectionEnd = start + 1; 
    DOM.inputCallTo.focus();
  }
}

function toggleWebhookModal() {
  const isHidden = DOM.modal.classList.contains('hidden');
  if (isHidden) { updateDeviceList(); DOM.modal.classList.remove('hidden'); setTimeout(() => DOM.modalContent.classList.remove('scale-95', 'opacity-0'), 10); }
  else { DOM.modalContent.classList.add('scale-95', 'opacity-0'); setTimeout(() => DOM.modal.classList.add('hidden'), 200); }
}