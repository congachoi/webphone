const DOM = {
  loginView: document.getElementById('login-view'), 
  phoneView: document.getElementById('phone-view'),
  modal: document.getElementById('webhook-modal'), 
  modalContent: document.getElementById('webhook-modal-content'),
  formLogin: document.getElementById('login-form'), 
  inputCallTo: document.getElementById('call_to'), 
  transferTo: document.getElementById('transfer_to'),
  remoteAudio: document.getElementById('remote-audio'),
  localAudio: document.getElementById('local-audio'),
  ringtone: document.getElementById('ringtone'),
  ringback: document.getElementById('ringback'),
  logDiv: document.getElementById('log'),
  displayUser: document.getElementById('display_user'), 
  statusDot: document.getElementById('status_dot'), 
  statusText: document.getElementById('status_text'),
  audioDot: document.getElementById('audio_dot'), 
  audioText: document.getElementById('audio_text'), 
  callInfoCard: document.getElementById('call-info'),
  callDuration: document.getElementById('call_duration'),
  callControls: document.getElementById('call_controls'), 
  incomingControls: document.getElementById('incoming_controls'), 
  incallControls: document.getElementById('incall_controls'),
  btnCall: document.getElementById('btn_call'), 
  btnHangup: document.getElementById('btn_hangup'), 
  btnAnswer: document.getElementById('btn_answer'),
  btnReject: document.getElementById('btn_reject'), 
  btnMute: document.getElementById('btn_mute'), 
  btnUnmute: document.getElementById('btn_unmute'),
  btnHold: document.getElementById('btn_hold'), 
  btnUnhold: document.getElementById('btn_unhold'), 
  btnTransfer: document.getElementById('btn_transfer'),
  callHistoryList: document.getElementById('call_history_list'),
  btnClearHistory: document.getElementById('btn_clear_history')
};

function switchView(view) {
  if (view === 'phone') {
    DOM.loginView.classList.add('hidden'); 
    DOM.phoneView.classList.remove('hidden');
    DOM.displayUser.textContent = appConfig.user || 'Unknown User';
    setTimeout(() => DOM.inputCallTo.focus(), 300);
  } else {
    DOM.phoneView.classList.add('hidden'); 
    DOM.loginView.classList.remove('hidden');
  }
}

function setUIState(state) {
  DOM.btnCall.classList.toggle('hidden', state !== 'idle'); 
  DOM.btnHangup.classList.toggle('hidden', state === 'idle');
  DOM.callControls.classList.toggle('hidden', state === 'idle');
  
  DOM.incomingControls.classList.toggle('hidden', state !== 'incoming');
  DOM.incallControls.classList.toggle('hidden', !['incall', 'calling'].includes(state));
  
  if (state === 'incoming') DOM.incomingControls.classList.add('flex');
  
  if (state === 'idle') {
    DOM.callInfoCard.classList.add('hidden'); 
    DOM.inputCallTo.value = '';
    toggleMuteUI(false); 
    toggleHoldUI(false);
  }
}

function setStatus(text, type) {
  DOM.statusText.textContent = text; 
  DOM.statusDot.className = 'w-2.5 h-2.5 rounded-full';
  const colors = { 
    registered: 'bg-green-500', 
    offline: 'bg-gray-400', 
    ringing: 'bg-yellow-500 animate-pulse', 
    incall: 'bg-blue-500 pulse-ring', 
    calling: 'bg-blue-300 animate-pulse', 
    error: 'bg-red-500' 
  };
  DOM.statusDot.classList.add(...(colors[type] || colors.offline).split(' '));
}

function toggleMuteUI(isMuted) { 
  DOM.btnMute.classList.toggle('hidden', isMuted); 
  DOM.btnUnmute.classList.toggle('hidden', !isMuted); 
}

function toggleHoldUI(isHeld) { 
  DOM.btnHold.classList.toggle('hidden', isHeld); 
  DOM.btnUnhold.classList.toggle('hidden', !isHeld); 
}