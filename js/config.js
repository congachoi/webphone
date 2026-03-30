let appConfig = {
  ws: '', 
  user: '', 
  pass: '', 
  uri: '', 
  saveConfig: true,
  audioInputId: '',
  audioOutputId: '',
  webhook: { 
    enabled: true, 
    url: '', 
    events: { registered: true, incoming: true, accepted: true, ended: true, failed: true, logout: true } 
  }
};

function loadConfig() {
  try {
    const saved = localStorage.getItem('webphone_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.pass) parsed.pass = atob(parsed.pass);
      appConfig = { ...appConfig, ...parsed };
    }
  } catch (e) {
    console.warn("Trình duyệt chặn localStorage.");
  }

  const wsInput = document.getElementById('settings_sip_ws');
  if (wsInput) wsInput.value = appConfig.ws;
  
  const userEl = document.getElementById('sip_user');
  if (userEl) userEl.value = appConfig.user;
  
  const passEl = document.getElementById('sip_pass');
  if (passEl) passEl.value = appConfig.pass;

  const uriEl = document.getElementById('sip_uri');
  if (uriEl) uriEl.value = appConfig.uri || '';

  const saveEl = document.getElementById('save_config');
  if (saveEl) saveEl.checked = appConfig.saveConfig;
  
  const whEnableEl = document.getElementById('webhook_enable');
  if (whEnableEl) whEnableEl.checked = appConfig.webhook.enabled;

  const whUrlEl = document.getElementById('webhook_url');
  if (whUrlEl) whUrlEl.value = appConfig.webhook.url;

  const events = ['registered', 'incoming', 'accepted', 'ended', 'failed', 'logout'];
  events.forEach(evt => {
    const el = document.getElementById(`event_${evt}`);
    if(el) el.checked = appConfig.webhook.events[evt];
  });
}

function saveConfigToStorage() {
  try {
    const wsInput = document.getElementById('settings_sip_ws');
    if (wsInput) appConfig.ws = wsInput.value;
    
    const userEl = document.getElementById('sip_user');
    if (userEl) appConfig.user = userEl.value;

    const passEl = document.getElementById('sip_pass');
    if (passEl) appConfig.pass = passEl.value;

    const uriEl = document.getElementById('sip_uri');
    if (uriEl) appConfig.uri = uriEl.value;

    const saveEl = document.getElementById('save_config');
    if (saveEl) appConfig.saveConfig = saveEl.checked;

    if (appConfig.saveConfig) {
      const dataToSave = JSON.parse(JSON.stringify(appConfig));
      if (dataToSave.pass) dataToSave.pass = btoa(dataToSave.pass);
      localStorage.setItem('webphone_config', JSON.stringify(dataToSave));
    } else {
      localStorage.removeItem('webphone_config');
    }
  } catch (e) {
    console.warn("Lỗi lưu cấu hình.");
  }
}