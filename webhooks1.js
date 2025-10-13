// phone-webhooks-demo/webhooks.js
// Incluir ESTE archivo DESPUÉS de phone.js en tu index.html
// <script src="phone.js"></script>
// <script src="webhooks.js"></script>

window.phoneOptions = window.phoneOptions || {};

// Cambia esto a tu endpoint público (ngrok/devtunnels/tu API publicada)
window.phoneOptions.webhookUrl = window.phoneOptions.webhookUrl || "https://localhost:5001/webhooks/phone";

// No pongas secretos reales en el front en producción. Para pruebas es suficiente.
// Si necesitas HMAC de verdad, genera la firma en el backend (token de corta vida).
window.phoneOptions.webhookSecret = window.phoneOptions.webhookSecret || "MI_SECRETO_SUPER_SEGURO";

// Pequeño buffer de reintentos
async function sendWithRetry(url, options, retries = 2, delayMs = 600) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
}

async function sendWebhook(event, payload) {
  const url = window.phoneOptions.webhookUrl;
  const secret = window.phoneOptions.webhookSecret;

  const body = JSON.stringify({
    event,
    at: new Date().toISOString(),
    payload
  });

  try {
    await sendWithRetry(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Secret": secret
      },
      body
    });
  } catch (err) {
    console.error("Webhook error:", err);
  }
}

/** Implementaciones de web_hook_* **/
var web_hook_on_register = function(ua){
  sendWebhook("on_register", {
    aor: ua && ua.configuration && ua.configuration.uri ? String(ua.configuration.uri) : null
  });
};

var web_hook_on_registrationFailed = function(e){
  sendWebhook("on_registrationFailed", {
    status: e && e.statusCode,
    cause: e && (e.cause || e.reason || e.message)
  });
};

var web_hook_on_unregistered = function(){
  sendWebhook("on_unregistered", {});
};

var web_hook_on_invite = function(session){
  sendWebhook("on_invite", {
    direction: session && session.direction, // "incoming" | "outgoing"
    remoteIdentity: session && session.remoteIdentity && session.remoteIdentity.uri ? String(session.remoteIdentity.uri) : null,
    id: session && session.id
  });
};

var web_hook_on_modify = function(action, session){
  sendWebhook("on_modify", { action, id: session && session.id });
};

var web_hook_on_terminate = function(session){
  sendWebhook("on_terminate", {
    id: session && session.id,
    reason: session && session.terminateReason,
    duration: session && session.sessionTimers && session.sessionTimers.getSessionDuration ? session.sessionTimers.getSessionDuration() : undefined
  });
};

var web_hook_on_message = function(message){
  sendWebhook("on_message", {
    from: message && message.remoteIdentity && message.remoteIdentity.uri ? String(message.remoteIdentity.uri) : null,
    body: message && message.body
  });
};

var web_hook_on_dtmf = function(item, session){
  sendWebhook("on_dtmf", {
    tone: item && item.tone,
    duration: item && item.duration,
    id: session && session.id
  });
};

var web_hook_on_messages_waiting = function(newMsg, oldMsg, urgentNew, urgentOld){
  sendWebhook("on_messages_waiting", { newMsg, oldMsg, urgentNew, urgentOld });
};

var web_hook_on_missed_notify = function(missed){
  sendWebhook("on_missed_notify", { missed });
};
