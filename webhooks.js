// /var/www/html/js/webhooks.js
// ==========================
// Config
// ==========================
const WEBHOOK_URL = "https://pbx.ryd/hooks.php";       // tu endpoint PHP/Apache
const WEBHOOK_SECRET = "CLAVEWEBHOOK123";          // mismo secreto que valida hooks.php
const WEBHOOK_TIMEOUT_MS = 6000;

// ==========================
// Utilidad para enviar
// ==========================
async function sendWebhook(event, payload, attempt = 1) {
  const body = JSON.stringify({ event, ts: new Date().toISOString(), payload });
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), WEBHOOK_TIMEOUT_MS);
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": WEBHOOK_SECRET
      },
      body,
      signal: ctrl.signal,
      keepalive: true
    });
    clearTimeout(timer);
    if (!res.ok && attempt < 3) return sendWebhook(event, payload, attempt + 1);
  } catch (e) {
    if (attempt < 3) return sendWebhook(event, payload, attempt + 1);
    console.warn("Webhook error:", e);
  }
}

// ==========================
// Helpers
// ==========================
function sessionSnapshot(session) {
  try {
    const incoming = !!session.incomingInviteRequest;
    const msg = incoming ? session.incomingInviteRequest.message : session.outgoingInviteRequest?.message;
    const callId =
      msg?.callId ||
      session?.dialog?.id?.callId ||
      session?.id ||
      (session.data.webhookCallId ||= (crypto?.randomUUID?.() || String(Date.now())));

    const pick = (id) => id ? {
      displayName: id.displayName || null,
      uriUser: id.uri?.user || null,
      uriHost: id.uri?.host || null
    } : null;

    const fromId = incoming ? session.remoteIdentity : session.localIdentity;
    const toId   = incoming ? session.localIdentity  : session.remoteIdentity;

    return {
      callId,
      direction: incoming ? "inbound" : "outbound",
      state: session.state || null,
      remoteTarget: session?.remoteTarget?.toString?.() || null,
      from: pick(fromId),
      to: pick(toId),
      muted: !!session.data?.muted,
      held: !!session.data?.held,
      line: session.data?.LineNumber || null
    };
  } catch (e) {
    return { error: String(e) };
  }
}

function minimalProfile(opts) {
  if (!opts) return null;
  return {
    extension: opts?.User || opts?.AuthUser || null,
    domain: opts?.Domain || null,
    displayName: opts?.DisplayName || null,
    transport: opts?.Transport || null
  };
}

// ==========================
// Hooks que phone.js llamará
// (expuestos en window)
// ==========================
window.web_hook_on_before_init = (phoneOptions) =>
  sendWebhook("client.before_init", { profile: minimalProfile(phoneOptions) });

window.web_hook_on_userAgent_created = (ua) =>
  sendWebhook("ua.created", { transportState: ua?.transport?.state || null });

window.web_hook_on_register = (ua) =>
  sendWebhook("ua.registered", { aor: ua?.configuration?.uri?.toString?.() || null });

window.web_hook_on_unregistered = () => sendWebhook("ua.unregistered", {});

window.web_hook_on_registrationFailed = (e) =>
  sendWebhook("ua.registration_failed", { code: e?.code || null, reason: e?.reason || null });

window.web_hook_on_transportError = (e) =>
  sendWebhook("ua.transport_error", { message: e?.message || null });

window.web_hook_on_invite = (session) =>
  sendWebhook("call.ringing", sessionSnapshot(session));

window.web_hook_on_terminate = (session) =>
  sendWebhook("call.terminated", sessionSnapshot(session));

window.web_hook_on_message = (data) =>
  sendWebhook("im.message", data || {});

window.web_hook_on_dtmf = (info) =>
  sendWebhook("call.dtmf", { tone: info?.tone || info?.value || null, line: info?.line || null });

window.web_hook_on_notify = (data) => sendWebhook("sip.notify", data || {});
window.web_hook_on_messages_waiting = (mwi) => sendWebhook("mwi.update", mwi || {});
window.web_hook_on_missed_notify = (missed) => sendWebhook("call.missed", missed || {});

// Señales desde la UI (si usás botones de hold/mute en tu app)
window._webhook_mark_hold = (session, held) => {
  const snap = sessionSnapshot(session); snap.held = !!held;
  sendWebhook(held ? "call.hold" : "call.resume", snap);
};
window._webhook_mark_mute = (session, muted) => {
  const snap = sessionSnapshot(session); snap.muted = !!muted;
  sendWebhook(muted ? "call.mute" : "call.unmute", snap);
};

