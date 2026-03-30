let ua = null;
let currentSession = null;
let alreadyRegistered = false;
let finalUri = null;
let callTimerInterval = null;

function startCallTimer() {
  stopCallTimer();
  let seconds = 0;
  DOM.callDuration.textContent = '00:00';
  callTimerInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    DOM.callDuration.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopCallTimer() {
  if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
}

function handleLogin(e) {
  if (e) e.preventDefault(); 
  saveConfigToStorage();
  if (ua) { try { ua.stop(); } catch(err){} ua = null; }

  const { ws, user, pass, uri } = appConfig;
  const domain = extractDomain(ws);
  finalUri = uri ? formatURI(uri, domain) : formatURI(user, domain);

  log(`Đang khởi tạo kết nối tới: ${finalUri}...`, 'info');
  const btnSubmit = document.getElementById('btn_register'); 
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<i class='bx bx-loader-alt bx-spin text-xl'></i> Đang kết nối...`;

  try {
    ua = new JsSIP.UA({ 
      uri: finalUri, 
      password: pass, 
      sockets: [new JsSIP.WebSocketInterface(ws)], 
      display_name: 'Modern WebPhone', 
      session_timers: false,
      pcConfig: {
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302'] },
          { urls: ['stun:stun1.l.google.com:19302'] },
          { urls: ['stun:stun2.l.google.com:19302'] },
          { urls: ['turn:14.224.195.246:3478'], username: 'admin', credential: 'B@sebs1234' }
        ]
      }
    });

    ua.on('registered', () => {
      alreadyRegistered = true; 
      log('Đăng nhập hệ thống thành công!', 'success');
      switchView('phone'); 
      setStatus('Online', 'registered');
      sendWebhook('registered', { from: finalUri });
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Đăng nhập hệ thống</span><i class='bx bx-log-in-circle text-xl'></i>`;
    });

    ua.on('registrationFailed', (e) => {
      alreadyRegistered = false; 
      log(`Đăng nhập thất bại: ${e.cause}`, 'error');
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Thử lại</span><i class='bx bx-refresh text-xl'></i>`;
    });

    ua.on('unregistered', () => { alreadyRegistered = false; setStatus('Offline', 'offline'); });

    ua.on('newRTCSession', (data) => {
      if (currentSession && currentSession.isInProgress()) { data.session.terminate(); return; }
      currentSession = data.session;
      if (data.originator === 'remote') handleIncomingCall(data.session);
    });
    ua.start();
  } catch (err) { log(`Lỗi cấu hình JsSIP: ${err.message}`, 'error'); btnSubmit.disabled = false; }
}

function handleLogout() {
  log('🔌 Đang tiến hành đăng xuất...', 'info');
  stopStatsMonitoring();
  sendWebhook('logout', { from: finalUri, to: 'system' });
  if (ua) { ua.unregister(); setTimeout(() => { try{ ua.stop(); } catch(e){} ua = null; }, 500); }
  switchView('login'); setUIState('idle'); setStatus('Offline', 'offline');
}

function makeCall() {
  if (!ua || !alreadyRegistered) return log('Hệ thống chưa đăng nhập!', 'error');
  const number = DOM.inputCallTo.value.trim();
  if (!number) return log('Vui lòng nhập số điện thoại', 'warning');
  const domain = extractDomain(appConfig.ws);
  const target = formatURI(number, domain);

  try {
    const constraints = { audio: appConfig.audioInputId ? { deviceId: { ideal: appConfig.audioInputId } } : true, video: false };
    currentSession = ua.call(target, { mediaConstraints: constraints, rtcOfferConstraints: { offerToReceiveAudio: 1, offerToReceiveVideo: 0 } });
    currentSession.callTarget = target;
    bindSessionEvents(currentSession, 'outgoing');
    log(`Đang tiến hành gọi: ${number}...`, 'info');
    setStatus('Đang gọi...', 'calling'); setUIState('calling');
  } catch (err) { log(`Lỗi thực hiện cuộc gọi: ${err.message}`, 'error'); }
}

function handleIncomingCall(session) {
  bindSessionEvents(session, 'incoming');
  const caller = session.remote_identity.uri.user;
  log(`🔔 Cuộc gọi đến từ: ${caller}`, 'warning');
  setStatus(`Cuộc gọi đến: ${caller}`, 'ringing'); setUIState('incoming');
  playTone('ringtone');
  sendWebhook('incoming', { from: session.remote_identity.uri.toString(), to: finalUri, direction: 'incoming' });
}

function answerCall() {
  if (currentSession) {
    stopTones();
    try { 
      const constraints = { audio: appConfig.audioInputId ? { deviceId: { ideal: appConfig.audioInputId } } : true, video: false };
      currentSession.answer({ mediaConstraints: constraints, rtcOfferConstraints: { offerToReceiveAudio: 1, offerToReceiveVideo: 0 } }); 
    } catch(e) { log(`Lỗi khi nghe máy: ${e.message}`, 'error'); }
  }
}

function hangupCall() { stopTones(); if (currentSession) currentSession.terminate(); }

function toggleMute(mute) { 
  if (!currentSession) return; 
  if (mute) { currentSession.mute(); toggleMuteUI(true); log('Đã tắt Mic', 'info'); } 
  else { currentSession.unmute(); toggleMuteUI(false); log('Đã bật Mic', 'info'); } 
}

function toggleHold(hold) { 
  if (!currentSession) return; 
  if (hold) { currentSession.hold(); toggleHoldUI(true); log('Đã giữ máy (Hold)', 'warning'); } 
  else { currentSession.unhold(); toggleHoldUI(false); log('Tiếp tục đàm thoại', 'info'); } 
}

function transferCall() {
  if (!currentSession) return; 
  const targetNumber = DOM.transferTo.value.trim();
  if (!targetNumber) return log('Vui lòng nhập số cần chuyển đến', 'warning');
  try { 
    currentSession.refer(formatURI(targetNumber, extractDomain(appConfig.ws))); 
    log(`Đang chuyển cuộc gọi tới: ${targetNumber}`, 'info'); DOM.transferTo.value = ''; 
  } catch (err) { log(`Lỗi chuyển máy: ${err.message}`, 'error'); }
}

function bindSessionEvents(session, direction) {
  let callFrom = direction === 'incoming' ? session.remote_identity?.uri?.toString() : finalUri;
  let callTo = direction === 'incoming' ? finalUri : (session.callTarget || session.remote_identity?.uri?.toString());

  DOM.callInfoCard.classList.remove('hidden');
  document.getElementById('info_from').textContent = (direction === 'incoming') ? session.remote_identity?.uri?.user : appConfig.user;
  document.getElementById('info_to').textContent = (direction === 'incoming') ? appConfig.user : DOM.inputCallTo.value;
  document.getElementById('info_state').textContent = 'Connecting...';
  document.getElementById('info_dir').textContent = direction === 'incoming' ? 'Gọi đến ⬇' : 'Gọi đi ⬆';

  session.on('progress', () => { if (direction === 'outgoing') { log('Đầu dây bên kia đang đổ chuông...', 'info'); playTone('ringback'); } });
  
  // Đảm bảo handleRTCSession được gọi ngay cả khi PC đã tồn tại
  if (session.connection) handleRTCSession(session);
  session.on('peerconnection', () => { log('Khởi tạo kết nối WebRTC', 'info'); handleRTCSession(session); });

  session.on('accepted', () => {
    stopTones(); log('Cuộc gọi được chấp nhận, đang đàm thoại.', 'success');
    document.getElementById('info_state').textContent = 'In Call';
    setStatus('Đang đàm thoại', 'incall'); setUIState('incall');
    startCallTimer();
    sendWebhook('accepted', { from: callFrom, to: callTo, direction });
  });

  const cleanupCall = (cause) => {
    stopTones(); stopCallTimer();
    
    addCallToHistory({
      number: direction === 'incoming' ? (session.remote_identity?.uri?.user || 'Unknown') : DOM.inputCallTo.value,
      direction: direction,
      status: cause,
      duration: DOM.callDuration.textContent
    });

    log(`Cuộc gọi kết thúc (${cause})`, 'info');
    setStatus('Online', 'registered'); setUIState('idle');
    if (DOM.remoteAudio.srcObject) { DOM.remoteAudio.pause(); DOM.remoteAudio.srcObject = null; }
    stopStatsMonitoring(); currentSession = null;
  };
  session.on('ended', (e) => { cleanupCall(e.cause); sendWebhook('ended', { from: callFrom, to: callTo, direction }); });
  session.on('failed', (e) => { cleanupCall(e.cause); sendWebhook('failed', { from: callFrom, to: callTo, direction }); });
}

function handleRTCSession(session) {
  if (!session || !session.connection) return;
  const pc = session.connection;

  pc.addEventListener('iceconnectionstatechange', () => {
    log(`ICE State: ${pc.iceConnectionState}`, 'info');
    if (pc.iceConnectionState === 'failed') log('LỖI: Không thể thiết lập đường truyền media qua NAT/Firewall. Cần TURN server.', 'error');
  });

  pc.addEventListener('connectionstatechange', () => log(`Connection State: ${pc.connectionState}`, 'info'));
  pc.addEventListener('icecandidate', (event) => { if (event.candidate) console.log('New ICE Candidate:', event.candidate.candidate); });

  // Hàm xử lý track tập trung
  const processTrack = (track, streams) => {
    if (track.kind !== 'audio') return;
    log(`Phát hiện luồng âm thanh (${track.label})`, 'info');
    
    const remoteStream = (streams && streams[0]) ? streams[0] : new MediaStream([track]);
    
    if (DOM.remoteAudio.srcObject !== remoteStream) {
      DOM.remoteAudio.srcObject = remoteStream;
      applyOutputDevice(); 
      DOM.remoteAudio.muted = false;
      DOM.remoteAudio.volume = 1.0;
    }

    track.enabled = true;
    startStatsMonitoring(pc);

    // Khắc phục chính sách Autoplay
    DOM.remoteAudio.play()
      .then(() => log('Âm thanh đã được kết nối thành công', 'success'))
      .catch(err => {
        log('Trình duyệt tạm chặn âm thanh. Hãy nhấn vào trang web để nghe.', 'warning');
        window.addEventListener('mousedown', () => DOM.remoteAudio.play(), { once: true });
      });
  };

  // Lắng nghe track mới và kiểm tra cả các track đã nhận được trước đó
  pc.addEventListener('track', (event) => processTrack(event.track, event.streams));
  pc.getReceivers().forEach(receiver => { if (receiver.track) processTrack(receiver.track, []); });
}