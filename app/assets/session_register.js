(function() {
  // Expose registration function so it can be explicitly triggered
  // from the Reflex on_load flow (via a conditional inline script).
  window.registerReflexSession = async function registerReflexSession() {
    if (window.__reflex_session_registered) {
      return;
    }

    try {
      let token = null;
      try {
        if (typeof getToken === "function") {
          token = getToken();
        }
      } catch (e) {
        token = null;
      }

      if (!token) {
        token = sessionStorage.getItem("token") ||
                sessionStorage.getItem("session.token") ||
                localStorage.getItem("token") ||
                null;
      }

      if (!token) {
        // Token might not be available yet; retry shortly
        setTimeout(() => {
          window.registerReflexSession();
        }, 500);
        return;
      }

      const payload = { token };
      const BACKEND_URL = window.__BACKEND_URL || "http://localhost:8000";

      const res = await fetch(`${BACKEND_URL}/sessions/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch((err) => {
        console.error("❌ Session register network error:", err);
        return null;
      });

      if (!res) return;

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("❌ Failed to register session:", text);
        // Retry on server error after a delay
        setTimeout(() => {
          window.registerReflexSession();
        }, 1000);
        return;
      }

      console.log("✅ Session registered successfully!");
      window.__reflex_session_registered = true;

      // Keep the session alive with periodic pings
      if (!window.__reflex_session_ping_interval) {
        window.__reflex_session_ping_interval = setInterval(() => {
          fetch(`${BACKEND_URL}/sessions/ping`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).catch((err) => {
            console.warn("⚠️ Session ping failed:", err);
          });
        }, 60000);
      }

      // Unregister on unload — prefer sendBeacon with JSON blob so FastAPI can parse it.
      // Fallback to keepalive fetch and, as a last resort, synchronous XHR.
      window.addEventListener("beforeunload", function() {
        const data = JSON.stringify(payload);
        try {
          const url = `${BACKEND_URL}/sessions/unregister`;
          if (navigator.sendBeacon) {
            // sendBeacon doesn't allow custom headers, but accepts a Blob with a MIME type.
            const blob = new Blob([data], { type: "application/json" });
            navigator.sendBeacon(url, blob);
          } else if (typeof fetch === "function") {
            try {
              fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: data,
                keepalive: true,
              });
            } catch (err) {
              // Last resort: synchronous XHR (may be blocked in some browsers)
              try {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", url, false);
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(data);
              } catch (e) {
                // ignore
              }
            }
          }
        } catch (e) {
          // ignore
        }
      });

    } catch (err) {
      console.error("💥 Session registration error:", err);
      // Retry on unexpected error
      setTimeout(() => {
        window.registerReflexSession();
      }, 1000);
    }
  };

  // Auto-attempt registration after DOM ready (small delay to allow Reflex)
  function autoTry() {
    if (!window.__reflex_session_registered) {
      window.registerReflexSession();
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(autoTry, 300);
  } else {
    document.addEventListener('DOMContentLoaded', () => setTimeout(autoTry, 300));
  }
  // Helper to send unregister once (idempotent)
  function sendUnregisterOnce() {
    if (window.__reflex_session_unregistered) return;
    window.__reflex_session_unregistered = true;
    try {
      const data = JSON.stringify(window.__reflex_last_payload || {});
      const url = `${window.__BACKEND_URL || "http://localhost:8000"}/sessions/unregister`;
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else if (typeof fetch === "function") {
        try {
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: data,
            keepalive: true,
          });
        } catch (err) {
          try {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", url, false);
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(data);
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // BroadcastChannel coordination — try to avoid unregistering if other tabs are still open.
  let reflexChannel = null;
  try {
    if (typeof BroadcastChannel === "function") {
      reflexChannel = new BroadcastChannel("reflex_session_channel");
    }
  } catch (e) {
    reflexChannel = null;
  }

  if (reflexChannel) {
    reflexChannel.addEventListener("message", (ev) => {
      try {
        const msg = ev.data || {};
        if (!msg || msg.token !== (window.__reflex_last_payload && window.__reflex_last_payload.token)) return;
        if (msg.type === "are_you_alive") {
          // respond immediately to indicate this tab is alive
          reflexChannel.postMessage({ type: "i_am_alive", token: msg.token });
        }
      } catch (e) {
        // ignore
      }
    });
  }

  // Attempt coordinated unregister: ask other tabs if they're alive; if none reply, send unregister.
  function coordinatedUnregisterAttempt() {
    if (!window.__reflex_last_payload || !window.__reflex_last_payload.token) {
      sendUnregisterOnce();
      return;
    }
    const token = window.__reflex_last_payload.token;
    if (!reflexChannel) {
      sendUnregisterOnce();
      return;
    }
    let replied = false;
    function onMsg(ev) {
      try {
        const msg = ev.data || {};
        if (msg && msg.type === "i_am_alive" && msg.token === token) {
          replied = true;
        }
      } catch (e) {}
    }
    reflexChannel.addEventListener("message", onMsg);
    // Ask others if they're alive
    reflexChannel.postMessage({ type: "are_you_alive", token });
    // Wait briefly for responses; if none, assume we're last and unregister
    setTimeout(() => {
      reflexChannel.removeEventListener("message", onMsg);
      if (!replied) {
        sendUnregisterOnce();
      }
    }, 150);
  }

  // Try to unregister on multiple lifecycle events: pagehide, visibilitychange, beforeunload, unload.
  // Using several hooks increases the chance of success when the whole browser is closing.
  window.addEventListener("pagehide", () => {
    coordinatedUnregisterAttempt();
  }, { capture: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      coordinatedUnregisterAttempt();
    }
  }, { capture: true });

  window.addEventListener("beforeunload", (ev) => {
    coordinatedUnregisterAttempt();
  }, { capture: true });

  // As a last resort, ensure unload also triggers a best-effort send.
  window.addEventListener("unload", () => {
    sendUnregisterOnce();
  }, { capture: true });

})();
