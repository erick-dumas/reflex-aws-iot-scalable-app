(function() {
  if (window.__reflex_session_registered) return;

  // Helper: try multiple ways to get the token (getToken(), storages, cookies)
  function readTokenFromStorages() {
    try {
      if (typeof getToken === "function") {
        const t = getToken();
        if (t) return t;
      }
    } catch (e) {}

    const fromSession = sessionStorage.getItem("token") || sessionStorage.getItem("session.token");
    if (fromSession) return fromSession;
    const fromLocal = localStorage.getItem("token") || localStorage.getItem("session.token");
    if (fromLocal) return fromLocal;

    // Try cookies (common fallback)
    try {
      const match = document.cookie.match(/(?:^|; )(?:token|session\.token)=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch (e) {}

    return null;
  }

  const BACKEND_URL = window.__BACKEND_URL;

  async function sendRegister(token) {
    if (!token) return { ok: false, reason: "no-token" };
    try {
      const res = await fetch(`${BACKEND_URL}/sessions/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        keepalive: true,
      });
      return { ok: res.ok, status: res.status, text: res.ok ? null : await res.text() };
    } catch (err) {
      return { ok: false, reason: err.message || String(err) };
    }
  }

  async function sendPing(token) {
    if (!token) return { ok: false, reason: "no-token" };
    try {
      const res = await fetch(`${BACKEND_URL}/sessions/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        keepalive: true,
      });
      return { ok: res.ok, status: res.status, text: res.ok ? null : await res.text() };
    } catch (err) {
      return { ok: false, reason: err.message || String(err) };
    }
  }

  function sendUnregisterBeacon(token) {
    try {
      const data = JSON.stringify({ token });
      // navigator.sendBeacon cannot set headers; send a Blob with application/json
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon(`${BACKEND_URL}/sessions/unregister`, blob);
      } else {
        fetch(`${BACKEND_URL}/sessions/unregister`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: data,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (e) {}
  }

  // Attempt registration with retries until success.
  let registrationAttempts = 0;
  let registrationRetryInterval = null;
  let pingInterval = null;

  async function attemptRegistrationOnce() {
    registrationAttempts += 1;
    const token = readTokenFromStorages();
    if (!token) {
      // No token available from client; nothing to do
      return false;
    }
    const res = await sendRegister(token);
    if (res.ok) {
      console.log("✅ Session registered successfully!");
      window.__reflex_session_registered = true;
      window.__reflex_session_registered_token = token;
      // Stop retrying
      if (registrationRetryInterval) {
        clearInterval(registrationRetryInterval);
        registrationRetryInterval = null;
      }
      // Start pinging (use fresh token each time)
      if (!pingInterval) {
        // Ping faster than TTL (default ttl 5m), use 30s ping
        pingInterval = setInterval(async () => {
          const currentToken = readTokenFromStorages() || window.__reflex_session_registered_token;
          const pingRes = await sendPing(currentToken);
          if (!pingRes.ok) {
            console.warn("⚠️ Session ping failed or token missing on server:", pingRes);
            // Force re-registration flow on error
            window.__reflex_session_registered = false;
            window.__reflex_session_registered_token = null;
            if (!registrationRetryInterval) {
              registrationRetryInterval = setInterval(() => {
                if (!window.__reflex_session_registered) attemptRegistrationOnce();
              }, 5000);
            }
            if (pingInterval) {
              clearInterval(pingInterval);
              pingInterval = null;
            }
          }
        }, 30000);
      }
      return true;
    } else {
      // Not registered; server may be unreachable or token invalid
      console.warn("❌ Failed to register session:", res);
      return false;
    }
  }

  // Initial attempt and retry setup
  (async function initRegistration() {
    try {
      // Try immediately
      const ok = await attemptRegistrationOnce();
      if (!ok && !registrationRetryInterval) {
        // Retry every 5s until registered (useful if getToken becomes available later)
        registrationRetryInterval = setInterval(() => {
          if (!window.__reflex_session_registered) attemptRegistrationOnce();
        }, 5000);
      }

      // Re-attempt registration on visibility change or focus (helps when tab was suspended)
      window.addEventListener("visibilitychange", function() {
        if (document.visibilityState === "visible" && !window.__reflex_session_registered) {
          attemptRegistrationOnce();
        }
      });
      window.addEventListener("focus", function() {
        if (!window.__reflex_session_registered) attemptRegistrationOnce();
      });

      // Use pagehide (fired on navigation and tab close), and beforeunload as fallback.
      function handleUnload() {
        const token = readTokenFromStorages() || window.__reflex_session_registered_token || null;
        if (token) sendUnregisterBeacon(token);
      }
      window.addEventListener("pagehide", handleUnload, { capture: false });
      window.addEventListener("beforeunload", handleUnload, { capture: false });
    } catch (err) {
      console.error("💥 Session registration error:", err);
    }
  })();

})();